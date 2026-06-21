import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
} from "lexical";

export type SerializedCollapsibleContainerNode = Spread<
  { open: boolean },
  SerializedElementNode
>;

export function $convertDetailsElement(
  domNode: HTMLDetailsElement,
): DOMConversionOutput | null {
  const isOpen = domNode.open !== undefined ? domNode.open : true;
  const node = $createCollapsibleContainerNode(isOpen);
  return { node };
}

/**
 * A Notion-style toggle list. Renders as a native `<details>` element so the
 * browser handles the open/closed disclosure for free; we only mirror the
 * `open` flag into the editor state so it survives serialization.
 */
export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  static getType(): string {
    return "collapsible-container";
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement("details");
    dom.classList.add("Collapsible__container");
    dom.open = this.__open;
    // Keep the editor state in sync when the native disclosure is toggled.
    dom.addEventListener("toggle", () => {
      const open = editor.getEditorState().read(() => this.getOpen());
      if (open !== dom.open) {
        editor.update(() => this.toggleOpen());
      }
    });
    // Only toggle when the disclosure marker (left edge) is clicked; clicking
    // the title text should place the caret for editing instead of collapsing.
    dom.addEventListener("click", (event) => {
      const summary = (event.target as HTMLElement).closest("summary");
      if (summary === null || summary.parentElement !== dom) {
        return;
      }
      const rect = summary.getBoundingClientRect();
      if (event.clientX - rect.left > 28) {
        event.preventDefault();
      }
    });
    return dom;
  }

  updateDOM(
    prevNode: CollapsibleContainerNode,
    dom: HTMLDetailsElement,
  ): boolean {
    if (prevNode.__open !== this.__open) {
      dom.open = this.__open;
    }
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
    return {
      details: () => ({
        conversion: $convertDetailsElement,
        priority: 1,
      }),
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(serializedNode.open).updateFromJSON(
      serializedNode,
    );
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedCollapsibleContainerNode>,
  ): this {
    return super.updateFromJSON(serializedNode).setOpen(serializedNode.open);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("details");
    element.classList.add("Collapsible__container");
    element.setAttribute("open", this.__open.toString());
    return { element };
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
    };
  }

  setOpen(open: boolean): this {
    const writable = this.getWritable();
    writable.__open = open;
    return writable;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(
  isOpen: boolean,
): CollapsibleContainerNode {
  return $applyNodeReplacement(new CollapsibleContainerNode(isOpen));
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}
