import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ListTodo,
  Plus,
  X,
  Trash2,
  Check,
  ClipboardList,
  Link2,
  ArrowUpRight,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteTodo, UpdateTodoPayload } from "@/lib/messages";
import {
  isPaired,
  listTodosRemote,
  createTodoRemote,
  updateTodoRemote,
  deleteTodoRemote,
  reorderTodosRemote,
} from "../todoApi";

// Local mirror of the todo list. Doubles as an offline cache and the
// cross-tab sync channel (via chrome.storage.onChanged). When the extension
// is paired, Convex is the source of truth and this mirror is kept in step.
const STORAGE_KEY = "marginalia_todos";

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  link?: string;
  linkTitle?: string;
}

function isTodoArray(value: unknown): value is Todo[] {
  return (
    Array.isArray(value) &&
    value.every(
      (t) =>
        t &&
        typeof t === "object" &&
        typeof (t as Todo).id === "string" &&
        typeof (t as Todo).text === "string" &&
        typeof (t as Todo).done === "boolean" &&
        (typeof (t as Todo).link === "string" ||
          typeof (t as Todo).link === "undefined"),
    )
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Asks the background worker to resolve a link's page title (CORS-safe). */
async function requestLinkTitle(url: string): Promise<string | null> {
  try {
    const res = await chrome.runtime.sendMessage({
      type: "FETCH_LINK_META",
      payload: { url },
    });
    return res?.ok && typeof res.data?.title === "string"
      ? res.data.title
      : null;
  } catch {
    return null;
  }
}

const CLOSE_ANIMATION_MS = 200;

function newId(): string {
  // crypto.randomUUID is only available in secure contexts (https); fall back
  // to a random string so the widget works on plain http pages too.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Allow bare domains like "example.com" by defaulting to https.
  return /^[a-z][\w+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [open, setOpen] = useState(false);
  // `mounted` keeps the popup in the DOM during its exit animation.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  // Inline edit state — the id of the todo being edited and its working text/link.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editLinkDraft, setEditLinkDraft] = useState("");
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const attemptedTitles = useRef<Set<string>>(new Set());
  // Whether Convex is the backing store. Held in a ref so the mutation
  // callbacks always read the latest value without re-binding.
  const pairedRef = useRef(false);

  // ── Drag-and-drop state ──────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Load persisted todos, sync with Convex when paired, and stay in sync
  // across tabs.
  useEffect(() => {
    let active = true;

    const applyRemote = (rows: RemoteTodo[]) => {
      const mapped: Todo[] = rows.map((r) => ({
        id: r._id,
        text: r.text,
        done: r.done,
        createdAt: r.createdAt,
        ...(r.link ? { link: r.link } : {}),
        ...(r.linkTitle ? { linkTitle: r.linkTitle } : {}),
      }));
      setTodos(mapped);
      void chrome.storage.local.set({ [STORAGE_KEY]: mapped });
    };

    // 1. Instant paint from the local cache.
    chrome.storage.local.get(STORAGE_KEY).then((result) => {
      const stored = result[STORAGE_KEY];
      if (active && isTodoArray(stored)) setTodos(stored);
    });

    // 2. Reconcile with Convex when the extension is paired.
    void (async () => {
      const paired = await isPaired();
      if (!active) return;
      pairedRef.current = paired;
      if (!paired) return;

      const result = await chrome.storage.local.get(STORAGE_KEY);
      const local = isTodoArray(result[STORAGE_KEY])
        ? (result[STORAGE_KEY] as Todo[])
        : [];
      const remote = await listTodosRemote();
      if (!active || remote === null) return;

      // First sync after pairing: migrate any local-only todos up to the
      // server (oldest first, since createTodo prepends) so nothing is lost.
      if (remote.length === 0 && local.length > 0) {
        for (const t of [...local].reverse()) {
          const id = await createTodoRemote({
            text: t.text,
            link: t.link,
            linkTitle: t.linkTitle,
          });
          if (id && t.done) updateTodoRemote({ id, done: true });
        }
        const after = await listTodosRemote();
        if (active && after) applyRemote(after);
      } else {
        applyRemote(remote);
      }
    })();

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue;
      if (isTodoArray(next)) setTodos(next);
      else if (next === undefined) setTodos([]);
    };
    chrome.storage.onChanged.addListener(onChanged);

    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // Drive the open/close animation lifecycle.
  useEffect(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open) {
      setMounted(true);
      // Next frame: flip to visible so the transition runs from the start state.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    closeTimer.current = window.setTimeout(
      () => setMounted(false),
      CLOSE_ANIMATION_MS,
    );
  }, [open]);

  // Focus the input when the popup finishes opening.
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  // Close the popup when a pointer-down lands outside the widget.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.composedPath?.()[0] ?? e.target;
      if (rootRef.current && !rootRef.current.contains(target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Focus the link field as it expands.
  useEffect(() => {
    if (linkOpen) urlInputRef.current?.focus();
  }, [linkOpen]);

  // Focus and select the edit field when an edit begins.
  useEffect(() => {
    if (editingId) editInputRef.current?.select();
  }, [editingId]);

  const persist = (next: Todo[]) => {
    setTodos(next);
    void chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  const updateTodo = (id: string, patch: Partial<Todo>) => {
    setTodos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      void chrome.storage.local.set({ [STORAGE_KEY]: next });
      return next;
    });
    if (pairedRef.current) {
      const remote: UpdateTodoPayload = { id };
      if ("text" in patch) remote.text = patch.text;
      // `undefined` in the patch means "clear it"; Convex wants `null` for that.
      if ("link" in patch) remote.link = patch.link ?? null;
      if ("linkTitle" in patch) remote.linkTitle = patch.linkTitle ?? null;
      updateTodoRemote(remote);
    }
  };

  // Resolve page titles for any links that don't have one yet.
  useEffect(() => {
    const pending = todos.filter(
      (t) => t.link && !t.linkTitle && !attemptedTitles.current.has(t.id),
    );
    if (pending.length === 0) return;
    pending.forEach((t) => attemptedTitles.current.add(t.id));

    let cancelled = false;
    void (async () => {
      for (const t of pending) {
        const title = await requestLinkTitle(t.link!);
        if (!cancelled && title) {
          const patch: Partial<Todo> = { linkTitle: title };
          if (t.text === t.link) {
            patch.text = title;
          }
          updateTodo(t.id, patch);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todos]);

  const addTodo = async () => {
    const text = draft.trim();
    const link = normalizeUrl(linkDraft);
    if (!text && !link) return;

    const tempId = newId();
    const todo: Todo = {
      id: tempId,
      text: text || link,
      done: false,
      createdAt: Date.now(),
      ...(link ? { link } : {}),
    };
    persist([todo, ...todos]);
    setDraft("");
    setLinkDraft("");
    setLinkOpen(false);
    inputRef.current?.focus();

    // Persist to Convex and swap the temporary id for the real one.
    if (pairedRef.current) {
      const realId = await createTodoRemote({
        text: todo.text,
        link: todo.link,
        linkTitle: todo.linkTitle,
      });
      if (realId) {
        setTodos((prev) => {
          const next = prev.map((t) =>
            t.id === tempId ? { ...t, id: realId } : t,
          );
          void chrome.storage.local.set({ [STORAGE_KEY]: next });
          return next;
        });
      }
    }
  };

  const toggleTodo = (id: string) => {
    let nextDone: boolean | undefined;
    persist(
      todos.map((t) => {
        if (t.id !== id) return t;
        nextDone = !t.done;
        return { ...t, done: nextDone };
      }),
    );
    if (pairedRef.current && nextDone !== undefined) {
      updateTodoRemote({ id, done: nextDone });
    }
  };

  const deleteTodo = (id: string) => {
    persist(todos.filter((t) => t.id !== id));
    if (pairedRef.current) deleteTodoRemote(id);
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditDraft(todo.text);
    setEditLinkDraft(todo.link ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft("");
    setEditLinkDraft("");
  };

  const commitEditing = () => {
    if (editingId == null) return;
    const current = todos.find((t) => t.id === editingId);
    if (!current) return cancelEditing();

    const text = editDraft.trim();
    const link = normalizeUrl(editLinkDraft);
    // Nothing left to anchor the todo to — keep the original instead of
    // silently emptying it.
    if (!text && !link) return cancelEditing();

    const patch: Partial<Todo> = {};
    const finalText = text || link;
    if (finalText !== current.text) patch.text = finalText;
    if (link !== (current.link ?? "")) {
      patch.link = link || undefined;
      // The link changed — drop the cached title so it re-resolves (or clears).
      patch.linkTitle = undefined;
      attemptedTitles.current.delete(current.id);
    }
    if (Object.keys(patch).length > 0) updateTodo(editingId, patch);
    cancelEditing();
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLLIElement>, id: string) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
      // A small transparent image removes the default browser ghost.
      const ghost = document.createElement("canvas");
      ghost.width = 0;
      ghost.height = 0;
      e.dataTransfer.setDragImage(ghost, 0, 0);
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLLIElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      // Determine whether the cursor is in the top or bottom half of the item.
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIndex = e.clientY < midY ? index : index + 1;
      setDropTargetIndex(insertIndex);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      if (dragId == null || dropTargetIndex == null) return;

      const fromIndex = todos.findIndex((t) => t.id === dragId);
      if (fromIndex === -1) return;

      const reordered = [...todos];
      const [moved] = reordered.splice(fromIndex, 1);
      // Adjust target index after removal.
      const toIndex =
        dropTargetIndex > fromIndex ? dropTargetIndex - 1 : dropTargetIndex;
      reordered.splice(toIndex, 0, moved);
      persist(reordered);
      if (pairedRef.current) {
        reorderTodosRemote(reordered.map((t) => t.id));
      }

      setDragId(null);
      setDropTargetIndex(null);
    },
    [dragId, dropTargetIndex, todos],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetIndex(null);
  }, []);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  return (
    <div
      ref={rootRef}
      className="font-ui pointer-events-none fixed bottom-6 right-6 z-[2147483647]"
    >
      {/* Popup */}
      {mounted && (
        <div
          className={cn(
            "pointer-events-auto absolute bottom-[72px] right-0 w-80 origin-bottom-right",
            "rounded-2xl border border-rule bg-paper-2 text-ink shadow-[0_12px_36px_rgba(18,14,10,0.22)]",
            "transition-all duration-200 ease-out",
            visible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-3 scale-95 opacity-0",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                Todo
              </h2>
            </div>
            <span className="rounded-full bg-paper-3 px-2 py-0.5 text-xs font-medium text-ink-3">
              {remaining} left
            </span>
          </div>

          {/* Composer */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                }}
                placeholder="Add a task…"
                className={cn(
                  "h-9 flex-1 rounded-lg border border-rule bg-paper px-3 text-sm text-ink",
                  "outline-none placeholder:text-ink-4 transition-colors focus:border-accent",
                )}
              />
              <button
                type="button"
                onClick={() => setLinkOpen((v) => !v)}
                aria-label="Attach a link"
                aria-pressed={linkOpen}
                title="Attach a link"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  linkOpen || linkDraft.trim()
                    ? "border-accent text-accent"
                    : "border-rule text-ink-4 hover:text-ink",
                )}
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={addTodo}
                aria-label="Add task"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  "bg-accent text-paper shadow-sm",
                  "transition-transform hover:scale-105 active:scale-95",
                )}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Optional link field — smoothly expands when toggled */}
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                linkOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <input
                  ref={urlInputRef}
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTodo();
                  }}
                  placeholder="Paste a link (optional)…"
                  className={cn(
                    "mt-2 h-8 w-full rounded-lg border border-rule bg-paper px-3 text-xs text-ink",
                    "outline-none placeholder:text-ink-4 transition-colors focus:border-accent",
                  )}
                />
              </div>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto px-3 pb-3 pt-2">
            {todos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-3">
                  <ListTodo className="h-6 w-6 text-ink-4" />
                </div>
                <p className="text-sm font-medium text-ink">All clear</p>
                <p className="text-xs text-ink-4">Add your first task above.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {todos.map((todo, index) => (
                  <li
                    key={todo.id}
                    draggable={editingId !== todo.id}
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group relative flex items-start gap-1 rounded-lg px-1 py-2",
                      "transition-colors hover:bg-paper-3",
                      dragId === todo.id && "opacity-40",
                    )}
                  >
                    {/* Drop indicator — a thin accent line above this item */}
                    {dropTargetIndex === index && dragId !== todo.id && (
                      <div className="pointer-events-none absolute -top-px left-2 right-2 h-0.5 rounded-full bg-accent" />
                    )}

                    {/* Drag handle */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-ink-4",
                        "opacity-0 transition-opacity group-hover:opacity-60",
                      )}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      aria-label={
                        todo.done ? "Mark incomplete" : "Mark complete"
                      }
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        "transition-all duration-200",
                        todo.done
                          ? "border-accent bg-accent text-paper"
                          : "border-rule-2 hover:border-accent",
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3 w-3 transition-all duration-200",
                          todo.done
                            ? "scale-100 opacity-100"
                            : "scale-0 opacity-0",
                        )}
                        strokeWidth={3}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingId === todo.id ? (
                        <div
                          className="flex flex-col gap-1"
                          onBlur={(e) => {
                            // Commit only when focus leaves the whole editor,
                            // not when moving between the text and link fields.
                            if (
                              !e.currentTarget.contains(
                                e.relatedTarget as Node | null,
                              )
                            ) {
                              commitEditing();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEditing();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditing();
                            }
                          }}
                        >
                          <input
                            ref={editInputRef}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            placeholder="Task…"
                            className={cn(
                              "block w-full rounded-md border border-accent bg-paper px-1.5 py-0.5",
                              "text-sm leading-snug text-ink outline-none",
                            )}
                          />
                          <input
                            value={editLinkDraft}
                            onChange={(e) => setEditLinkDraft(e.target.value)}
                            placeholder="Link (optional)…"
                            className={cn(
                              "block w-full rounded-md border border-rule bg-paper px-1.5 py-0.5",
                              "text-xs leading-snug text-ink outline-none focus:border-accent",
                            )}
                          />
                        </div>
                      ) : (
                        <span
                          onDoubleClick={() => startEditing(todo)}
                          title="Double-click to edit"
                          className={cn(
                            "block cursor-text text-sm leading-snug transition-all duration-200",
                            todo.done
                              ? "text-ink-4 line-through"
                              : "text-ink-2",
                          )}
                        >
                          {todo.text}
                        </span>
                      )}
                      {todo.link && (
                        <a
                          href={todo.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={todo.link}
                          className={cn(
                            "mt-0.5 inline-flex max-w-full items-center gap-1 text-xs",
                            "text-ink-3 transition-colors hover:text-accent",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            {todo.text === todo.linkTitle
                              ? prettyHost(todo.link)
                              : todo.linkTitle || prettyHost(todo.link)}
                          </span>
                          <ArrowUpRight className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTodo(todo.id)}
                      aria-label="Delete task"
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-4",
                        "opacity-0 transition-all hover:bg-paper hover:text-accent",
                        "group-hover:opacity-100 focus:opacity-100",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {/* Drop indicator for the very end of the list */}
                {dropTargetIndex === todos.length && dragId != null && (
                  <div className="pointer-events-none mx-2 h-0.5 rounded-full bg-accent" />
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close todo list" : "Open todo list"}
        aria-expanded={open}
        className={cn(
          "pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-accent text-paper shadow-[0_8px_24px_rgba(18,14,10,0.28)] ring-1 ring-rule",
          "transition-all duration-300 hover:scale-110 hover:bg-accent/90 active:scale-95",
        )}
      >
        {/* Soft pulsing halo to invite a click */}
        <span className="absolute inset-0 -z-10 rounded-full bg-accent/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <ListTodo
          className={cn(
            "absolute h-6 w-6 transition-all duration-300",
            open
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
        />
        <X
          className={cn(
            "absolute h-6 w-6 transition-all duration-300",
            open
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0",
          )}
        />
        {/* Remaining-count badge */}
        {remaining > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-xs font-bold text-accent shadow ring-2 ring-rule">
            {remaining > 99 ? "99+" : remaining}
          </span>
        )}
      </button>
    </div>
  );
}
