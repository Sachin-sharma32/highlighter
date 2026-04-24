import shadowCss from "./content.css?inline";
import type { SaveHighlightPayload } from "../lib/messages";

// ── Types ─────────────────────────────────────────────────────────
interface SavedHighlight {
  id: string;
  text: string;
  textContext?: string;
  color: "amber" | "rose" | "sage" | "sky" | "violet";
  note?: string;
}

// ── Constants ──────────────────────────────────────────────────────
const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

// ── Shadow DOM container ───────────────────────────────────────────
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let toolbarEl: HTMLElement | null = null;
let popoverEl: HTMLElement | null = null;
let positionStyleEl: HTMLStyleElement | null = null;

interface FloatingPosition {
  left: number;
  top: number;
}

let toolbarPosition: FloatingPosition | null = null;
let popoverPosition: FloatingPosition | null = null;

function ensureHostStyles() {
  if (document.getElementById("marginalia-host-style")) return;

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
    rules.push(`#marginalia-toolbar{left:${toolbarPosition.left}px;top:${toolbarPosition.top}px;}`);
  }
  if (popoverPosition) {
    rules.push(`#marginalia-popover{left:${popoverPosition.left}px;top:${popoverPosition.top}px;}`);
  }

  positionStyleEl.textContent = rules.join("\n");
}

// ── Toolbar ────────────────────────────────────────────────────────
function showSelectionToolbar(rect: DOMRect, range: Range) {
  dismissToolbar();
  const sr = getShadow();

  toolbarEl = document.createElement("div");
  toolbarEl.id = "marginalia-toolbar";
  toolbarEl.className = "marginalia-toolbar";

  const x = rect.left + rect.width / 2 - 78; // approx center
  const y = rect.top - 46;

  toolbarPosition = {
    left: Math.max(8, x),
    top: Math.max(8, y),
  };
  syncFloatingPositions();

  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.className = "marginalia-swatch";
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
  toolbarPosition = null;
  syncFloatingPositions();
}

function dismissPopover() {
  popoverEl?.remove();
  popoverEl = null;
  popoverPosition = null;
  syncFloatingPositions();
}

// ── Save highlight ─────────────────────────────────────────────────
async function saveHighlight(range: Range, color: HighlightColor) {
  const text = range.toString().trim();
  if (!text) return;

  // Collect surrounding context (~100 chars before + after)
  const container = range.commonAncestorContainer;
  const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
  const textContext = parent?.textContent?.slice(0, 200) ?? undefined;

  // Wrap the range in a mark
  wrapRange(range, color, "pending");

  const payload: SaveHighlightPayload = {
    url: location.href,
    title: document.title,
    text,
    textContext,
    color,
  };

  const response = await chrome.runtime.sendMessage({ type: "SAVE_HIGHLIGHT", payload });
  if (response?.ok && response.data?.id) {
    // Update the mark's data-id
    const marks = document.querySelectorAll<HTMLElement>(`mark.marg-h[data-id="pending"]`);
    marks.forEach((m) => { m.dataset.id = response.data.id; });
  }
}

// ── Wrap range in a <mark> ─────────────────────────────────────────
function wrapRange(range: Range, color: HighlightColor, id: string) {
  try {
    const mark = document.createElement("mark");
    mark.className = "marg-h marginalia-mark";
    mark.dataset.id = id;
    mark.dataset.color = color;
    range.surroundContents(mark);
    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      showEditPopover(mark, id, color);
    });
  } catch {
    // surroundContents fails if range spans multiple block elements — use extractContents
    try {
      const fragment = range.extractContents();
      const mark = document.createElement("mark");
      mark.className = "marg-h marginalia-mark";
      mark.dataset.id = id;
      mark.dataset.color = color;
      mark.appendChild(fragment);
      range.insertNode(mark);
      mark.addEventListener("click", (e) => {
        e.stopPropagation();
        showEditPopover(mark, id, color);
      });
    } catch {
      // Silently fail — range is too complex
    }
  }
}

// ── Edit / delete popover ──────────────────────────────────────────
function showEditPopover(mark: HTMLElement, id: string, currentColor: HighlightColor) {
  dismissToolbar();
  dismissPopover();

  const sr = getShadow();
  const rect = mark.getBoundingClientRect();

  popoverEl = document.createElement("div");
  popoverEl.id = "marginalia-popover";
  popoverEl.className = "marginalia-popover";
  popoverPosition = {
    left: Math.max(8, rect.left),
    top: rect.bottom + 8,
  };
  syncFloatingPositions();

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
      await chrome.runtime.sendMessage({ type: "UPDATE_HIGHLIGHT", payload: { id, color } });
      mark.dataset.color = color;
      swatchRow.querySelectorAll(".marginalia-pop-swatch").forEach((swatch) => swatch.classList.remove("active"));
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
  popoverEl.appendChild(textarea);

  // Buttons row
  const btnRow = document.createElement("div");
  btnRow.className = "marginalia-pop-row";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "marginalia-pop-btn marginalia-pop-btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "DELETE_HIGHLIGHT", payload: { id } });
    mark.replaceWith(...Array.from(mark.childNodes));
    dismissPopover();
  });

  const saveBtn = document.createElement("button");
  saveBtn.className = "marginalia-pop-btn";
  saveBtn.textContent = "Save note";
  saveBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "UPDATE_HIGHLIGHT", payload: { id, note: textarea.value } });
    dismissPopover();
  });

  btnRow.appendChild(deleteBtn);
  btnRow.appendChild(saveBtn);
  popoverEl.appendChild(btnRow);

  sr.appendChild(popoverEl);
}

// ── Re-paint saved highlights on load ─────────────────────────────
async function repaintHighlights() {
  const response = await chrome.runtime.sendMessage({
    type: "LIST_FOR_URL",
    payload: { url: location.href },
  });
  if (!response?.ok || !Array.isArray(response.data)) return;

  const highlights: SavedHighlight[] = response.data;
  for (const h of highlights) {
    paintHighlight(h);
  }
}

function paintHighlight(h: SavedHighlight) {
  // Find the first text node that contains the highlight text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    // Skip already-painted marks
    if (node.parentElement?.classList.contains("marg-h")) continue;

    const idx = node.textContent?.indexOf(h.text) ?? -1;
    if (idx === -1) continue;

    // Check we haven't already painted this highlight
    if (document.querySelector(`[data-id="${h.id}"]`)) break;

    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + h.text.length);
    wrapRange(range, h.color as HighlightColor, h.id);
    break;
  }
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

// ── Init ───────────────────────────────────────────────────────────
repaintHighlights().catch(() => {});
