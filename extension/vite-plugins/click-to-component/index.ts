import type { Plugin } from "vite";

/**
 * Click-to-component for the extension dev build.
 *
 * Why this exists: React 19 stopped populating `_debugSource` on fibers, so
 * external Chrome extensions like LocatorJS can't open components in VSCode
 * anymore. CRX also forces us to use `vite build --watch` instead of `vite dev`,
 * so the upstream `vite-plugin-react-click-to-component` (gated to `serve` mode)
 * is a no-op here.
 *
 * What it does in dev builds:
 *   1. Patches `react/jsx-dev-runtime.js` to restore source info on fibers
 *      (forked from vite-plugin-react-click-to-component@4.2.2).
 *   2. Exposes a virtual module `virtual:click-to-component/client` that
 *      registers an Alt+Right-click handler. The handler walks the fiber tree
 *      to the nearest element with source info and opens `vscode://file/...`.
 *
 * If the React 19 internal layout changes and the patch silently stops finding
 * its anchor, click-to-source will go quiet — the build will still succeed.
 * The upstream npm package is the canonical reference if you need to re-sync.
 */

const CLIENT_ID = "virtual:click-to-component/client";
const RESOLVED_ID = "\0" + CLIENT_ID;

const CLIENT_CODE = `
(() => {
  if (typeof window === "undefined") return;
  const FLAG = "__clickToComponentInstalled";
  if (window[FLAG]) return;
  window[FLAG] = true;

  const getFiber = (el) => {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers) {
      for (const renderer of hook.renderers.values()) {
        try {
          const fiber = renderer.findFiberByHostInstance &&
            renderer.findFiberByHostInstance(el);
          if (fiber) return fiber;
        } catch {}
      }
    }
    for (const key in el) {
      if (key.startsWith("__reactFiber")) return el[key];
    }
    return null;
  };

  const getSource = (fiber) => {
    let f = fiber;
    while (f) {
      const s = f._debugSource || f._debugInfo;
      if (s && s.fileName) return s;
      f = f._debugOwner;
    }
    return null;
  };

  window.addEventListener("contextmenu", (event) => {
    if (!event.altKey) return;
    // composedPath() pierces shadow DOM — content-script components render
    // into shadow roots, so event.target alone retargets to the host element
    // and we'd never find a React fiber.
    const path = event.composedPath();
    let fiber = null;
    let source = null;
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      const f = getFiber(node);
      if (!f) continue;
      const s = getSource(f);
      if (s && s.fileName) {
        fiber = f;
        source = s;
        break;
      }
    }
    if (!fiber || !source) return;
    event.preventDefault();
    const url = "vscode://file/" + source.fileName +
      ":" + (source.lineNumber || 1) +
      ":" + (source.columnNumber || 1);
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, true);
})();
`;

export function clickToComponent(): Plugin {
  let isDev = false;
  return {
    name: "click-to-component",

    configResolved(config) {
      // We can't gate the plugin with `apply` because the virtual module needs
      // to resolve in both dev and prod builds (the entry files import it
      // statically so the runtime gets bundled inline — content scripts can't
      // load split chunks). In prod we resolve to an empty string instead.
      isDev = config.mode === "development";
    },

    transform(code, id) {
      if (!isDev) return;
      // Matches both Vite-prebundled `react/jsx-dev-runtime.js` (serve mode)
      // and the real CJS file `react/cjs/react-jsx-dev-runtime.development.js`
      // (build mode, which CRX forces us into).
      if (!/jsx-dev-runtime(?:\.development)?\.js$/.test(id)) return;
      if (code.includes("_source")) return;
      const defineIndex = code.indexOf('"_debugInfo"');
      if (defineIndex === -1) return;
      const valueIndex = code.indexOf("value: null", defineIndex);
      if (valueIndex === -1) return;
      let next =
        code.slice(0, valueIndex) +
        "value: source" +
        code.slice(valueIndex + "value: null".length);
      if (code.includes("function ReactElement(type, key, self, source,")) {
        return next;
      }
      next = next.replace(
        /maybeKey,\s*isStaticChildren/gu,
        "maybeKey, isStaticChildren, source",
      );
      next = next.replace(
        /(\w+)?,\s*debugStack,\s*debugTask/gu,
        (match, previousArg) => {
          if (previousArg === "source") return match;
          return match.replace("debugTask", "debugTask, source");
        },
      );
      return next;
    },

    resolveId(id) {
      if (id === CLIENT_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      return isDev ? CLIENT_CODE : "";
    },
  };
}
