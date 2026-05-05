const SKIP_SELECTOR =
  "#marginalia-host, script, style, noscript, textarea, input, select";

const ANCHOR_AFFIX_LEN = 120;
const POSITION_SCORE_DECAY = 8;
const POSITION_SCORE_MAX = 80;

export interface AnchoredHighlight {
  text: string;
  textContext?: string;
  anchorPrefix?: string;
  anchorSuffix?: string;
  anchorStart?: number;
  anchorEnd?: number;
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest(SKIP_SELECTOR));
}

function collectTextNodes(): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (shouldSkipTextNode(node as Text)) return NodeFilter.FILTER_REJECT;
        return node.textContent
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
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

export function rangeOffsets(range: Range) {
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

function rangeFromOffsets(start: number, end: number): Range | null {
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

export function findAnchoredRange(h: AnchoredHighlight): Range | null {
  const snapshot = documentTextSnapshot();

  if (
    typeof h.anchorStart === "number" &&
    typeof h.anchorEnd === "number" &&
    snapshot.text.slice(h.anchorStart, h.anchorEnd) === h.text
  ) {
    return rangeFromOffsets(h.anchorStart, h.anchorEnd);
  }

  const textContextIndex = h.textContext?.indexOf(h.text) ?? -1;
  const legacyPrefix =
    textContextIndex >= 0
      ? h.textContext?.slice(0, textContextIndex)
      : undefined;
  const legacySuffix =
    textContextIndex >= 0
      ? h.textContext?.slice(textContextIndex + h.text.length)
      : undefined;

  const candidates: { start: number; end: number; score: number }[] = [];
  let from = 0;
  while (from <= snapshot.text.length) {
    const start = snapshot.text.indexOf(h.text, from);
    if (start === -1) break;
    const end = start + h.text.length;
    const before = snapshot.text.slice(
      Math.max(0, start - ANCHOR_AFFIX_LEN),
      start,
    );
    const after = snapshot.text.slice(end, end + ANCHOR_AFFIX_LEN);
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
    const positionScore =
      typeof h.anchorStart === "number"
        ? Math.max(
            0,
            POSITION_SCORE_MAX -
              Math.abs(start - h.anchorStart) / POSITION_SCORE_DECAY,
          )
        : 0;
    candidates.push({
      start,
      end,
      score: prefixScore + suffixScore + positionScore,
    });
    from = start + Math.max(1, h.text.length);
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    const range = rangeFromOffsets(candidate.start, candidate.end);
    if (range) return range;
  }
  return null;
}
