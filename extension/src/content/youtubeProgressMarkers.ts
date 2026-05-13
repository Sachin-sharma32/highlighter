import { getClipState, setClipState, subscribeClipState } from "./clipStore";

const ACCENT = "oklch(62% 0.16 40)";
const ACCENT_INK = "oklch(52% 0.17 40)";

let startMarker: HTMLElement | null = null;
let endMarker: HTMLElement | null = null;
let rafId = 0;
let unsubscribe: (() => void) | null = null;

function findProgressBar(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".ytp-progress-bar");
}

function getVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>("video");
}

function getDuration(): number {
  const v = getVideo();
  if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return 0;
  return v.duration;
}

function getCurrentTime(): number {
  const v = getVideo();
  return v && Number.isFinite(v.currentTime) ? Math.max(0, v.currentTime) : 0;
}

export function ensureProgressMarkers() {
  const bar = findProgressBar();
  if (!bar) {
    dismissProgressMarkers();
    return;
  }

  const need = (m: HTMLElement | null) => !m || m.parentElement !== bar;

  if (need(startMarker)) {
    startMarker?.remove();
    startMarker = createMarker("start");
    bar.appendChild(startMarker);
  }
  if (need(endMarker)) {
    endMarker?.remove();
    endMarker = createMarker("end");
    bar.appendChild(endMarker);
  }

  if (!unsubscribe) {
    unsubscribe = subscribeClipState(render);
    startRAF();
  }
  render();
}

export function dismissProgressMarkers() {
  unsubscribe?.();
  unsubscribe = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  startMarker?.remove();
  endMarker?.remove();
  startMarker = null;
  endMarker = null;
}

function createMarker(kind: "start" | "end"): HTMLElement {
  const el = document.createElement("div");
  el.dataset.marginaliaMarker = kind;
  el.style.cssText = [
    "position: absolute",
    "top: 100%",
    "left: 0",
    "width: 20px",
    "height: 26px",
    "margin-top: 2px",
    "transform: translateX(-50%)",
    "z-index: 1000",
    "pointer-events: auto",
    "cursor: ew-resize",
    "display: none",
    "flex-direction: column",
    "align-items: center",
    "user-select: none",
  ].join(";");

  const flag = document.createElement("div");
  flag.style.cssText = [
    "width: 0",
    "height: 0",
    "border-left: 5px solid transparent",
    "border-right: 5px solid transparent",
    `border-bottom: 6px solid ${ACCENT_INK}`,
    "filter: drop-shadow(0 -1px 1px rgba(0,0,0,0.35))",
  ].join(";");

  const box = document.createElement("div");
  box.textContent = kind === "start" ? "⟨" : "⟩";
  box.style.cssText = [
    "width: 20px",
    "height: 20px",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    `background: ${ACCENT_INK}`,
    "color: #ffffff",
    "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    "font-size: 13px",
    "font-weight: 700",
    "line-height: 1",
    "border-radius: 999px",
    "box-shadow: 0 2px 4px rgba(0,0,0,0.45)",
  ].join(";");

  el.appendChild(flag);
  el.appendChild(box);

  attachDrag(el, kind);
  return el;
}

function attachDrag(marker: HTMLElement, kind: "start" | "end") {
  let dragging = false;

  marker.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    marker.setPointerCapture(e.pointerId);
    dragging = true;
  });

  marker.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.stopPropagation();
    const bar = marker.parentElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    const duration = getDuration();
    if (duration <= 0) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * duration;
    const { lockedStart, lockedEnd } = getClipState();
    if (kind === "start") {
      let next = t;
      if (lockedEnd !== null && next >= lockedEnd) {
        next = Math.max(0, lockedEnd - 5);
      }
      setClipState({ offset: null, lockedStart: next });
    } else {
      let next = t;
      if (lockedStart !== null && next <= lockedStart) {
        next = Math.min(duration, lockedStart + 5);
      }
      setClipState({ offset: null, lockedEnd: next });
    }
  });

  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    e.stopPropagation();
    if (marker.hasPointerCapture(e.pointerId)) {
      marker.releasePointerCapture(e.pointerId);
    }
  };
  marker.addEventListener("pointerup", release);
  marker.addEventListener("pointercancel", release);
  marker.addEventListener("click", (e) => e.stopPropagation());
  marker.addEventListener("mousedown", (e) => e.stopPropagation());
}

function render() {
  if (!startMarker || !endMarker) return;
  const { offset, lockedStart, lockedEnd } = getClipState();
  const duration = getDuration();

  if (duration <= 0) {
    startMarker.style.display = "none";
    endMarker.style.display = "none";
    return;
  }

  const [sTime, eTime]: [number | null, number | null] =
    offset !== null
      ? (() => {
          const p = getCurrentTime();
          return [Math.max(0, p - offset), Math.min(duration, p + offset)];
        })()
      : [lockedStart, lockedEnd];

  const ink = offset !== null ? ACCENT : ACCENT_INK;
  applyColor(startMarker, ink);
  applyColor(endMarker, ink);

  if (sTime !== null) {
    startMarker.style.display = "flex";
    startMarker.style.left = `${(sTime / duration) * 100}%`;
    startMarker.style.cursor = offset !== null ? "default" : "ew-resize";
    startMarker.style.pointerEvents = offset !== null ? "none" : "auto";
  } else {
    startMarker.style.display = "none";
  }
  if (eTime !== null) {
    endMarker.style.display = "flex";
    endMarker.style.left = `${(eTime / duration) * 100}%`;
    endMarker.style.cursor = offset !== null ? "default" : "ew-resize";
    endMarker.style.pointerEvents = offset !== null ? "none" : "auto";
  } else {
    endMarker.style.display = "none";
  }
}

function applyColor(marker: HTMLElement, color: string) {
  const flag = marker.children[0] as HTMLElement | undefined;
  const box = marker.children[1] as HTMLElement | undefined;
  if (flag) flag.style.borderBottomColor = color;
  if (box) box.style.background = color;
}

function startRAF() {
  const tick = () => {
    render();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
