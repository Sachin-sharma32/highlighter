import {
  $createParagraphNode,
  $isElementNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
  type SerializedElementNode,
} from "lexical";

import { $isCollapsibleContainerNode } from "./collapsible-container-node";
import { $isCollapsibleContentNode } from "./collapsible-content-node";

export type SerializedCollapsibleTitleNode = SerializedElementNode;

export function $convertSummaryElement(): DOMConversionOutput | null {
  const node = $createCollapsibleTitleNode();
  return { node };
}

/** The clickable header row of a toggle list — rendered as `<summary>`. */
export class CollapsibleTitleNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return "collapsible-title";
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("summary");
    dom.classList.add("Collapsible__title");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLElement> | null {
    return {
      summary: () => ({
        conversion: $convertSummaryElement,
        priority: 1,
      }),
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleTitleNode,
  ): CollapsibleTitleNode {
    return $createCollapsibleTitleNode().updateFromJSON(serializedNode);
  }

  // Pressing Enter inside the title moves the caret into the body (creating
  // the first paragraph if the body is empty), opening the toggle if needed.
  insertNewAfter(
    _selection: RangeSelection,
    restoreSelection = true,
  ): LexicalNode {
    const containerNode = this.getParentOrThrow();
    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error(
        "CollapsibleTitleNode expects to be a child of CollapsibleContainerNode",
      );
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling();
      if (!$isCollapsibleContentNode(contentNode)) {
        throw new Error(
          "CollapsibleTitleNode expects to have a CollapsibleContentNode sibling",
        );
      }
      const firstChild = contentNode.getFirstChild();
      if ($isElementNode(firstChild)) {
        return firstChild;
      }
      const paragraph = $createParagraphNode();
      contentNode.append(paragraph);
      return paragraph;
    }

    const paragraph = $createParagraphNode();
    containerNode.insertAfter(paragraph, restoreSelection);
    return paragraph;
  }

  // Backspace at the very start of the title removes / unwraps the toggle.
  collapseAtStart(): boolean {
    return $collapseCollapsibleAtStart(this);
  }
}

/**
 * Backspace at the very start of a toggle's title. A fully empty toggle is
 * deleted outright (leaving a single empty paragraph in its place); otherwise
 * the toggle is unwrapped — the title text becomes a paragraph and the body
 * blocks follow it, so nothing is lost.
 */
export function $collapseCollapsibleAtStart(
  title: CollapsibleTitleNode,
): boolean {
  const container = title.getParent();
  if (!$isCollapsibleContainerNode(container)) {
    return false;
  }
  const content = title.getNextSibling();
  const titleEmpty = title.getTextContent().trim() === "";
  const contentEmpty = $isCollapsibleContentNode(content)
    ? content.getChildren().every((b) => b.getTextContent().trim() === "")
    : true;

  if (titleEmpty && contentEmpty) {
    const paragraph = $createParagraphNode();
    container.replace(paragraph);
    paragraph.selectStart();
    return true;
  }

  const titleParagraph = $createParagraphNode();
  for (const child of title.getChildren()) {
    titleParagraph.append(child);
  }
  container.insertBefore(titleParagraph);
  let cursor: LexicalNode = titleParagraph;
  if ($isCollapsibleContentNode(content)) {
    for (const block of content.getChildren()) {
      cursor.insertAfter(block);
      cursor = block;
    }
  }
  container.remove();
  titleParagraph.selectStart();
  return true;
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}
