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

const HL_BG: Record<HighlightColor, string> = {
  amber: "oklch(90% 0.10 85)",
  rose: "oklch(88% 0.08 20)",
  sage: "oklch(90% 0.07 145)",
  sky: "oklch(90% 0.06 230)",
  violet: "oklch(88% 0.07 305)",
};

// ── Shadow DOM container ───────────────────────────────────────────
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let toolbarEl: HTMLElement | null = null;
let popoverEl: HTMLElement | null = null;

function getShadow(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  shadowHost = document.createElement("div");
  shadowHost.id = "marginalia-host";
  shadowHost.style.cssText = "all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none;";
  document.documentElement.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // Inline the base styles so they work inside Shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .toolbar {
      position: fixed;
      background: oklch(18% 0.01 60);
      border-radius: 10px;
      padding: 5px;
      display: flex;
      align-items: center;
      gap: 3px;
      box-shadow: 0 12px 32px rgba(20,12,4,0.28), 0 2px 6px rgba(20,12,4,0.2);
      pointer-events: all;
      transform: translateY(-8px);
      user-select: none;
    }
    .swatch {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.1s;
    }
    .swatch:hover { transform: scale(1.15); }
    .swatch.active { border-color: rgba(255,255,255,0.7); }
    .divider { width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 2px; }
    .icon-btn {
      width: 28px; height: 28px;
      border-radius: 6px;
      border: none; background: transparent;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      transition: background 0.1s;
      pointer-events: all;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.12); }
    .popover {
      position: fixed;
      background: oklch(98.5% 0.006 85);
      border: 1px solid oklch(88% 0.012 85);
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(50,30,10,0.08), 0 24px 60px rgba(50,30,10,0.12);
      padding: 12px;
      min-width: 220px;
      pointer-events: all;
    }
    .pop-label { font-size: 10px; color: oklch(62% 0.014 60); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-family: monospace; }
    .pop-swatches { display: flex; gap: 5px; margin-bottom: 10px; }
    .pop-swatch { width: 20px; height: 20px; border-radius: 4px; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s; }
    .pop-swatch:hover { transform: scale(1.15); }
    .pop-swatch.active { border-color: oklch(18% 0.01 60); }
    .pop-note { width: 100%; resize: none; border: 1px solid oklch(88% 0.012 85); border-left: 2px solid oklch(62% 0.16 40); border-radius: 6px; padding: 8px 10px; font-size: 12px; line-height: 1.5; color: oklch(32% 0.012 60); font-style: italic; background: oklch(96.5% 0.008 85); outline: none; margin-bottom: 8px; }
    .pop-btn { height: 26px; padding: 0 10px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid oklch(88% 0.012 85); background: transparent; color: oklch(18% 0.01 60); }
    .pop-btn.danger { color: #dc2626; border-color: #fecaca; }
    .pop-btn.danger:hover { background: #fef2f2; }
    .pop-row { display: flex; gap: 6px; justify-content: flex-end; }
  `;
  shadowRoot.appendChild(style);
  return shadowRoot;
}

// ── Toolbar ────────────────────────────────────────────────────────
function showSelectionToolbar(rect: DOMRect, range: Range) {
  dismissToolbar();
  const sr = getShadow();

  toolbarEl = document.createElement("div");
  toolbarEl.className = "toolbar";

  const x = rect.left + rect.width / 2 - 78; // approx center
  const y = rect.top - 46;

  toolbarEl.style.left = `${Math.max(8, x)}px`;
  toolbarEl.style.top = `${Math.max(8, y)}px`;

  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.style.background = HL_BG[color];
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
}

function dismissPopover() {
  popoverEl?.remove();
  popoverEl = null;
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
    mark.className = `marg-h marg-${color}`;
    mark.dataset.id = id;
    mark.dataset.color = color;
    applyMarkStyle(mark, color);
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
      mark.className = `marg-h marg-${color}`;
      mark.dataset.id = id;
      mark.dataset.color = color;
      applyMarkStyle(mark, color);
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

function applyMarkStyle(mark: HTMLElement, color: HighlightColor) {
  mark.style.cssText = `
    background-image: linear-gradient(180deg, transparent 0%, transparent 12%, ${HL_BG[color]} 12%, ${HL_BG[color]} 92%, transparent 92%);
    padding: 1px 1px;
    border-radius: 1px;
    cursor: pointer;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    background-color: transparent;
  `;
}

// ── Edit / delete popover ──────────────────────────────────────────
function showEditPopover(mark: HTMLElement, id: string, currentColor: HighlightColor) {
  dismissToolbar();
  dismissPopover();

  const sr = getShadow();
  const rect = mark.getBoundingClientRect();

  popoverEl = document.createElement("div");
  popoverEl.className = "popover";
  popoverEl.style.left = `${Math.max(8, rect.left)}px`;
  popoverEl.style.top = `${rect.bottom + 8}px`;

  // Color row
  const colorLabel = document.createElement("div");
  colorLabel.className = "pop-label";
  colorLabel.textContent = "Colour";
  popoverEl.appendChild(colorLabel);

  const swatchRow = document.createElement("div");
  swatchRow.className = "pop-swatches";
  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.className = `pop-swatch${color === currentColor ? " active" : ""}`;
    btn.style.background = HL_BG[color];
    btn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "UPDATE_HIGHLIGHT", payload: { id, color } });
      // Update mark
      mark.className = `marg-h marg-${color}`;
      mark.dataset.color = color;
      applyMarkStyle(mark, color);
      swatchRow.querySelectorAll(".pop-swatch").forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
    });
    swatchRow.appendChild(btn);
  }
  popoverEl.appendChild(swatchRow);

  // Note textarea
  const noteLabel = document.createElement("div");
  noteLabel.className = "pop-label";
  noteLabel.textContent = "Note";
  popoverEl.appendChild(noteLabel);

  const textarea = document.createElement("textarea");
  textarea.className = "pop-note";
  textarea.rows = 3;
  textarea.placeholder = "Add a note…";
  popoverEl.appendChild(textarea);

  // Buttons row
  const btnRow = document.createElement("div");
  btnRow.className = "pop-row";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "pop-btn danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "DELETE_HIGHLIGHT", payload: { id } });
    mark.replaceWith(...Array.from(mark.childNodes));
    dismissPopover();
  });

  const saveBtn = document.createElement("button");
  saveBtn.className = "pop-btn";
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
