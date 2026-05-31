import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { getShadow } from "./shadow";
import { TodoWidget } from "./components/TodoWidget";

let todoRoot: Root | null = null;
let todoContainer: HTMLDivElement | null = null;

function ensureTodoContainer(): HTMLDivElement {
  const shadow = getShadow();
  if (!todoContainer) {
    todoContainer = document.createElement("div");
    // Host disables pointer events; re-enable for the widget subtree.
    todoContainer.style.pointerEvents = "auto";
    shadow.appendChild(todoContainer);
  }
  return todoContainer;
}

/** Mounts the always-on floating todo widget into the shared shadow root. */
export function ensureTodoWidget() {
  if (todoRoot) return;
  const container = ensureTodoContainer();
  todoRoot = createRoot(container);
  todoRoot.render(createElement(TodoWidget));
}
