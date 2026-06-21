import { useCallback, useEffect, useState } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { ToolbarContext } from "@/components/editor/context/toolbar-context";
import { useEditorModal } from "@/components/editor/editor-hooks/use-modal";

export function ToolbarPlugin({
  children,
}: {
  children: (props: { blockType: string }) => React.ReactNode;
}) {
  const [editor] = useLexicalComposerContext();

  const [activeEditor, setActiveEditor] = useState(editor);
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const [modal, showModal] = useEditorModal();

  // Reflect the current selection's inline formatting in the toolbar so the
  // Bold/Italic/Underline buttons highlight when active (whether toggled via
  // the buttons or via keyboard shortcuts like Cmd/Ctrl+B).
  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
    }
  }, []);

  useEffect(() => {
    return activeEditor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return activeEditor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => $updateToolbar());
    });
  }, [activeEditor, $updateToolbar]);

  return (
    <ToolbarContext
      activeEditor={activeEditor}
      $updateToolbar={$updateToolbar}
      blockType={blockType}
      setBlockType={setBlockType}
      isBold={isBold}
      isItalic={isItalic}
      isUnderline={isUnderline}
      showModal={showModal}
    >
      {modal}

      {children({ blockType })}
    </ToolbarContext>
  );
}
