import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import {
  clearToolbarPositionRule,
  getShadow,
  setToolbarPositionRule,
} from "./shadow";
import { getAllColors, resolveDefaultColor } from "./colors";
import {
  getCachedCollections,
  getLastUsedCollectionId,
  persistLastCollection,
  refreshCollections,
} from "./settings";
import {
  applyMarkColor,
  createHighlightFromRange,
  getMarkById,
  readTags,
  unwrapMarksById,
  writeCollectionIds,
  writeTags,
} from "./marks";
import { deleteHighlightMessage, updateHighlightMessage } from "./api";
import {
  SelectionToolbar,
  type SelectionActionKey,
} from "./components/SelectionToolbar";
import { EditCard } from "./components/EditCard";

const TOOLBAR_ID = "marginalia-toolbar";
const CARD_WIDTH = 260;
const VIEWPORT_BOTTOM_INSET = 320;
const VIEWPORT_EDGE_INSET = 8;
const TOOLBAR_OFFSET = 8;
const COPIED_FEEDBACK_MS = 700;

type Anchor =
  | { kind: "range"; range: Range }
  | { kind: "mark"; mark: HTMLElement };

let host: HTMLElement | null = null;
let root: Root | null = null;
let anchor: Anchor | null = null;
let positionFrame: number | null = null;
let onAfterDismiss: (() => void) | null = null;
let copiedState = false;
let copiedTimer: number | null = null;

function positionToolbarForRect(rect: DOMRect) {
  const left = Math.max(
    VIEWPORT_EDGE_INSET,
    Math.min(
      rect.left + rect.width / 2 - CARD_WIDTH / 2,
      window.innerWidth - CARD_WIDTH - VIEWPORT_EDGE_INSET,
    ),
  );
  const top = Math.min(
    rect.bottom + TOOLBAR_OFFSET,
    window.innerHeight - VIEWPORT_BOTTOM_INSET,
  );
  setToolbarPositionRule(left, top);
}

function reposition() {
  if (!host || !anchor) return;
  if (anchor.kind === "range") {
    const rect = anchor.range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      dismissToolbar();
      return;
    }
    positionToolbarForRect(rect);
  } else {
    const rect = anchor.mark.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      dismissToolbar();
      return;
    }
    positionToolbarForRect(rect);
  }
}

export function scheduleToolbarPosition() {
  if (!host || positionFrame != null) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = null;
    reposition();
  });
}

function mountHost(extraClass: string) {
  dismissToolbar();
  const sr = getShadow();
  host = document.createElement("div");
  host.id = TOOLBAR_ID;
  host.className = `marginalia-card ${extraClass}`;
  sr.appendChild(host);
  root = createRoot(host);
  return sr;
}

export function dismissToolbar() {
  onAfterDismiss?.();
  onAfterDismiss = null;

  if (copiedTimer != null) {
    window.clearTimeout(copiedTimer);
    copiedTimer = null;
  }
  copiedState = false;

  root?.unmount();
  root = null;
  host?.remove();
  host = null;
  anchor = null;

  if (positionFrame != null) {
    cancelAnimationFrame(positionFrame);
    positionFrame = null;
  }
  clearToolbarPositionRule();
}

function renderSelectionToolbar() {
  if (!root || anchor?.kind !== "range") return;
  const range = anchor.range;
  root.render(
    createElement(SelectionToolbar, {
      text: range.toString(),
      colors: getAllColors(),
      copied: copiedState,
      onSaveColor: (color) => {
        void createHighlightFromRange(range, color);
        dismissToolbar();
      },
      onAction: (key) => {
        void handleSelectionAction(key);
      },
    }),
  );
}

export function showSelectionToolbar(rect: DOMRect, range: Range) {
  mountHost("marginalia-toolbar-card");
  if (!root) return;
  anchor = { kind: "range", range };
  positionToolbarForRect(rect);
  renderSelectionToolbar();
}

function showCopiedFeedback() {
  copiedState = true;
  renderSelectionToolbar();
  if (copiedTimer != null) window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    copiedTimer = null;
    dismissToolbar();
  }, COPIED_FEEDBACK_MS);
}

export async function handleSelectionAction(key: SelectionActionKey) {
  if (!anchor || anchor.kind !== "range") return;
  const range = anchor.range;
  const text = range.toString();

  switch (key) {
    case "copy":
      void navigator.clipboard.writeText(text).catch(() => {});
      showCopiedFeedback();
      break;
    case "copySource": {
      const md = `> ${text}\n\n— ${document.title} (${location.href})`;
      void navigator.clipboard.writeText(md).catch(() => {});
      showCopiedFeedback();
      break;
    }
    case "note":
    case "tag":
      await saveAndShowEdit(range, key);
      break;
  }
}

async function saveAndShowEdit(range: Range, focus: "note" | "tag") {
  await refreshCollections();
  const id = await createHighlightFromRange(range, resolveDefaultColor());
  if (!id) return;
  const mark = getMarkById(id);
  if (!mark) return;
  const lastUsed = getLastUsedCollectionId();
  showEditCardForMark(mark, focus, lastUsed ? [lastUsed] : []);
}

export async function openEditCardFromMark(mark: HTMLElement) {
  const id = mark.dataset.id ?? "";
  if (!id || id === "pending") return;
  await refreshCollections();
  showEditCardForMark(mark, "note", readTags(mark.dataset.collectionIds));
}

function showEditCardForMark(
  mark: HTMLElement,
  focus: "note" | "tag",
  initialCollectionIds: string[],
) {
  const id = mark.dataset.id ?? "";
  if (!id || id === "pending") return;

  const sr = mountHost("marginalia-edit-card");
  if (!root) return;
  anchor = { kind: "mark", mark };
  positionToolbarForRect(mark.getBoundingClientRect());

  const initialColor = mark.dataset.color ?? "amber";
  const initialNote = mark.dataset.note ?? "";
  const initialTags = readTags(mark.dataset.tags);

  root.render(
    createElement(EditCard, {
      initialColor,
      initialNote,
      initialTags,
      initialCollectionIds,
      colors: getAllColors(),
      collections: getCachedCollections(),
      shadowContainer: sr as unknown as HTMLElement,
      focus,
      onColorChange: (color) => {
        applyMarkColor(mark, color);
        updateHighlightMessage({ id, color });
      },
      onNoteCommit: (note) => {
        mark.dataset.note = note;
        updateHighlightMessage({ id, note });
      },
      onTagsChange: (tags) => {
        writeTags(mark, tags);
        updateHighlightMessage({ id, tags });
      },
      onCollectionsChange: (ids) => {
        writeCollectionIds(mark, ids);
        if (ids.length) void persistLastCollection(ids[ids.length - 1]);
        updateHighlightMessage({ id, collectionIds: ids });
      },
      onDelete: () => {
        deleteHighlightMessage(id);
        unwrapMarksById(id);
        dismissToolbar();
      },
      onClose: dismissToolbar,
    }),
  );
}

export function isToolbarOpen() {
  return host != null;
}

export function isSelectionToolbarOpen() {
  return host != null && anchor?.kind === "range";
}

export function activeSelectionRange(): Range | null {
  return anchor?.kind === "range" ? anchor.range : null;
}
