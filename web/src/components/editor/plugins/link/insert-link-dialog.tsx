import { useState } from "react";

import { $createLinkNode } from "@lexical/link";
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  type LexicalEditor,
} from "lexical";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Prepend a protocol so bare hosts like "example.com" become valid links. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function InsertLinkDialog({
  editor,
  onClose,
  initialText = "",
}: {
  editor: LexicalEditor;
  onClose: () => void;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState("");

  function handleConfirm() {
    if (!url.trim()) return;
    const href = normalizeUrl(url);
    const display = text.trim() || href;

    editor.update(() => {
      const linkNode = $createLinkNode(href);
      linkNode.append($createTextNode(display));

      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Replaces the current selection (or inserts at the caret) so the
        // link stays inline within the surrounding block (list, quote, …).
        selection.insertNodes([linkNode]);
      } else {
        $insertNodes([linkNode]);
      }
    });
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-text">Text</Label>
        <Input
          id="link-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Link text"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url">URL</Label>
        <Input
          id="link-url"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
          }}
          placeholder="https://example.com"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!url.trim()}>
          Insert
        </Button>
      </div>
    </div>
  );
}
