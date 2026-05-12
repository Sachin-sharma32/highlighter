import type { SerializedEditorState, SerializedLexicalNode } from "lexical";

type WithChildren = SerializedLexicalNode & {
  children?: SerializedLexicalNode[];
  text?: string;
};

function textOf(node: WithChildren): string {
  if (typeof node.text === "string") return node.text;
  if (!node.children) return "";
  return node.children.map((c) => textOf(c as WithChildren)).join("");
}

export function firstLineFromContent(
  source: SerializedEditorState | string | null | undefined,
): string {
  if (!source) return "";
  let state: SerializedEditorState | undefined;
  if (typeof source === "string") {
    try {
      state = JSON.parse(source) as SerializedEditorState;
    } catch {
      const trimmed = source.trim();
      return trimmed.split("\n")[0]?.slice(0, 200) ?? "";
    }
  } else {
    state = source;
  }
  const children = (state?.root as WithChildren | undefined)?.children ?? [];
  for (const block of children) {
    const text = textOf(block as WithChildren).trim();
    if (text) return text.slice(0, 200);
  }
  return "";
}

export function previewFromContent(
  source: string | null | undefined,
  maxBlocks = 3,
): string {
  if (!source) return "";
  let state: SerializedEditorState | undefined;
  try {
    state = JSON.parse(source) as SerializedEditorState;
  } catch {
    return source.slice(0, 300);
  }
  const children = (state?.root as WithChildren | undefined)?.children ?? [];
  const parts: string[] = [];
  for (const block of children) {
    const text = textOf(block as WithChildren).trim();
    if (text) parts.push(text);
    if (parts.length >= maxBlocks) break;
  }
  return parts.join(" · ");
}
