import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import { $createParagraphNode, COMMAND_PRIORITY_LOW } from "lexical";

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
          $insertNodeToNearestRoot(container);
          title.select();
          return true;
        },
        COMMAND_PRIORITY_LOW,
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
