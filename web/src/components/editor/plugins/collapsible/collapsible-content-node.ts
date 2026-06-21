import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
} from "lexical";

export type SerializedCollapsibleContentNode = SerializedElementNode;

export function $convertCollapsibleContentElement(): DOMConversionOutput | null {
  const node = $createCollapsibleContentNode();
  return { node };
}

/** The body of a toggle list — holds the blocks revealed when it is open. */
export class CollapsibleContentNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return "collapsible-content";
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("Collapsible__content");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDivElement> | null {
    return {
      div: (domNode: HTMLDivElement) => {
        if (!domNode.hasAttribute("data-lexical-collapsible-content")) {
          return null;
        }
        return {
          conversion: $convertCollapsibleContentElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.classList.add("Collapsible__content");
    element.setAttribute("data-lexical-collapsible-content", "true");
    return { element };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContentNode,
  ): CollapsibleContentNode {
    return $createCollapsibleContentNode().updateFromJSON(serializedNode);
  }

  isShadowRoot(): boolean {
    return true;
  }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}
