import { findAnchoredRange, rangeOffsets } from "./anchor";
import { resolveHighlightFill } from "./colors";
import { listHighlightsForUrl, saveHighlightMessage } from "./api";
import { getLastUsedCollectionId } from "./settings";
import { stripMarginaliaTarget } from "../lib/urls";
import type { SaveHighlightPayload } from "../lib/messages";

export const MARK_CLASS = "marg-h";
const FOCUSED_CLASS = "marginalia-focused";
const REPAINT_RETRY_MS = 500;

export interface SavedHighlight {
  _id: string;
  text: string;
  textContext?: string;
  anchorPrefix?: string;
  anchorSuffix?: string;
  anchorStart?: number;
  anchorEnd?: number;
  color: string;
  note?: string;
  tags?: string[];
}

let savedHighlights: SavedHighlight[] = [];
let repaintPromise: Promise<void> | null = null;
let repaintRetryTimer: number | null = null;
let onMarkClick: ((mark: HTMLElement) => void) | null = null;

export function setMarkClickHandler(fn: (mark: HTMLElement) => void) {
  onMarkClick = fn;
}

export function readTags(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag) => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeTags(mark: HTMLElement, tags: string[]) {
  mark.dataset.tags = JSON.stringify(tags);
}

export function writeCollectionIds(mark: HTMLElement, ids: string[]) {
  if (ids.length) mark.dataset.collectionIds = JSON.stringify(ids);
  else delete mark.dataset.collectionIds;
}

export function applyMarkColor(mark: HTMLElement, color: string) {
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

function attachMarkClick(mark: HTMLElement) {
  mark.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = mark.dataset.id ?? "";
    if (!id || id === "pending") return;
    onMarkClick?.(mark);
  });
}

export function wrapRange(
  range: Range,
  color: string,
  id: string,
  note?: string,
  tags: string[] = [],
  collectionIds: string[] = [],
) {
  const create = () => {
    const mark = document.createElement("mark");
    mark.className = `${MARK_CLASS} marginalia-mark`;
    mark.dataset.id = id;
    applyMarkColor(mark, color);
    if (note) mark.dataset.note = note;
    writeTags(mark, tags);
    writeCollectionIds(mark, collectionIds);
    return mark;
  };

  try {
    const mark = create();
    range.surroundContents(mark);
    attachMarkClick(mark);
  } catch {
    try {
      const fragment = range.extractContents();
      const mark = create();
      mark.appendChild(fragment);
      range.insertNode(mark);
      attachMarkClick(mark);
    } catch {
      /* range is too complex */
    }
  }
}

function findMarkById(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `mark.${MARK_CLASS}[data-id="${CSS.escape(id)}"]`,
  );
}

function findAllMarksById(id: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(
    `mark.${MARK_CLASS}[data-id="${CSS.escape(id)}"]`,
  );
}

export function promotePendingMarks(newId: string) {
  document
    .querySelectorAll<HTMLElement>(`mark.${MARK_CLASS}[data-id="pending"]`)
    .forEach((m) => {
      m.dataset.id = newId;
    });
}

export function getMarkById(id: string) {
  return findMarkById(id);
}

export function unwrapMarksById(id: string) {
  findAllMarksById(id).forEach((m) =>
    m.replaceWith(...Array.from(m.childNodes)),
  );
}

function paintHighlight(h: SavedHighlight) {
  if (document.querySelector(`[data-id="${h._id}"]`)) return;
  const range = findAnchoredRange(h);
  if (!range) return;
  wrapRange(range, h.color, h._id, h.note, h.tags ?? []);
}

export async function repaintHighlights() {
  if (repaintPromise) return repaintPromise;

  repaintPromise = (async () => {
    const data = await listHighlightsForUrl(
      stripMarginaliaTarget(location.href),
    );
    if (!data) return;
    savedHighlights = data as SavedHighlight[];
    for (const h of savedHighlights) paintHighlight(h);
  })().finally(() => {
    repaintPromise = null;
  });

  return repaintPromise;
}

function hasUnpaintedHighlights() {
  return savedHighlights.some(
    (h) => !document.querySelector(`[data-id="${h._id}"]`),
  );
}

export function scheduleRepaintRetry() {
  if (
    !savedHighlights.length ||
    !hasUnpaintedHighlights() ||
    repaintRetryTimer != null
  )
    return;
  repaintRetryTimer = window.setTimeout(() => {
    repaintRetryTimer = null;
    void repaintHighlights();
  }, REPAINT_RETRY_MS);
}

interface CreateHighlightOptions {
  note?: string;
  collectionId?: string | null;
  tags?: string[];
}

const ANCHOR_AFFIX_LEN = 100;
const TEXT_CONTEXT_LEN = 200;

export async function createHighlightFromRange(
  range: Range,
  color: string,
  options: CreateHighlightOptions = {},
): Promise<string | null> {
  const text = range.toString().trim();
  if (!text) return null;

  const offsets = rangeOffsets(range);
  const container = range.commonAncestorContainer;
  const parent =
    container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as Element);
  const textContext =
    parent?.textContent?.slice(0, TEXT_CONTEXT_LEN) ?? undefined;

  wrapRange(range, color, "pending", options.note, options.tags ?? []);

  const lastUsed = getLastUsedCollectionId();
  const collectionIds =
    options.collectionId === null
      ? undefined
      : options.collectionId
        ? [options.collectionId]
        : lastUsed
          ? [lastUsed]
          : undefined;

  const payload: SaveHighlightPayload = {
    url: stripMarginaliaTarget(location.href),
    title: document.title,
    text,
    textContext,
    anchorPrefix: offsets?.documentText.slice(
      Math.max(0, offsets.start - ANCHOR_AFFIX_LEN),
      offsets.start,
    ),
    anchorSuffix: offsets?.documentText.slice(
      offsets.end,
      offsets.end + ANCHOR_AFFIX_LEN,
    ),
    anchorStart: offsets?.start,
    anchorEnd: offsets?.end,
    color,
    note: options.note,
    collectionIds,
    tags: options.tags,
  };

  const id = await saveHighlightMessage(payload);
  if (id) promotePendingMarks(id);
  return id;
}

export async function focusHighlight(id: string): Promise<boolean> {
  let mark = findMarkById(id);
  if (!mark) {
    await repaintHighlights();
    mark = findMarkById(id);
  }
  if (!mark) return false;

  mark.scrollIntoView({ behavior: "smooth", block: "center" });
  mark.classList.remove(FOCUSED_CLASS);
  // restart animation
  void mark.offsetWidth;
  mark.classList.add(FOCUSED_CLASS);
  return true;
}
