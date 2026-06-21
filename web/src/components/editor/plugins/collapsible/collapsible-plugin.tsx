import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalNode,
} from "lexical";

import { INSERT_COLLAPSIBLE_COMMAND } from "./insert-collapsible-command";
import {
  $createCollapsibleContainerNode,
  $isCollapsibleContainerNode,
  CollapsibleContainerNode,
} from "./collapsible-container-node";
import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
  CollapsibleContentNode,
} from "./collapsible-content-node";
import {
  $collapseCollapsibleAtStart,
  $createCollapsibleTitleNode,
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from "./collapsible-title-node";

export function CollapsiblePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (
      !editor.hasNodes([
        CollapsibleContainerNode,
        CollapsibleTitleNode,
        CollapsibleContentNode,
      ])
    ) {
      throw new Error(
        "CollapsiblePlugin: CollapsibleContainerNode, CollapsibleTitleNode, or CollapsibleContentNode is not registered on the editor",
      );
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_COLLAPSIBLE_COMMAND,
        () => {
          const title = $createCollapsibleTitleNode();
          const content = $createCollapsibleContentNode();
          content.append($createParagraphNode());
          const container = $createCollapsibleContainerNode(true);
          container.append(title, content);

          // Drop the toggle in place without leaving blank lines around it:
          // reuse the current empty line if there is one, otherwise insert
          // right after the current block (no trailing paragraph is added).
          const selection = $getSelection();
          const block = $isRangeSelection(selection)
            ? selection.anchor.getNode().getTopLevelElement()
            : null;
          if (block !== null && $isParagraphNode(block) && block.isEmpty()) {
            block.replace(container);
          } else if (block !== null) {
            block.insertAfter(container);
          } else {
            $insertNodeToNearestRoot(container);
          }
          title.select();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),

      // Backspace at the start of a toggle's title removes/unwraps it. We do
      // this explicitly (rather than relying on collapseAtStart) because the
      // core deletion path doesn't reach an empty title reliably.
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }
          if (selection.anchor.offset !== 0) {
            return false;
          }
          const node = selection.anchor.getNode();
          const title = $isCollapsibleTitleNode(node)
            ? node
            : $findMatchingParent(node, $isCollapsibleTitleNode);
          if (!$isCollapsibleTitleNode(title)) {
            return false;
          }
          event?.preventDefault();
          return $collapseCollapsibleAtStart(title);
        },
        COMMAND_PRIORITY_HIGH,
      ),

      // Enter on an empty last line of a toggle's body exits the toggle into a
      // fresh paragraph after it — so a toggle at the end of a note isn't a dead
      // end now that we no longer leave a trailing blank paragraph on insert.
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }
          let block: LexicalNode | null = selection.anchor.getNode();
          while (
            block !== null &&
            !$isCollapsibleContentNode(block.getParent())
          ) {
            block = block.getParent();
          }
          if (
            block === null ||
            !$isParagraphNode(block) ||
            !block.isEmpty() ||
            block.getNextSibling() !== null
          ) {
            return false;
          }
          const content = block.getParent();
          const container = content ? content.getParent() : null;
          if (!$isCollapsibleContainerNode(container)) {
            return false;
          }
          if (event) {
            event.preventDefault();
          }
          const paragraph = $createParagraphNode();
          container.insertAfter(paragraph);
          // Drop the now-redundant empty body line unless it's the body's only
          // child (a toggle must keep at least one block).
          if (block.getPreviousSibling() !== null) {
            block.remove();
          }
          paragraph.selectStart();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),

      // Keep the structure valid: a container must hold exactly a title
      // followed by a content node, otherwise the markup breaks.
      editor.registerNodeTransform(CollapsibleContainerNode, (node) => {
        const children = node.getChildren();
        if (children.length === 0) {
          node.remove();
          return;
        }
        const [first, second, ...rest] = children;
        if (!$isCollapsibleTitleNode(first)) {
          node.splice(0, 0, [$createCollapsibleTitleNode()]);
          return;
        }
        if (!$isCollapsibleContentNode(second)) {
          const content = $createCollapsibleContentNode();
          content.append($createParagraphNode());
          first.insertAfter(content);
          return;
        }
        // Drop anything beyond the expected title + content pair.
        for (const extra of rest) {
          extra.remove();
        }
      }),

      // A title or content node that lost its container is unwrapped so it
      // never renders as a stray <summary>/<div> outside a toggle.
      editor.registerNodeTransform(CollapsibleTitleNode, (node) => {
        const parent = node.getParent();
        if (!$isCollapsibleContainerNode(parent)) {
          const paragraph = $createParagraphNode();
          for (const child of node.getChildren()) {
            paragraph.append(child);
          }
          node.replace(paragraph);
        }
      }),

      editor.registerNodeTransform(CollapsibleContentNode, (node) => {
        const parent = node.getParent();
        if (!$isCollapsibleContainerNode(parent)) {
          for (const child of node.getChildren()) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),
    );
  }, [editor]);

  return null;
}
