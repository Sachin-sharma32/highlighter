import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { $isLinkNode, type LinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor,
} from "lexical";
import { Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";

import { normalizeUrl } from "@/components/editor/plugins/link/insert-link-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The LinkNode the current selection sits inside, if any. */
function $getSelectedLinkNode(): LinkNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const node = selection.anchor.getNode();
  if ($isLinkNode(node)) return node;
  const parent = $findMatchingParent(node, $isLinkNode);
  return $isLinkNode(parent) ? parent : null;
}

function FloatingLinkEditor({
  editor,
  anchorElem,
}: {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
}) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState("");
  const [editedText, setEditedText] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // Key of the link being edited, captured during the editor read so the
  // commit step can re-find the same node even if the selection has moved.
  const linkKeyRef = useRef<string | null>(null);

  const updateLinkEditor = useCallback(() => {
    let key: string | null = null;
    let url = "";
    let text = "";
    editor.getEditorState().read(() => {
      const linkNode = $getSelectedLinkNode();
      if (linkNode) {
        key = linkNode.getKey();
        url = linkNode.getURL();
        text = linkNode.getTextContent();
      }
    });

    if (key == null) {
      setIsLink(false);
      setEditing(false);
      linkKeyRef.current = null;
      return;
    }

    linkKeyRef.current = key;
    setIsLink(true);
    setLinkUrl(url);

    const linkEl = editor.getElementByKey(key);
    if (linkEl) {
      const rect = linkEl.getBoundingClientRect();
      const anchorRect = anchorElem.getBoundingClientRect();
      setPos({
        top: rect.bottom - anchorRect.top + anchorElem.scrollTop + 6,
        left: rect.left - anchorRect.left + anchorElem.scrollLeft,
      });
    }
    // Seed the edit fields whenever we re-anchor to a (possibly different) link
    // and aren't mid-edit, so opening the editor shows the current values.
    setEditedUrl((prev) => (editing ? prev : url));
    setEditedText((prev) => (editing ? prev : text));
  }, [editor, anchorElem, editing]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateLinkEditor();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (editing) {
            setEditing(false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, updateLinkEditor, editing]);

  // Reposition the popup as the editor scrolls.
  useEffect(() => {
    if (!isLink) return;
    const onScroll = () => updateLinkEditor();
    anchorElem.addEventListener("scroll", onScroll);
    return () => anchorElem.removeEventListener("scroll", onScroll);
  }, [isLink, anchorElem, updateLinkEditor]);

  useEffect(() => {
    if (editing) urlInputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setEditedUrl(linkUrl);
    editor.getEditorState().read(() => {
      const key = linkKeyRef.current;
      if (key == null) return;
      const linkEl = editor.getElementByKey(key);
      setEditedText(linkEl?.textContent ?? "");
    });
    setEditing(true);
  };

  const commitEdit = () => {
    const key = linkKeyRef.current;
    if (key == null) return;
    const url = normalizeUrl(editedUrl);
    if (!url) return;
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (!$isLinkNode(node)) return;
      node.setURL(url);
      const text = editedText.trim();
      if (text && text !== node.getTextContent()) {
        // Replace the link's children with a single text node carrying the
        // new label, preserving the link wrapper itself.
        node.getChildren().forEach((child) => child.remove());
        node.append($createTextNode(text));
      }
    });
    setEditing(false);
  };

  const removeLink = () => {
    const key = linkKeyRef.current;
    if (key == null) return;
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (!$isLinkNode(node)) return;
      // Unwrap: keep the text, drop the link.
      node.replace($createTextNode(node.getTextContent()));
    });
    setIsLink(false);
    setEditing(false);
  };

  if (!isLink || !pos) return null;

  return createPortal(
    <div
      ref={popupRef}
      style={{ top: pos.top, left: pos.left }}
      className="absolute z-50 w-[min(22rem,calc(100%-1rem))]"
      // Keep selection in the editor when interacting with the popup.
      onMouseDown={(e) => {
        if (!editing) e.preventDefault();
      }}
    >
      <div className="rounded-lg border border-rule bg-paper-2 p-2 shadow-lg">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Input
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                }
              }}
              placeholder="Link text"
              className="h-8 text-sm"
            />
            <Input
              ref={urlInputRef}
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                }
              }}
              placeholder="https://example.com"
              className="h-8 text-sm"
            />
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setEditing(false)}
              >
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={commitEdit}
                disabled={!editedUrl.trim()}
              >
                <Check className="size-3.5" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate px-1 text-sm text-blue-600 hover:underline"
              title={linkUrl}
            >
              {linkUrl}
            </a>
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open link"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper hover:text-ink"
            >
              <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              title="Edit link"
              onClick={startEditing}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper hover:text-ink"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              title="Remove link"
              onClick={removeLink}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper hover:text-accent"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>,
    anchorElem,
  );
}

export function FloatingLinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);

  // The editor's scroll container (the ContentEditable's parent) is the
  // positioning context for the popup. Resolve it once the root is attached.
  useEffect(() => {
    const resolve = () => {
      const root = editor.getRootElement();
      setAnchorElem(root?.parentElement ?? null);
    };
    resolve();
    return editor.registerRootListener(resolve);
  }, [editor]);

  if (!anchorElem) return null;
  return <FloatingLinkEditor editor={editor} anchorElem={anchorElem} />;
}
