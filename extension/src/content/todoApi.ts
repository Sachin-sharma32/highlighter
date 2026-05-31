import type {
  CreateTodoPayload,
  RemoteTodo,
  UpdateTodoPayload,
} from "../lib/messages";

/** Whether the extension is paired with a Marginalia account. */
export async function isPaired(): Promise<boolean> {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
    return Boolean(res?.ok && res.data?.paired);
  } catch {
    return false;
  }
}

export async function listTodosRemote(): Promise<RemoteTodo[] | null> {
  try {
    const res = await chrome.runtime.sendMessage({ type: "LIST_TODOS" });
    return res?.ok && Array.isArray(res.data)
      ? (res.data as RemoteTodo[])
      : null;
  } catch {
    return null;
  }
}

/** Creates a todo server-side and returns its Convex id, or null on failure. */
export async function createTodoRemote(
  payload: CreateTodoPayload,
): Promise<string | null> {
  try {
    const res = await chrome.runtime.sendMessage({
      type: "CREATE_TODO",
      payload,
    });
    return res?.ok && typeof res.data?.id === "string" ? res.data.id : null;
  } catch {
    return null;
  }
}

export function updateTodoRemote(payload: UpdateTodoPayload) {
  void chrome.runtime
    .sendMessage({ type: "UPDATE_TODO", payload })
    .catch(() => {});
}

export function deleteTodoRemote(id: string) {
  void chrome.runtime
    .sendMessage({ type: "DELETE_TODO", payload: { id } })
    .catch(() => {});
}

export function reorderTodosRemote(ids: string[]) {
  void chrome.runtime
    .sendMessage({ type: "REORDER_TODOS", payload: { ids } })
    .catch(() => {});
}
