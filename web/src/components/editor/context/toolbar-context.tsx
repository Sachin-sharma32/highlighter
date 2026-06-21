/* eslint-disable react-refresh/only-export-components */
import { type JSX, createContext, useContext } from "react";

import type { LexicalEditor } from "lexical";

const Context = createContext<{
  activeEditor: LexicalEditor;
  $updateToolbar: () => void;
  blockType: string;
  setBlockType: (blockType: string) => void;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  showModal: (
    title: string,
    showModal: (onClose: () => void) => JSX.Element,
  ) => void;
}>({
  activeEditor: {} as LexicalEditor,
  $updateToolbar: () => {},
  blockType: "paragraph",
  setBlockType: () => {},
  isBold: false,
  isItalic: false,
  isUnderline: false,
  showModal: () => {},
});

export function ToolbarContext({
  activeEditor,
  $updateToolbar,
  blockType,
  setBlockType,
  isBold,
  isItalic,
  isUnderline,
  showModal,
  children,
}: {
  activeEditor: LexicalEditor;
  $updateToolbar: () => void;
  blockType: string;
  setBlockType: (blockType: string) => void;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  showModal: (
    title: string,
    showModal: (onClose: () => void) => JSX.Element,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <Context.Provider
      value={{
        activeEditor,
        $updateToolbar,
        blockType,
        setBlockType,
        isBold,
        isItalic,
        isUnderline,
        showModal,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useToolbarContext() {
  return useContext(Context);
}
