import shadowCss from "./content.css?inline";

const HOST_ID = "marginalia-host";
const HOST_STYLE_ID = "marginalia-host-style";
const MARK_STYLE_ID = "marginalia-mark-style";

const HOST_CSS = `
  .marginalia-host {
    all: initial;
    position: fixed;
    z-index: 2147483647;
    top: 0;
    left: 0;
    pointer-events: none;
  }
`;

const MARK_CSS = `
mark.marginalia-mark {
  cursor: pointer;
  border-radius: 1px;
  padding: 1px 0;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  background-color: transparent !important;
  background-repeat: repeat !important;
  color: #111827 !important;
}
@keyframes marginalia-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
  50% { box-shadow: 0 0 0 4px oklch(70% 0.15 50 / 0.5); }
}
mark.marginalia-mark.marginalia-focused {
  animation: marginalia-pulse 0.9s ease-in-out 2;
  border-radius: 2px;
}
mark.marginalia-mark * {
  color: #111827 !important;
}
`;

let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let positionStyleEl: HTMLStyleElement | null = null;

function injectStyle(id: string, css: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

function ensureHostStyles() {
  injectStyle(HOST_STYLE_ID, HOST_CSS);
  injectStyle(MARK_STYLE_ID, MARK_CSS);
}

export function getShadow(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  ensureHostStyles();

  shadowHost = document.createElement("div");
  shadowHost.id = HOST_ID;
  shadowHost.className = "marginalia-host";
  document.documentElement.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = shadowCss;
  shadowRoot.appendChild(style);

  positionStyleEl = document.createElement("style");
  positionStyleEl.id = "marginalia-position-style";
  shadowRoot.appendChild(positionStyleEl);

  return shadowRoot;
}

export function setToolbarPositionRule(left: number, top: number) {
  if (!positionStyleEl) return;
  positionStyleEl.textContent = `#marginalia-toolbar{left:${left}px;top:${top}px;}`;
}

export function clearToolbarPositionRule() {
  if (!positionStyleEl) return;
  positionStyleEl.textContent = "";
}

export function isInsideShadowHost(target: EventTarget | null): boolean {
  return Boolean((target as Element | null)?.closest?.(`#${HOST_ID}`));
}
