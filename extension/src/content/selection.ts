import { COLORS } from "./colors";
import { createHighlightFromRange } from "./marks";
import { isHighlightingEnabled } from "./settings";
import { isInsideShadowHost } from "./shadow";
import {
  activeSelectionRange,
  dismissToolbar,
  handleSelectionAction,
  isSelectionToolbarOpen,
  isToolbarOpen,
  showSelectionToolbar,
} from "./toolbar";

const MIN_SELECTION_CHARS = 2;

const ACTION_KEY_MAP: Record<string, "copy" | "note" | "tag" | "copySource"> = {
  y: "copy",
  n: "note",
  t: "tag",
  c: "copySource",
};

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
  if (!isSelectionToolbarOpen()) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const range = activeSelectionRange();
  if (!range) return;

  const numKey = Number(e.key);
  if (Number.isInteger(numKey) && numKey >= 1 && numKey <= COLORS.length) {
    e.preventDefault();
    void createHighlightFromRange(range, COLORS[numKey - 1]);
    dismissToolbar();
    return;
  }

  const action = ACTION_KEY_MAP[e.key.toLowerCase()];
  if (action) {
    e.preventDefault();
    void handleSelectionAction(action);
  }
}

export function attachSelectionListeners() {
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
}
