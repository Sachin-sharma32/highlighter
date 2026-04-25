import shadowCss from "./content.css?inline";
import type { SaveHighlightPayload, TabMessage } from "../lib/messages";
import { readMarginaliaTarget, stripMarginaliaTarget } from "../lib/urls";
import { formatClipTime, getYouTubeVideoId, youtubeWatchUrl } from "../lib/youtube";
import { renderMultiSelect } from "./TooltipReact";

// ── Settings cache (from chrome.storage.sync via background) ───────
let highlightingEnabled = true;
let customColors: { id: string; label: string; value: string; isDefault?: boolean }[] = [];

void chrome.runtime
  .sendMessage({ type: "GET_SETTINGS" })
  .then((res) => {
    if (res?.ok) highlightingEnabled = res.data.highlightingEnabled;
  })
  .catch(() => {});

void chrome.runtime
  .sendMessage({ type: "GET_COLORS" })
  .then((res) => {
    if (res?.ok && Array.isArray(res.data)) {
      customColors = res.data;
    }
  })
  .catch(() => {});

interface Collection {
  _id: string;
  name: string;
}
let cachedCollections: Collection[] = [];
let lastUsedCollectionId: string | null = null;

async function refreshCollections() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "LIST_COLLECTIONS" });
    if (res?.ok && Array.isArray(res.data)) {
      cachedCollections = res.data as Collection[];
    }
    const stored = await chrome.storage.sync.get("marginalia_last_collection_id");
    const id = stored["marginalia_last_collection_id"];
    lastUsedCollectionId = typeof id === "string" ? id : null;
  } catch {
    /* ignore */
  }
}

async function persistLastCollection(id: string | null) {
  lastUsedCollectionId = id;
  if (id === null) {
    await chrome.storage.sync.remove("marginalia_last_collection_id");
  } else {
    await chrome.storage.sync.set({ "marginalia_last_collection_id": id });
  }
}

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

function resolveHighlightFill(color: string) {
  const custom = customColors.find(c => c.id === color)?.value;
  if (!custom) return HIGHLIGHT_FILLS[color as HighlightColor] ?? HIGHLIGHT_FILLS.amber;

  const cssVarMatch = custom.match(/^var\(\s*--hl-(amber|rose|sage|sky|violet)(?:\s*,[^)]*)?\s*\)$/);
  if (cssVarMatch) return HIGHLIGHT_FILLS[cssVarMatch[1] as HighlightColor];

  return custom;
}

function getAllColors() {
  if (customColors.length > 0) return customColors.map(c => ({ id: c.id, color: c.value }));
  return COLORS.map(c => ({ id: c, color: HIGHLIGHT_FILLS[c] }));
}

// ── Shadow DOM container ───────────────────────────────────────────
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let toolbarEl: HTMLElement | null = null;
let positionStyleEl: HTMLStyleElement | null = null;
let activeToolbarFrame: number | null = null;

interface FloatingPosition {
  left: number;
  top: number;
}

let toolbarPosition: FloatingPosition | null = null;
let repaintPromise: Promise<void> | null = null;
let toolbarRange: Range | null = null;
let toolbarMark: HTMLElement | null = null;
let youtubeClipEl: HTMLElement | null = null;
let youtubePlayerButton: HTMLButtonElement | null = null;
let youtubePlayerButtonMountTimer: number | null = null;
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

function positionToolbarForRect(rect: DOMRect) {
  const CARD_WIDTH = 260;
  toolbarPosition = {
    left: Math.max(8, Math.min(
      rect.left + rect.width / 2 - CARD_WIDTH / 2,
      window.innerWidth - CARD_WIDTH - 8,
    )),
    top: Math.min(rect.bottom + 8, window.innerHeight - 320),
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
  positionToolbarForRect(rect);
}

function positionToolbarForMark() {
  if (!toolbarEl || !toolbarMark) return;
  const rect = toolbarMark.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    dismissToolbar();
    return;
  }
  positionToolbarForRect(rect);
}

function scheduleToolbarPosition() {
  if (!toolbarEl || activeToolbarFrame != null) return;
  activeToolbarFrame = requestAnimationFrame(() => {
    activeToolbarFrame = null;
    if (toolbarRange) positionToolbarForRange();
    else if (toolbarMark) positionToolbarForMark();
  });
}

// ── Toolbar ────────────────────────────────────────────────────────
function showSelectionToolbar(rect: DOMRect, range: Range) {
  dismissToolbar();
  const sr = getShadow();
  toolbarRange = range;
  toolbarMark = null;

  const text = range.toString();
  const charCount = text.length;

  toolbarEl = document.createElement("div");
  toolbarEl.id = "marginalia-toolbar";
  toolbarEl.className = "marginalia-card marginalia-toolbar-card";

  positionToolbarForRect(rect);

  // Row 1: colour swatches
  const swatchRow = document.createElement("div");
  swatchRow.className = "marginalia-swatch-row";
  for (const c of getAllColors()) {
    const btn = document.createElement("button");
    btn.className = "marginalia-swatch-big";
    btn.dataset.color = c.id;
    btn.title = `Highlight ${c.id}`;
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      void saveHighlight(range, c.id);
      dismissToolbar();
    });
    swatchRow.appendChild(btn);
  }
  toolbarEl.appendChild(swatchRow);

  // Action rows
  toolbarEl.appendChild(
    makeActionRow("Copy text", "Y", () => {
      dismissToolbar();
      void navigator.clipboard.writeText(text).catch(() => {});
    }),
  );
  toolbarEl.appendChild(
    makeActionRow("Add note", "N", () => {
      dismissToolbar();
      void saveHighlightAndShowEdit(range, resolveDefaultColor(), { focus: "note" });
    }),
  );
  toolbarEl.appendChild(
    makeActionRow("Tag…", "T", () => {
      dismissToolbar();
      void saveHighlightAndShowEdit(range, resolveDefaultColor(), { focus: "tag" });
    }),
  );
  toolbarEl.appendChild(
    makeActionRow("Copy with source", "C", () => {
      // Dismiss FIRST to prevent flickering, then copy
      const md = `> ${text}\n\n— ${document.title} (${location.href})`;
      dismissToolbar();
      void navigator.clipboard.writeText(md).catch(() => {});
    }),
  );

  // Footer: char count
  const footer = document.createElement("div");
  footer.className = "marginalia-toolbar-footer";
  footer.textContent = `${charCount} char${charCount === 1 ? "" : "s"} selected`;
  toolbarEl.appendChild(footer);

  sr.appendChild(toolbarEl);
}

function makeActionRow(
  label: string,
  kbd: string,
  onClick: () => void,
): HTMLElement {
  const row = document.createElement("button");
  row.className = "marginalia-action-row";
  row.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onClick();
  });
  const labelEl = document.createElement("span");
  labelEl.className = "marginalia-action-label";
  labelEl.textContent = label;
  row.appendChild(labelEl);
  const kbdEl = document.createElement("span");
  kbdEl.className = "marginalia-kbd";
  kbdEl.textContent = kbd;
  row.appendChild(kbdEl);
  return row;
}

function resolveDefaultColor(): string {
  const all = getAllColors();
  return all[0]?.id || "amber";
}

let onDismissToolbar: (() => void) | null = null;

function dismissToolbar() {
  onDismissToolbar?.();
  onDismissToolbar = null;
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

// ── Save highlight ─────────────────────────────────────────────────
interface SaveOptions {
  note?: string;
  collectionId?: string | null;
  tags?: string[];
}

async function saveHighlight(
  range: Range,
  color: string,
  options: SaveOptions = {},
): Promise<string | null> {
  const text = range.toString().trim();
  if (!text) return null;

  const offsets = rangeOffsets(range);

  const container = range.commonAncestorContainer;
  const parent =
    container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as Element);
  const textContext = parent?.textContent?.slice(0, 200) ?? undefined;

  wrapRange(range, color, "pending", options.note, options.tags ?? []);

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
    note: options.note,
    collectionIds:
      options.collectionId === null
        ? undefined
        : options.collectionId ? [options.collectionId] : lastUsedCollectionId ? [lastUsedCollectionId] : undefined,
    tags: options.tags,
  };

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_HIGHLIGHT",
    payload,
  });
  if (response?.ok && response.data?.id) {
    const newId = response.data.id as string;
    const marks = document.querySelectorAll<HTMLElement>(
      `mark.marg-h[data-id="pending"]`,
    );
    marks.forEach((m) => {
      m.dataset.id = newId;
    });
    return newId;
  }
  return null;
}

async function saveHighlightAndShowEdit(
  range: Range,
  color: string,
  opts: { focus?: "note" | "tag" } = {},
) {
  await refreshCollections();
  const id = await saveHighlight(range, color);
  if (!id) return;
  const mark = document.querySelector<HTMLElement>(
    `mark.marg-h[data-id="${CSS.escape(id)}"]`,
  );
  if (!mark) return;
  showEditCard(mark, id, color, "", [], lastUsedCollectionId ? [lastUsedCollectionId] : [], opts.focus ?? "note");
}

// ── Wrap range in a <mark> ─────────────────────────────────────────
function attachMarkClick(mark: HTMLElement) {
  mark.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentId = mark.dataset.id ?? "";
    const currentColor = mark.dataset.color ?? "amber";
    const currentNote = mark.dataset.note ?? "";
    const currentTags = readTags(mark.dataset.tags);
    const currentCollectionIds = readTags(mark.dataset.collectionIds);
    if (!currentId || currentId === "pending") return;
    void refreshCollections().then(() =>
      showEditCard(mark, currentId, currentColor, currentNote, currentTags, currentCollectionIds, "note"),
    );
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

function applyMarkColor(mark: HTMLElement, color: string) {
  const fill = resolveHighlightFill(color);
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

function wrapRange(range: Range, color: string, id: string, note?: string, tags: string[] = [], collectionIds: string[] = []) {
  try {
    const mark = document.createElement("mark");
    mark.className = `marg-h marginalia-mark`;
    mark.dataset.id = id;
    applyMarkColor(mark, color);
    if (note) mark.dataset.note = note;
    writeTags(mark, tags);
    if (collectionIds.length) mark.dataset.collectionIds = JSON.stringify(collectionIds);
    range.surroundContents(mark);
    attachMarkClick(mark);
  } catch {
    try {
      const fragment = range.extractContents();
      const mark = document.createElement("mark");
      mark.className = `marg-h marginalia-mark`;
      mark.dataset.id = id;
      applyMarkColor(mark, color);
      if (note) mark.dataset.note = note;
      writeTags(mark, tags);
      if (collectionIds.length) mark.dataset.collectionIds = JSON.stringify(collectionIds);
      mark.appendChild(fragment);
      range.insertNode(mark);
      attachMarkClick(mark);
    } catch {
      // Silently fail — range is too complex
    }
  }
}

// ── Unified edit card (same visual as create toolbar, below the mark) ──
function showEditCard(
  mark: HTMLElement,
  id: string,
  color: string,
  note: string,
  tags: string[],
  collectionIds: string[],
  focus: "note" | "tag" = "note",
) {
  dismissToolbar();
  const sr = getShadow();
  toolbarMark = mark;
  toolbarRange = null;

  toolbarEl = document.createElement("div");
  toolbarEl.id = "marginalia-toolbar";
  toolbarEl.className = "marginalia-card marginalia-edit-card";

  const rect = mark.getBoundingClientRect();
  positionToolbarForRect(rect);

  let currentColor = color;
  let currentNote = note;
  let currentTags = [...tags];
  let currentCollectionIds = [...collectionIds];

  // ── Swatch row with active indicator ──
  const swatchRow = document.createElement("div");
  swatchRow.className = "marginalia-swatch-row";

  function renderSwatches() {
    swatchRow.innerHTML = "";
    for (const c of getAllColors()) {
      const btn = document.createElement("button");
      btn.className = `marginalia-swatch-big${c.id === currentColor ? " active" : ""}`;
      btn.dataset.color = c.id;
      btn.title = c.id;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        currentColor = c.id;
        applyMarkColor(mark, c.id);
        void chrome.runtime.sendMessage({
          type: "UPDATE_HIGHLIGHT",
          payload: { id, color: c.id },
        });
        renderSwatches();
      });
      swatchRow.appendChild(btn);
    }
  }
  renderSwatches();
  toolbarEl.appendChild(swatchRow);

  // ── Collection section ──
  const colSection = document.createElement("div");
  colSection.className = "marginalia-section";
  const colLabel = document.createElement("div");
  colLabel.className = "marginalia-section-label";
  colLabel.textContent = "Collections";
  colSection.appendChild(colLabel);

  const colMount = document.createElement("div");
  colSection.appendChild(colMount);
  toolbarEl.appendChild(colSection);

  // We mount the react component, passing it sr as container for Portal
  const reactRoot = renderMultiSelect(
    colMount,
    cachedCollections,
    currentCollectionIds,
    (ids) => {
      currentCollectionIds = ids;
      if (ids.length) {
        mark.dataset.collectionIds = JSON.stringify(ids);
        void persistLastCollection(ids[ids.length - 1]);
      } else {
        delete mark.dataset.collectionIds;
      }
      void chrome.runtime.sendMessage({
        type: "UPDATE_HIGHLIGHT",
        payload: { id, collectionIds: currentCollectionIds },
      });
    },
    sr as unknown as HTMLElement
  );

  // Need to unmount React when toolbar closes
  onDismissToolbar = () => {
    reactRoot.unmount();
  };

  // ── Tags section ──
  const tagSection = document.createElement("div");
  tagSection.className = "marginalia-section";
  const tagLabel = document.createElement("div");
  tagLabel.className = "marginalia-section-label";
  tagLabel.textContent = "Tags";
  tagSection.appendChild(tagLabel);

  const tagEditor = document.createElement("div");
  tagEditor.className = "marginalia-tag-editor";
  let tagInput: HTMLInputElement | null = null;

  function renderTags() {
    tagEditor.innerHTML = "";
    for (const t of currentTags) {
      const chip = document.createElement("span");
      chip.className = "marginalia-tag-chip";
      chip.textContent = `#${t} `;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        currentTags = currentTags.filter((x) => x !== t);
        writeTags(mark, currentTags);
        void chrome.runtime.sendMessage({
          type: "UPDATE_HIGHLIGHT",
          payload: { id, tags: currentTags },
        });
        renderTags();
      });
      chip.appendChild(removeBtn);
      tagEditor.appendChild(chip);
    }
    tagInput = document.createElement("input");
    tagInput.className = "marginalia-tag-input";
    tagInput.placeholder = "+tag";
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && tagInput?.value.trim()) {
        e.preventDefault();
        const newTag = tagInput.value.trim().replace(/^#/, "");
        if (newTag && !currentTags.includes(newTag)) {
          currentTags.push(newTag);
          writeTags(mark, currentTags);
          void chrome.runtime.sendMessage({
            type: "UPDATE_HIGHLIGHT",
            payload: { id, tags: currentTags },
          });
        }
        renderTags();
      }
    });
    tagEditor.appendChild(tagInput);
  }
  renderTags();
  tagSection.appendChild(tagEditor);
  toolbarEl.appendChild(tagSection);

  // ── Note section ──
  const noteSection = document.createElement("div");
  noteSection.className = "marginalia-section";
  const noteLabel = document.createElement("div");
  noteLabel.className = "marginalia-section-label";
  noteLabel.textContent = "Note";
  noteSection.appendChild(noteLabel);

  const textarea = document.createElement("textarea");
  textarea.className = "marginalia-edit-note";
  textarea.placeholder = "Add a note…";
  textarea.rows = 3;
  textarea.value = currentNote;
  textarea.addEventListener("blur", () => {
    currentNote = textarea.value;
    mark.dataset.note = currentNote;
    void chrome.runtime.sendMessage({
      type: "UPDATE_HIGHLIGHT",
      payload: { id, note: currentNote },
    });
  });
  noteSection.appendChild(textarea);
  toolbarEl.appendChild(noteSection);

  // ── Action row: Delete + Done ──
  const actions = document.createElement("div");
  actions.className = "marginalia-edit-actions";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "marginalia-pop-btn marginalia-pop-btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    void chrome.runtime.sendMessage({
      type: "DELETE_HIGHLIGHT",
      payload: { id },
    });
    const marks = document.querySelectorAll<HTMLElement>(
      `mark.marg-h[data-id="${CSS.escape(id)}"]`,
    );
    marks.forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
    dismissToolbar();
  });
  actions.appendChild(deleteBtn);

  const doneBtn = document.createElement("button");
  doneBtn.className = "marginalia-pop-btn";
  doneBtn.textContent = "Done";
  doneBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    // Save note on close
    if (textarea.value !== currentNote) {
      mark.dataset.note = textarea.value;
      void chrome.runtime.sendMessage({
        type: "UPDATE_HIGHLIGHT",
        payload: { id, note: textarea.value },
      });
    }
    dismissToolbar();
  });
  actions.appendChild(doneBtn);
  toolbarEl.appendChild(actions);

  sr.appendChild(toolbarEl);

  // Focus the right field
  requestAnimationFrame(() => {
    if (focus === "tag" && tagInput) tagInput.focus();
    else textarea.focus();
  });
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

  // Don't show toolbar when highlighting is disabled
  if (!highlightingEnabled) return;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showSelectionToolbar(rect, range.cloneRange());
});

document.addEventListener("mousedown", (e) => {
  const target = e.target as Element;
  if (!target.closest?.("#marginalia-host")) {
    dismissToolbar();
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

window.addEventListener(
  "scroll",
  () => {
    scheduleToolbarPosition();
    positionYouTubePlayerButton();
  },
  true
);
window.addEventListener("resize", () => {
  scheduleToolbarPosition();
  positionYouTubeClipper();
  positionYouTubePlayerButton();
  scheduleYouTubePlayerButtonMount();
});
window.addEventListener("yt-navigate-finish", scheduleYouTubePlayerButtonMount);
window.addEventListener("yt-page-data-updated", scheduleYouTubePlayerButtonMount);

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.target instanceof Element && mutation.target.closest("#marginalia-host"))) {
    return;
  }
  scheduleRepaintRetry();
  positionYouTubeClipper();
  positionYouTubePlayerButton();
  scheduleYouTubePlayerButtonMount();
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });

function getYouTubeChannelTitle() {
  return (
    document.querySelector<HTMLAnchorElement>("ytd-video-owner-renderer #channel-name a")?.textContent?.trim() ||
    document.querySelector<HTMLElement>("#owner #channel-name")?.textContent?.trim() ||
    undefined
  );
}

function getYouTubeClipContext() {
  const videoId = getYouTubeVideoId(location.href);
  const video = document.querySelector<HTMLVideoElement>("video");
  if (!videoId || !video) return null;

  const duration = Number.isFinite(video.duration) && video.duration > 0
    ? video.duration
    : undefined;

  return {
    videoId,
    title: document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim() || "YouTube video",
    url: youtubeWatchUrl(videoId),
    currentTime: video.currentTime,
    duration,
    channelTitle: getYouTubeChannelTitle(),
  };
}

function clipLabel(start?: number, end?: number) {
  if (start === undefined || end === undefined) return "YouTube clip";
  return `YouTube clip ${formatClipTime(start)}-${formatClipTime(end)}`;
}

function dismissYouTubeClipTrimmer() {
  youtubeClipEl?.remove();
  youtubeClipEl = null;
}

function positionYouTubeClipper() {
  if (!youtubeClipEl) return;
  const player = document.querySelector<HTMLElement>(".html5-video-player");
  const rect = player?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    youtubeClipEl.style.top = "86px";
    youtubeClipEl.style.right = "24px";
    youtubeClipEl.style.left = "";
    return;
  }

  const top = Math.max(16, rect.top + 16);
  const sideLeft = rect.right + 24;
  const hasSuggestionsSpace = window.innerWidth - sideLeft >= 480;

  if (hasSuggestionsSpace) {
    youtubeClipEl.style.left = `${sideLeft}px`;
    youtubeClipEl.style.right = "";
  } else {
    youtubeClipEl.style.left = "";
    youtubeClipEl.style.right = "24px";
  }
  youtubeClipEl.style.top = `${top}px`;
}

function positionYouTubePlayerButton() {
  if (!youtubePlayerButton) return;
  const player = document.querySelector<HTMLElement>(".html5-video-player");
  const rect = player?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;
  const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
  youtubePlayerButton.style.display = isVisible ? "inline-flex" : "none";
  if (!isVisible) return;
  youtubePlayerButton.style.left = `${Math.max(12, rect.left + 14)}px`;
  youtubePlayerButton.style.top = `${Math.max(12, rect.top + 14)}px`;
}

function showYouTubeClipTrimmer() {
  const context = getYouTubeClipContext();
  if (!context) {
    throw new Error("No playable YouTube video found.");
  }

  dismissYouTubeClipTrimmer();
  dismissToolbar();

  const sr = getShadow();
  const video = document.querySelector<HTMLVideoElement>("video");
  let start: number | null = null;
  let end: number | null = null;
  let note = "";
  let saving = false;

  const card = document.createElement("div");
  card.id = "marginalia-youtube-clipper";
  card.className = "marginalia-card marginalia-youtube-clipper";
  youtubeClipEl = card;

  const header = document.createElement("div");
  header.className = "marginalia-youtube-clipper-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "marginalia-youtube-clipper-title-wrap";

  const eyebrow = document.createElement("div");
  eyebrow.className = "marginalia-youtube-clipper-eyebrow";
  eyebrow.textContent = "Marginalia clip";

  const title = document.createElement("div");
  title.className = "marginalia-youtube-clipper-title";
  title.textContent = context.title;

  titleWrap.append(eyebrow, title);

  const closeBtn = document.createElement("button");
  closeBtn.className = "marginalia-youtube-clipper-icon";
  closeBtn.type = "button";
  closeBtn.title = "Close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", dismissYouTubeClipTrimmer);

  header.append(titleWrap, closeBtn);

  const helper = document.createElement("div");
  helper.className = "marginalia-youtube-clipper-helper";
  helper.textContent = "Play the video, then mark the beginning and end of the moment you want to save.";

  const rangeLabel = document.createElement("div");
  rangeLabel.className = "marginalia-youtube-clipper-range";

  const marks = document.createElement("div");
  marks.className = "marginalia-youtube-clipper-marks";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "marginalia-youtube-clipper-mark-btn";

  const endBtn = document.createElement("button");
  endBtn.type = "button";
  endBtn.className = "marginalia-youtube-clipper-mark-btn";

  marks.append(startBtn, endBtn);

  const noteInput = document.createElement("textarea");
  noteInput.className = "marginalia-youtube-clipper-note";
  noteInput.placeholder = "Add a note if this idea needs context…";

  const status = document.createElement("div");
  status.className = "marginalia-youtube-clipper-status";

  const actions = document.createElement("div");
  actions.className = "marginalia-youtube-clipper-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "marginalia-pop-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", dismissYouTubeClipTrimmer);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "marginalia-pop-btn marginalia-youtube-clipper-save";
  saveBtn.textContent = "Save clip";

  actions.append(cancelBtn, saveBtn);
  card.append(header, helper, rangeLabel, marks, noteInput, status, actions);

  function readCurrentTime() {
    const currentVideo = document.querySelector<HTMLVideoElement>("video") ?? video;
    if (!currentVideo || !Number.isFinite(currentVideo.currentTime)) return 0;
    return Math.max(0, Math.floor(currentVideo.currentTime));
  }

  function syncState() {
    note = noteInput.value;

    startBtn.innerHTML = `<span>Set start</span><strong>${start === null ? "Not set" : formatClipTime(start)}</strong>`;
    endBtn.innerHTML = `<span>Set end</span><strong>${end === null ? "Not set" : formatClipTime(end)}</strong>`;
    rangeLabel.textContent = start !== null && end !== null
      ? `${formatClipTime(start)}-${formatClipTime(end)}`
      : "Mark start and end while the video plays";

    const missing = start === null || end === null;
    const invalid = !missing && end <= start;
    saveBtn.toggleAttribute("disabled", missing || invalid || saving);
    if (missing) {
      status.textContent = "Save unlocks once both start and end are marked.";
      status.dataset.tone = "muted";
    } else if (invalid) {
      status.textContent = "End must be after start.";
      status.dataset.tone = "error";
    } else if (!saving && status.dataset.tone !== "success") {
      status.textContent = "Ready to save.";
      status.dataset.tone = "success";
    }
  }

  startBtn.addEventListener("click", () => {
    start = readCurrentTime();
    syncState();
  });
  endBtn.addEventListener("click", () => {
    end = readCurrentTime();
    syncState();
  });
  noteInput.addEventListener("input", syncState);

  saveBtn.addEventListener("click", () => {
    if (saving || start === null || end === null || end <= start) return;
    saving = true;
    status.textContent = "Saving clip…";
    status.dataset.tone = "muted";
    syncState();

    const payload: SaveHighlightPayload = {
      url: youtubeWatchUrl(context.videoId),
      title: context.title,
      text: clipLabel(start, end),
      color: "sky",
      note: note.trim() || undefined,
      sourceType: "youtube",
      youtubeVideoId: context.videoId,
      clipStart: start,
      clipEnd: end,
      youtubeChannelTitle: context.channelTitle,
    };

    void chrome.runtime.sendMessage({ type: "SAVE_HIGHLIGHT", payload })
      .then((response) => {
        if (!response?.ok) throw new Error(response?.error ?? "Could not save clip.");
        status.textContent = "Saved to dashboard.";
        status.dataset.tone = "success";
        void chrome.runtime.sendMessage({ type: "YOUTUBE_CLIP_SAVED" }).catch(() => {});
        window.setTimeout(dismissYouTubeClipTrimmer, 900);
      })
      .catch((error) => {
        saving = false;
        status.textContent = error instanceof Error ? error.message : "Could not save clip.";
        status.dataset.tone = "error";
        syncState();
      });
  });

  syncState();
  sr.appendChild(card);
  positionYouTubeClipper();
  startBtn.focus();
}

function isYouTubeVideoPage() {
  return Boolean(getYouTubeVideoId(location.href) && document.querySelector<HTMLVideoElement>("video"));
}

function mountYouTubePlayerButton() {
  if (!isYouTubeVideoPage()) {
    youtubePlayerButton?.remove();
    youtubePlayerButton = null;
    dismissYouTubeClipTrimmer();
    return;
  }

  const sr = getShadow();
  if (youtubePlayerButton && youtubePlayerButton.isConnected) {
    positionYouTubePlayerButton();
    return;
  }

  youtubePlayerButton?.remove();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "marginalia-youtube-player-button";
  button.title = "Clip current moment with Marginalia";
  button.setAttribute("aria-label", "Clip current moment with Marginalia");
  button.textContent = "Clip current moment";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showYouTubeClipTrimmer();
  });

  sr.appendChild(button);
  youtubePlayerButton = button;
  positionYouTubePlayerButton();
}

function scheduleYouTubePlayerButtonMount() {
  if (youtubePlayerButtonMountTimer != null) return;
  youtubePlayerButtonMountTimer = window.setTimeout(() => {
    youtubePlayerButtonMountTimer = null;
    mountYouTubePlayerButton();
  }, 250);
}

// ── Message listener (from popup/sidepanel) ────────────────────────
chrome.runtime.onMessage.addListener((msg: TabMessage, _sender, sendResponse) => {
  if (msg?.type === "SCROLL_TO_HIGHLIGHT" && msg.payload?.id) {
    void focusHighlight(msg.payload.id).then((focused) =>
      sendResponse({ ok: focused }),
    );
    return true;
  }
  if (msg?.type === "DELETE_HIGHLIGHT_MARK" && msg.payload?.id) {
    const marks = document.querySelectorAll<HTMLElement>(
      `mark.marg-h[data-id="${CSS.escape(msg.payload.id)}"]`,
    );
    marks.forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "HIGHLIGHTING_TOGGLED") {
    highlightingEnabled = msg.payload.enabled;
    if (!highlightingEnabled) dismissToolbar();
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "GET_YOUTUBE_CLIP_CONTEXT") {
    const context = getYouTubeClipContext();
    sendResponse(context ? { ok: true, data: context } : { ok: false, error: "No playable YouTube video found." });
    return true;
  }
  if (msg?.type === "SHOW_YOUTUBE_CLIP_TRIMMER") {
    try {
      showYouTubeClipTrimmer();
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not open clip trimmer." });
    }
    return true;
  }
});

// ── Init ───────────────────────────────────────────────────────────
repaintHighlights()
  .then(() => {
    mountYouTubePlayerButton();
    const hashId = readMarginaliaTarget(location.href);
    if (hashId) {
      requestAnimationFrame(() => {
        void focusHighlight(hashId);
      });
    }
  })
  .catch(() => {});
