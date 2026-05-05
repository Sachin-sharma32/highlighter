import { COLORS } from "./colors";
import { createHighlightFromRange } from "./marks";
import { isHighlightingEnabled } from "./settings";
import { isInsideShadowHost } from "./shadow";
import {
  activeSelectionRange,
  dismissToolbar,
  isToolbarOpen,
  showSelectionToolbar,
} from "./toolbar";

const MIN_SELECTION_CHARS = 2;

function onMouseUp(e: MouseEvent) {
  if (isInsideShadowHost(e.target)) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    dismissToolbar();
    return;
  }
  const text = sel.toString().trim();
  if (text.length < MIN_SELECTION_CHARS) {
    dismissToolbar();
    return;
  }

  if (!isHighlightingEnabled()) return;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showSelectionToolbar(rect, range.cloneRange());
}

function onMouseDown(e: MouseEvent) {
  if (!isInsideShadowHost(e.target)) {
    dismissToolbar();
  }
}

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest?.("input, textarea, [contenteditable='true']")) return;
  if (!isToolbarOpen()) return;

  const range = activeSelectionRange();
  if (!range) return;

  const index = Number(e.key) - 1;
  if (index < 0 || index >= COLORS.length) return;

  e.preventDefault();
  void createHighlightFromRange(range, COLORS[index]);
  dismissToolbar();
}

export function attachSelectionListeners() {
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
}
