import shadowCss from "./content.css?inline";
import type { SaveHighlightPayload, TabMessage } from "../lib/messages";
import { readMarginaliaTarget, stripMarginaliaTarget } from "../lib/urls";

// ── Types ─────────────────────────────────────────────────────────
interface SavedHighlight {
  _id: string;
  text: string;
  textContext?: string;
  anchorPrefix?: string;
  anchorSuffix?: string;
  anchorStart?: number;
  anchorEnd?: number;
  color: "amber" | "rose" | "sage" | "sky" | "violet";
  note?: string;
  tags?: string[];
}

// ── Constants ──────────────────────────────────────────────────────
const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = (typeof COLORS)[number];

const HIGHLIGHT_FILLS: Record<HighlightColor, string> = {
  amber: "#fde68a",
  rose: "#fecdd3",
  sage: "#bbf7d0",
  sky: "#bae6fd",
  violet: "#ddd6fe",
};

// ── Shadow DOM container ───────────────────────────────────────────
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let toolbarEl: HTMLElement | null = null;
let popoverEl: HTMLElement | null = null;
let positionStyleEl: HTMLStyleElement | null = null;
let activePopoverMark: HTMLElement | null = null;
let activePopoverFrame: number | null = null;
let activeToolbarFrame: number | null = null;

interface FloatingPosition {
  left: number;
  top: number;
}

let toolbarPosition: FloatingPosition | null = null;
let popoverPosition: FloatingPosition | null = null;
let repaintPromise: Promise<void> | null = null;
let toolbarRange: Range | null = null;
let savedHighlights: SavedHighlight[] = [];
let repaintRetryTimer: number | null = null;

const MARK_CSS = `
mark.marginalia-mark {
  cursor: pointer;
  border-radius: 1px;
  padding: 1px 0;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  background-color: transparent !important;
  background-repeat: repeat !important;
  color: #111827 !important;
}
mark.marginalia-mark[data-color="amber"] {
  background-image: linear-gradient(180deg, transparent 0%, transparent 12%, #fde68a 12%, #fde68a 92%, transparent 92%) !important;
}
mark.marginalia-mark[data-color="rose"] {
  background-image: linear-gradient(180deg, transparent 0%, transparent 12%, #fecdd3 12%, #fecdd3 92%, transparent 92%) !important;
}
mark.marginalia-mark[data-color="sage"] {
  background-image: linear-gradient(180deg, transparent 0%, transparent 12%, #bbf7d0 12%, #bbf7d0 92%, transparent 92%) !important;
}
mark.marginalia-mark[data-color="sky"] {
  background-image: linear-gradient(180deg, transparent 0%, transparent 12%, #bae6fd 12%, #bae6fd 92%, transparent 92%) !important;
}
mark.marginalia-mark[data-color="violet"] {
  background-image: linear-gradient(180deg, transparent 0%, transparent 12%, #ddd6fe 12%, #ddd6fe 92%, transparent 92%) !important;
}
@keyframes marginalia-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
  50% { box-shadow: 0 0 0 4px oklch(70% 0.15 50 / 0.5); }
}
mark.marginalia-mark.marginalia-focused {
  animation: marginalia-pulse 0.9s ease-in-out 2;
  border-radius: 2px;
}
mark.marginalia-mark * {
  color: #111827 !important;
}
`;

function ensureHostStyles() {
  if (!document.getElementById("marginalia-host-style")) {
    const hostStyle = document.createElement("style");
    hostStyle.id = "marginalia-host-style";
    hostStyle.textContent = `
      .marginalia-host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        top: 0;
        left: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(hostStyle);
  }
  if (!document.getElementById("marginalia-mark-style")) {
    const markStyle = document.createElement("style");
    markStyle.id = "marginalia-mark-style";
    markStyle.textContent = MARK_CSS;
    document.head.appendChild(markStyle);
  }
}

function getShadow(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  ensureHostStyles();
  shadowHost = document.createElement("div");
  shadowHost.id = "marginalia-host";
  shadowHost.className = "marginalia-host";
  document.documentElement.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = shadowCss;
  shadowRoot.appendChild(style);

  positionStyleEl = document.createElement("style");
  positionStyleEl.id = "marginalia-position-style";
  shadowRoot.appendChild(positionStyleEl);

  return shadowRoot;
}

function syncFloatingPositions() {
  if (!positionStyleEl) return;

  const rules: string[] = [];
  if (toolbarPosition) {
    rules.push(
      `#marginalia-toolbar{left:${toolbarPosition.left}px;top:${toolbarPosition.top}px;}`,
    );
  }
  if (popoverPosition) {
    rules.push(
      `#marginalia-popover{left:${popoverPosition.left}px;top:${popoverPosition.top}px;}`,
    );
  }

  positionStyleEl.textContent = rules.join("\n");
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest("#marginalia-host, script, style, noscript, textarea, input, select")) {
    return true;
  }
  return false;
}

function collectTextNodes() {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipTextNode(node as Text)) return NodeFilter.FILTER_REJECT;
      return node.textContent ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) nodes.push(node);
  return nodes;
}

function documentTextSnapshot(nodes = collectTextNodes()) {
  let text = "";
  const starts = new Map<Text, number>();
  for (const node of nodes) {
    starts.set(node, text.length);
    text += node.textContent ?? "";
  }
  return { text, nodes, starts };
}

function rangeOffsets(range: Range) {
  const snapshot = documentTextSnapshot();
  const start = snapshot.starts.get(range.startContainer as Text);
  const end = snapshot.starts.get(range.endContainer as Text);
  if (start == null || end == null) return null;
  return {
    start: start + range.startOffset,
    end: end + range.endOffset,
    documentText: snapshot.text,
  };
}

function rangeFromOffsets(start: number, end: number) {
  const nodes = collectTextNodes();
  let cursor = 0;
  const range = document.createRange();
  let started = false;

  for (const node of nodes) {
    const length = node.textContent?.length ?? 0;
    const nodeStart = cursor;
    const nodeEnd = cursor + length;

    if (!started && start >= nodeStart && start <= nodeEnd) {
      if (node.parentElement?.closest(".marg-h")) return null;
      range.setStart(node, Math.max(0, start - nodeStart));
      started = true;
    }
    if (started && end >= nodeStart && end <= nodeEnd) {
      if (node.parentElement?.closest(".marg-h")) return null;
      range.setEnd(node, Math.max(0, end - nodeStart));
      return range;
    }
    cursor = nodeEnd;
  }

  return null;
}

function commonAffixScore(a: string, b: string, fromEnd: boolean) {
  const max = Math.min(a.length, b.length);
  let score = 0;
  while (score < max) {
    const ai = fromEnd ? a.length - 1 - score : score;
    const bi = fromEnd ? b.length - 1 - score : score;
    if (a[ai] !== b[bi]) break;
    score += 1;
  }
  return score;
}

function findAnchoredRange(h: SavedHighlight) {
  const snapshot = documentTextSnapshot();
  if (
    typeof h.anchorStart === "number" &&
    typeof h.anchorEnd === "number" &&
    snapshot.text.slice(h.anchorStart, h.anchorEnd) === h.text
  ) {
    return rangeFromOffsets(h.anchorStart, h.anchorEnd);
  }

  const candidates: { start: number; end: number; score: number }[] = [];
  let from = 0;
  while (from <= snapshot.text.length) {
    const start = snapshot.text.indexOf(h.text, from);
    if (start === -1) break;
    const end = start + h.text.length;
    const before = snapshot.text.slice(Math.max(0, start - 120), start);
    const after = snapshot.text.slice(end, end + 120);
    const textContextIndex = h.textContext?.indexOf(h.text) ?? -1;
    const legacyPrefix = textContextIndex >= 0 ? h.textContext?.slice(0, textContextIndex) : undefined;
    const legacySuffix = textContextIndex >= 0 ? h.textContext?.slice(textContextIndex + h.text.length) : undefined;
    const prefixScore = h.anchorPrefix
      ? commonAffixScore(before, h.anchorPrefix, true)
      : legacyPrefix
        ? commonAffixScore(before, legacyPrefix, true)
        : 0;
    const suffixScore = h.anchorSuffix
      ? commonAffixScore(after, h.anchorSuffix, false)
      : legacySuffix
        ? commonAffixScore(after, legacySuffix, false)
        : 0;
    const positionScore = typeof h.anchorStart === "number" ? Math.max(0, 80 - Math.abs(start - h.anchorStart) / 8) : 0;
    candidates.push({ start, end, score: prefixScore + suffixScore + positionScore });
    from = start + Math.max(1, h.text.length);
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    const range = rangeFromOffsets(candidate.start, candidate.end);
    if (range) return range;
  }
  return null;
}

function positionPopoverForMark() {
  if (!activePopoverMark || !popoverEl) return;
  const rect = activePopoverMark.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    dismissPopover();
    return;
  }

  popoverPosition = {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
    top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 40)),
  };
  syncFloatingPositions();
}

function positionToolbarForRange() {
  if (!toolbarEl || !toolbarRange) return;
  const rect = toolbarRange.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    dismissToolbar();
    return;
  }
  toolbarPosition = {
    left: Math.max(8, rect.left + rect.width / 2 - 78),
    top: Math.max(8, rect.top - 46),
  };
  syncFloatingPositions();
}

function schedulePopoverPosition() {
  if (!activePopoverMark || !popoverEl || activePopoverFrame != null) return;
  activePopoverFrame = requestAnimationFrame(() => {
    activePopoverFrame = null;
    positionPopoverForMark();
  });
}

function scheduleToolbarPosition() {
  if (!toolbarEl || !toolbarRange || activeToolbarFrame != null) return;
  activeToolbarFrame = requestAnimationFrame(() => {
    activeToolbarFrame = null;
    positionToolbarForRange();
  });
}

// ── Toolbar ────────────────────────────────────────────────────────
function showSelectionToolbar(rect: DOMRect, range: Range) {
  dismissToolbar();
  const sr = getShadow();
  toolbarRange = range;

  toolbarEl = document.createElement("div");
  toolbarEl.id = "marginalia-toolbar";
  toolbarEl.className = "marginalia-toolbar";

  toolbarPosition = {
    left: Math.max(8, rect.left + rect.width / 2 - 78),
    top: Math.max(8, rect.top - 46),
  };
  syncFloatingPositions();

  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.className = "marginalia-swatch swatch";
    btn.dataset.color = color;
    btn.title = color;
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      void saveHighlight(range, color);
      dismissToolbar();
    });
    toolbarEl.appendChild(btn);
  }

  sr.appendChild(toolbarEl);
}

function dismissToolbar() {
  toolbarEl?.remove();
  toolbarEl = null;
  toolbarRange = null;
  toolbarPosition = null;
  if (activeToolbarFrame != null) {
    cancelAnimationFrame(activeToolbarFrame);
    activeToolbarFrame = null;
  }
  syncFloatingPositions();
}

function dismissPopover() {
  popoverEl?.remove();
  popoverEl = null;
  activePopoverMark = null;
  popoverPosition = null;
  if (activePopoverFrame != null) {
    cancelAnimationFrame(activePopoverFrame);
    activePopoverFrame = null;
  }
  syncFloatingPositions();
}

// ── Save highlight ─────────────────────────────────────────────────
async function saveHighlight(range: Range, color: HighlightColor) {
  const text = range.toString().trim();
  if (!text) return;

  const offsets = rangeOffsets(range);

  // Collect surrounding context (~100 chars before + after)
  const container = range.commonAncestorContainer;
  const parent =
    container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as Element);
  const textContext = parent?.textContent?.slice(0, 200) ?? undefined;

  // Wrap the range in a mark
  wrapRange(range, color, "pending");

  const payload: SaveHighlightPayload = {
    url: stripMarginaliaTarget(location.href),
    title: document.title,
    text,
    textContext,
    anchorPrefix: offsets?.documentText.slice(Math.max(0, offsets.start - 100), offsets.start),
    anchorSuffix: offsets?.documentText.slice(offsets.end, offsets.end + 100),
    anchorStart: offsets?.start,
    anchorEnd: offsets?.end,
    color,
  };

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_HIGHLIGHT",
    payload,
  });
  if (response?.ok && response.data?.id) {
    // Update the mark's data-id
    const marks = document.querySelectorAll<HTMLElement>(
      `mark.marg-h[data-id="pending"]`,
    );
    marks.forEach((m) => {
      m.dataset.id = response.data.id;
    });
  }
}

// ── Wrap range in a <mark> ─────────────────────────────────────────
function attachMarkClick(mark: HTMLElement) {
  mark.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentId = mark.dataset.id ?? "";
    const currentColor = (mark.dataset.color ?? "amber") as HighlightColor;
    const currentNote = mark.dataset.note ?? "";
    const currentTags = readTags(mark.dataset.tags);
    if (!currentId || currentId === "pending") return;
    showEditPopover(mark, currentId, currentColor, currentNote, currentTags);
  });
}

function readTags(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function writeTags(mark: HTMLElement, tags: string[]) {
  mark.dataset.tags = JSON.stringify(tags);
}

function applyMarkColor(mark: HTMLElement, color: HighlightColor) {
  const fill = HIGHLIGHT_FILLS[color] ?? HIGHLIGHT_FILLS.amber;
  mark.dataset.color = color;
  mark.style.setProperty("background-color", "transparent", "important");
  mark.style.setProperty("color", "#111827", "important");
  mark.style.setProperty(
    "background-image",
    `linear-gradient(180deg, transparent 0%, transparent 12%, ${fill} 12%, ${fill} 92%, transparent 92%)`,
    "important",
  );
  mark.style.setProperty("background-repeat", "repeat", "important");
}

function wrapRange(range: Range, color: HighlightColor, id: string, note?: string, tags: string[] = []) {
  try {
    const mark = document.createElement("mark");
    mark.className = `marg-h marginalia-mark marg-${color}`;
    mark.dataset.id = id;
    applyMarkColor(mark, color);
    if (note) mark.dataset.note = note;
    writeTags(mark, tags);
    range.surroundContents(mark);
    attachMarkClick(mark);
  } catch {
    try {
      const fragment = range.extractContents();
      const mark = document.createElement("mark");
      mark.className = `marg-h marginalia-mark marg-${color}`;
      mark.dataset.id = id;
      applyMarkColor(mark, color);
      if (note) mark.dataset.note = note;
      writeTags(mark, tags);
      mark.appendChild(fragment);
      range.insertNode(mark);
      attachMarkClick(mark);
    } catch {
      // Silently fail — range is too complex
    }
  }
}

// ── Edit / delete popover ──────────────────────────────────────────
function showEditPopover(
  mark: HTMLElement,
  id: string,
  currentColor: HighlightColor,
  currentNote: string = "",
  currentTags: string[] = [],
) {
  dismissToolbar();
  dismissPopover();

  const sr = getShadow();
  activePopoverMark = mark;

  popoverEl = document.createElement("div");
  popoverEl.id = "marginalia-popover";
  popoverEl.className = "marginalia-popover";
  positionPopoverForMark();

  // Color row
  const colorLabel = document.createElement("div");
  colorLabel.className = "marginalia-pop-label";
  colorLabel.textContent = "Colour";
  popoverEl.appendChild(colorLabel);

  const swatchRow = document.createElement("div");
  swatchRow.className = "marginalia-pop-swatches";
  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.className = `marginalia-pop-swatch${color === currentColor ? " active" : ""}`;
    btn.dataset.color = color;
    btn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        type: "UPDATE_HIGHLIGHT",
        payload: { id, color },
      });
      applyMarkColor(mark, color);
      for (const previousColor of COLORS) {
        mark.classList.remove(`marg-${previousColor}`);
      }
      mark.classList.add(`marg-${color}`);
      swatchRow
        .querySelectorAll(".marginalia-pop-swatch")
        .forEach((swatch) => swatch.classList.remove("active"));
      btn.classList.add("active");
    });
    swatchRow.appendChild(btn);
  }
  popoverEl.appendChild(swatchRow);

  // Note textarea
  const noteLabel = document.createElement("div");
  noteLabel.className = "marginalia-pop-label";
  noteLabel.textContent = "Note";
  popoverEl.appendChild(noteLabel);

  const textarea = document.createElement("textarea");
  textarea.className = "marginalia-pop-note";
  textarea.rows = 3;
  textarea.placeholder = "Add a note…";
  textarea.value = currentNote;
  popoverEl.appendChild(textarea);

  const tagLabel = document.createElement("div");
  tagLabel.className = "marginalia-pop-label";
  tagLabel.textContent = "Tags";
  popoverEl.appendChild(tagLabel);

  let tags = [...currentTags];
  const tagWrap = document.createElement("div");
  tagWrap.className = "marginalia-tag-editor";
  const renderTags = () => {
    tagWrap.textContent = "";
    for (const tag of tags) {
      const chip = document.createElement("span");
      chip.className = "marginalia-tag-chip";
      chip.textContent = `#${tag}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "x";
      remove.addEventListener("click", async () => {
        tags = tags.filter((item) => item !== tag);
        await chrome.runtime.sendMessage({
          type: "UPDATE_HIGHLIGHT",
          payload: { id, tags },
        });
        writeTags(mark, tags);
        renderTags();
      });
      chip.appendChild(remove);
      tagWrap.appendChild(chip);
    }
    const input = document.createElement("input");
    input.className = "marginalia-tag-input";
    input.placeholder = "tag name";
    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const tag = input.value.trim().replace(/^#/, "").replace(/\s+/g, "-");
      if (!tag || tags.includes(tag)) return;
      tags = [...tags, tag];
      await chrome.runtime.sendMessage({
        type: "UPDATE_HIGHLIGHT",
        payload: { id, tags },
      });
      writeTags(mark, tags);
      renderTags();
    });
    tagWrap.appendChild(input);
  };
  renderTags();
  popoverEl.appendChild(tagWrap);

  // Buttons row
  const btnRow = document.createElement("div");
  btnRow.className = "marginalia-pop-row";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "marginalia-pop-btn marginalia-pop-btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({
      type: "DELETE_HIGHLIGHT",
      payload: { id },
    });
    mark.replaceWith(...Array.from(mark.childNodes));
    dismissPopover();
  });

  const saveBtn = document.createElement("button");
  saveBtn.className = "marginalia-pop-btn";
  saveBtn.textContent = "Save note";
  saveBtn.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({
      type: "UPDATE_HIGHLIGHT",
      payload: { id, note: textarea.value },
    });
    if (res?.ok) {
      mark.dataset.note = textarea.value;
    }
    dismissPopover();
  });

  btnRow.appendChild(deleteBtn);
  btnRow.appendChild(saveBtn);
  popoverEl.appendChild(btnRow);

  sr.appendChild(popoverEl);
  positionPopoverForMark();
}

// ── Re-paint saved highlights on load ─────────────────────────────
async function repaintHighlights() {
  if (repaintPromise) return repaintPromise;

  repaintPromise = (async () => {
    const response = await chrome.runtime.sendMessage({
      type: "LIST_FOR_URL",
      payload: { url: stripMarginaliaTarget(location.href) },
    });
    if (!response?.ok || !Array.isArray(response.data)) return;

    savedHighlights = response.data;
    for (const h of savedHighlights) {
      paintHighlight(h);
    }
  })().finally(() => {
    repaintPromise = null;
  });

  return repaintPromise;
}

async function focusHighlight(id: string) {
  const mark = document.querySelector<HTMLElement>(
    `mark.marg-h[data-id="${CSS.escape(id)}"]`,
  );
  if (!mark) {
    await repaintHighlights();
  }

  const focusedMark = document.querySelector<HTMLElement>(
    `mark.marg-h[data-id="${CSS.escape(id)}"]`,
  );
  if (!focusedMark) return false;

  focusedMark.scrollIntoView({ behavior: "smooth", block: "center" });
  focusedMark.classList.remove("marginalia-focused");
  // restart animation
  void focusedMark.offsetWidth;
  focusedMark.classList.add("marginalia-focused");
  return true;
}

function paintHighlight(h: SavedHighlight) {
  if (document.querySelector(`[data-id="${h._id}"]`)) return;
  const range = findAnchoredRange(h);
  if (!range) return;
  wrapRange(range, h.color as HighlightColor, h._id, h.note, h.tags ?? []);
}

function hasUnpaintedHighlights() {
  return savedHighlights.some((h) => !document.querySelector(`[data-id="${h._id}"]`));
}

function scheduleRepaintRetry() {
  if (!savedHighlights.length || !hasUnpaintedHighlights() || repaintRetryTimer != null) return;
  repaintRetryTimer = window.setTimeout(() => {
    repaintRetryTimer = null;
    void repaintHighlights();
  }, 500);
}

// ── Selection listener ─────────────────────────────────────────────
document.addEventListener("mouseup", (e) => {
  // Dismiss if clicking inside the shadow host
  if ((e.target as Element)?.closest?.("#marginalia-host")) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    dismissToolbar();
    return;
  }
  const text = sel.toString().trim();
  if (text.length < 2) {
    dismissToolbar();
    return;
  }

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showSelectionToolbar(rect, range.cloneRange());
});

document.addEventListener("mousedown", (e) => {
  const target = e.target as Element;
  if (!target.closest?.("#marginalia-host")) {
    dismissPopover();
  }
});

document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest?.("input, textarea, [contenteditable='true']")) return;
  const index = Number(e.key) - 1;
  if (!toolbarEl || !toolbarRange || index < 0 || index >= COLORS.length) return;
  e.preventDefault();
  void saveHighlight(toolbarRange, COLORS[index]);
  dismissToolbar();
});

window.addEventListener("scroll", schedulePopoverPosition, true);
window.addEventListener("scroll", scheduleToolbarPosition, true);
window.addEventListener("resize", schedulePopoverPosition);
window.addEventListener("resize", scheduleToolbarPosition);

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.target instanceof Element && mutation.target.closest("#marginalia-host"))) {
    return;
  }
  scheduleRepaintRetry();
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });

// ── Message listener (from popup/sidepanel) ────────────────────────
chrome.runtime.onMessage.addListener((msg: TabMessage, _sender, sendResponse) => {
  if (msg?.type === "SCROLL_TO_HIGHLIGHT" && msg.payload?.id) {
    void focusHighlight(msg.payload.id).then((focused) =>
      sendResponse({ ok: focused }),
    );
    return true;
  }
});

// ── Init ───────────────────────────────────────────────────────────
repaintHighlights()
  .then(() => {
    const hashId = readMarginaliaTarget(location.href);
    if (hashId) {
      requestAnimationFrame(() => {
        void focusHighlight(hashId);
      });
    }
  })
  .catch(() => {});
