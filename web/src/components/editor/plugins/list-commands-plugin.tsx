import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import { $handleListInsertParagraph, $isListItemNode } from "@lexical/list";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
} from "lexical";

/**
 * Notion-style backspace for lists.
 *
 * Out of the box, pressing Backspace on an empty bullet/numbered item merges it
 * into the previous line. Instead we want the bullet/number itself to be
 * removed in place: a top-level empty item becomes a plain paragraph, and a
 * nested empty item is outdented one level — without moving the caret up.
 *
 * `$handleListInsertParagraph` is the same routine Lexical runs when you press
 * Enter on an empty list item, which already implements exactly this behavior;
 * we just trigger it on Backspace as well.
 */
export function ListCommandsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        if (selection.anchor.offset !== 0) {
          return false;
        }
        const anchorNode = selection.anchor.getNode();
        const inListItem =
          $isListItemNode(anchorNode) ||
          $findMatchingParent(anchorNode, $isListItemNode) !== null;
        if (!inListItem) {
          return false;
        }
        // Only fires for empty items; falls back to default deletion otherwise.
        if ($handleListInsertParagraph()) {
          event?.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
