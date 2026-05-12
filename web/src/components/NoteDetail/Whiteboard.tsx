import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tldraw,
  getSnapshot,
  type Editor,
  type TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";

const SAVE_DEBOUNCE_MS = 800;
const TLDRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as
  | string
  | undefined;

function parseSnapshot(raw: string): TLEditorSnapshot | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as TLEditorSnapshot;
  } catch {
    return undefined;
  }
}

function currentColorScheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

type WhiteboardProps = {
  initialContent: string;
  onChange: (serialized: string) => void;
};

export default function Whiteboard({
  initialContent,
  onChange,
}: WhiteboardProps) {
  // Capture snapshot once. After mount, the tldraw store is the source of
  // truth; re-passing a new snapshot when the parent re-renders (e.g. after
  // a debounced save round-trips through Convex) re-initializes the editor
  // and flashes the canvas.
  const [initialSnapshot] = useState(() => parseSnapshot(initialContent));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.user.updateUserPreferences({ colorScheme: currentColorScheme() });
    const cleanup = editor.store.listen(
      () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const snap = getSnapshot(editor.store);
          onChangeRef.current(JSON.stringify(snap));
        }, SAVE_DEBOUNCE_MS);
      },
      { source: "user", scope: "document" },
    );
    return () => {
      cleanup();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.user.updateUserPreferences({ colorScheme: currentColorScheme() });
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // `isolation: isolate` creates a stacking context with z-index 0 so tldraw's
  // internal high z-indexes can't escape and cover app dialogs/popovers.
  return (
    <div className="whiteboard-host relative isolate h-full w-full">
      <Tldraw
        snapshot={initialSnapshot}
        onMount={handleMount}
        licenseKey={TLDRAW_LICENSE_KEY}
      />
    </div>
  );
}
