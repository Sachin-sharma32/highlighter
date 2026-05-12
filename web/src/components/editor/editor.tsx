import { useMemo, useState } from "react";

import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoFocusExtension, ClearEditorExtension } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { CheckListExtension, ListExtension } from "@lexical/list";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextExtension } from "@lexical/rich-text";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { $setBlocksType } from "@lexical/selection";
import { $createCodeNode } from "@lexical/code";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  type EditorState,
  type SerializedEditorState,
  configExtension,
  defineExtension,
} from "lexical";
import {
  $createHeadingNode,
  $createQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  Code as CodeIcon,
  Heading1 as Heading1Icon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  ListTodo as ListTodoIcon,
  Quote as QuoteIcon,
  Type as TypeIcon,
} from "lucide-react";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { CodeHighlightPlugin } from "@/components/editor/plugins/code-highlight-plugin";
import { ComponentPickerMenuPlugin } from "@/components/editor/plugins/component-picker-menu-plugin";
import { BulletedListPickerPlugin } from "@/components/editor/plugins/picker/bulleted-list-picker-plugin";
import { CheckListPickerPlugin } from "@/components/editor/plugins/picker/check-list-picker-plugin";
import { CodePickerPlugin } from "@/components/editor/plugins/picker/code-picker-plugin";
import { HeadingPickerPlugin } from "@/components/editor/plugins/picker/heading-picker-plugin";
import { NumberedListPickerPlugin } from "@/components/editor/plugins/picker/numbered-list-picker-plugin";
import { ParagraphPickerPlugin } from "@/components/editor/plugins/picker/paragraph-picker-plugin";
import { QuotePickerPlugin } from "@/components/editor/plugins/picker/quote-picker-plugin";
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { useToolbarContext } from "@/components/editor/context/toolbar-context";
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@/components/editor/themes/editor-theme.css";

const placeholder = "Type / for commands…";

function ToolbarButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-paper-2 ${
        active ? "bg-paper-2 text-ink" : "text-ink-3"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarButtons() {
  const { activeEditor, blockType } = useToolbarContext();

  function setHeading(level: HeadingTagType) {
    if (blockType === level) {
      setParagraph();
      return;
    }
    activeEditor.focus();
    activeEditor.update(() => {
      const selection = $getSelection();
      const root = $getRoot();
      const anchorKey = $isRangeSelection(selection)
        ? selection.anchor.key
        : null;
      const noUsableSelection =
        !$isRangeSelection(selection) || anchorKey === root.getKey();
      if (noUsableSelection) {
        const heading = $createHeadingNode(level);
        const first = root.getFirstChild();
        if (first && $isElementNode(first) && first.isEmpty()) {
          first.replace(heading);
        } else {
          root.append(heading);
        }
        heading.select();
        return;
      }
      $setBlocksType(selection, () => $createHeadingNode(level));
    });
  }

  function setParagraph() {
    activeEditor.focus();
    activeEditor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }

  function setQuote() {
    if (blockType === "quote") {
      setParagraph();
      return;
    }
    activeEditor.focus();
    activeEditor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  }

  function setCode() {
    if (blockType === "code") {
      setParagraph();
      return;
    }
    activeEditor.focus();
    activeEditor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (selection.isCollapsed()) {
        $setBlocksType(selection, () => $createCodeNode());
      } else {
        const text = selection.getTextContent();
        const node = $createCodeNode();
        selection.insertNodes([node]);
        const next = $getSelection();
        if ($isRangeSelection(next)) next.insertRawText(text);
      }
    });
  }

  function toggleList(type: "bullet" | "number" | "check") {
    if (blockType === type) {
      setParagraph();
      return;
    }
    if (type === "bullet") {
      activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (type === "number") {
      activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      activeEditor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-rule px-3 py-1.5">
      <ToolbarButton
        active={blockType === "paragraph"}
        title="Paragraph"
        onClick={setParagraph}
      >
        <TypeIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "h1"}
        title="Heading 1"
        onClick={() => setHeading("h1")}
      >
        <Heading1Icon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "h2"}
        title="Heading 2"
        onClick={() => setHeading("h2")}
      >
        <Heading2Icon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "h3"}
        title="Heading 3"
        onClick={() => setHeading("h3")}
      >
        <Heading3Icon className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-rule" />
      <ToolbarButton
        active={blockType === "bullet"}
        title="Bulleted list"
        onClick={() => toggleList("bullet")}
      >
        <ListIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "number"}
        title="Numbered list"
        onClick={() => toggleList("number")}
      >
        <ListOrderedIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "check"}
        title="Check list"
        onClick={() => toggleList("check")}
      >
        <ListTodoIcon className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-rule" />
      <ToolbarButton
        active={blockType === "quote"}
        title="Quote"
        onClick={setQuote}
      >
        <QuoteIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === "code"}
        title="Code block"
        onClick={setCode}
      >
        <CodeIcon className="size-4" />
      </ToolbarButton>
    </div>
  );
}

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
}: {
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState;
  onChange?: (editorState: EditorState) => void;
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
}) {
  // Capture the initial state ONCE per mount. The parent should remount via
  // `key` when switching notes — within a single note's editing session we
  // must ignore subsequent prop changes (otherwise live edits get wiped).
  const [initialState] = useState(() => ({
    serialized: editorSerializedState,
    state: editorState,
  }));

  const AppExtension = useMemo(
    () =>
      defineExtension({
        dependencies: [
          RichTextExtension,
          configExtension(ListExtension, { shouldPreserveNumbering: false }),
          CheckListExtension,
          AutoFocusExtension,
          ClearEditorExtension,
          HistoryExtension,
        ],
        name: "@shadcn-editor",
        namespace: "NoteEditor",
        nodes: [CodeNode, CodeHighlightNode],
        $initialEditorState(editor) {
          if (initialState.serialized) {
            const parsed = editor.parseEditorState(initialState.serialized);
            editor.setEditorState(parsed);
          } else if (initialState.state) {
            editor.setEditorState(initialState.state);
          }
        },
        theme: editorTheme,
      }),
    [initialState],
  );

  return (
    <div className="flex h-full w-full flex-col bg-paper">
      <LexicalExtensionComposer extension={AppExtension} contentEditable={null}>
        <TooltipProvider>
          <ToolbarPlugin>{() => <ToolbarButtons />}</ToolbarPlugin>
          <div className="relative flex-1 overflow-y-auto">
            <ContentEditable
              placeholder={placeholder}
              placeholderClassName="px-6 py-4 text-ink-4"
              className="min-h-full px-6 py-4 outline-none"
            />
            <CodeHighlightPlugin />
            <MarkdownShortcutPlugin
              transformers={[UNORDERED_LIST, ORDERED_LIST, CHECK_LIST]}
            />
            <ComponentPickerMenuPlugin
              baseOptions={[
                ParagraphPickerPlugin(),
                HeadingPickerPlugin({ n: 1 }),
                HeadingPickerPlugin({ n: 2 }),
                HeadingPickerPlugin({ n: 3 }),
                NumberedListPickerPlugin(),
                BulletedListPickerPlugin(),
                CheckListPickerPlugin(),
                QuotePickerPlugin(),
                CodePickerPlugin(),
              ]}
            />
          </div>
          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(state) => {
              onChange?.(state);
              onSerializedChange?.(state.toJSON());
            }}
          />
        </TooltipProvider>
      </LexicalExtensionComposer>
    </div>
  );
}
