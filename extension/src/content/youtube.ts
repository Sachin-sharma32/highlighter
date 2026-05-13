import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { createInlineShadow } from "./shadow";
import { dismissToolbar } from "./toolbar";
import { YouTubeClipTrimmer } from "./components/YouTubeClipTrimmer";
import {
  formatClipTime,
  getYouTubeVideoId,
  youtubeWatchUrl,
} from "../lib/youtube";
import type { SaveHighlightPayload } from "../lib/messages";
import {
  clipMarkEnd,
  clipMarkStart,
  getClipState,
  resetClipState,
} from "./clipStore";
import {
  dismissProgressMarkers,
  ensureProgressMarkers,
} from "./youtubeProgressMarkers";
import { notifyYouTubeClipSaved } from "./api";

const SECONDARY_SELECTORS = [
  "ytd-watch-flexy #secondary",
  "#secondary.ytd-watch-flexy",
  "#secondary",
];
const PLAYER_SELECTORS = [
  "#movie_player",
  ".html5-video-player",
  "ytd-watch-flexy #player",
];
const MOUNT_DEBOUNCE_MS = 250;

let clipHost: HTMLElement | null = null;
let clipRoot: Root | null = null;
let playerButtonHost: HTMLElement | null = null;
let playerButtonMountTimer: number | null = null;
let keyboardAttached = false;

interface ClipContext {
  videoId: string;
  title: string;
  url: string;
  currentTime: number;
  duration?: number;
  channelTitle?: string;
}

function getChannelTitle() {
  return (
    document
      .querySelector<HTMLAnchorElement>(
        "ytd-video-owner-renderer #channel-name a",
      )
      ?.textContent?.trim() ||
    document
      .querySelector<HTMLElement>("#owner #channel-name")
      ?.textContent?.trim() ||
    undefined
  );
}

export function getYouTubeClipContext(): ClipContext | null {
  const videoId = getYouTubeVideoId(location.href);
  const video = document.querySelector<HTMLVideoElement>("video");
  if (!videoId || !video) return null;

  const duration =
    Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : undefined;

  return {
    videoId,
    title:
      document.title.replace(/\s*-\s*YouTube\s*$/i, "").trim() ||
      "YouTube video",
    url: youtubeWatchUrl(videoId),
    currentTime: video.currentTime,
    duration,
    channelTitle: getChannelTitle(),
  };
}

function isYouTubeVideoPage() {
  return Boolean(
    getYouTubeVideoId(location.href) &&
    document.querySelector<HTMLVideoElement>("video"),
  );
}

function findSecondaryColumn(): HTMLElement | null {
  for (const sel of SECONDARY_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

function findPlayerContainer(): HTMLElement | null {
  for (const sel of PLAYER_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

function readVideoTime(): number {
  const video = document.querySelector<HTMLVideoElement>("video");
  if (!video || !Number.isFinite(video.currentTime)) return 0;
  return Math.max(0, video.currentTime);
}

function readVideoDuration(): number {
  const video = document.querySelector<HTMLVideoElement>("video");
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
    return 0;
  return video.duration;
}

function clipBounds(): { start: number; end: number } | null {
  const { offset, lockedStart, lockedEnd } = getClipState();
  const duration = readVideoDuration();
  if (offset !== null) {
    const p = readVideoTime();
    const cap = duration > 0 ? duration : p + offset;
    const s = Math.floor(Math.max(0, p - offset));
    const e = Math.floor(Math.min(cap, p + offset));
    return { start: s, end: Math.max(s + 1, e) };
  }
  if (lockedStart !== null && lockedEnd !== null && lockedEnd > lockedStart) {
    const s = Math.floor(lockedStart);
    const e = Math.floor(lockedEnd);
    return { start: s, end: Math.max(s + 1, e) };
  }
  return null;
}

let saveInFlight = false;

async function executeClipSave(): Promise<boolean> {
  if (saveInFlight) return false;
  const context = getYouTubeClipContext();
  if (!context) return false;
  const bounds = clipBounds();
  if (!bounds) return false;

  const payload: SaveHighlightPayload = {
    url: context.url,
    title: context.title,
    text: `YouTube clip ${formatClipTime(bounds.start)}-${formatClipTime(bounds.end)}`,
    color: "sky",
    sourceType: "youtube",
    youtubeVideoId: context.videoId,
    clipStart: bounds.start,
    clipEnd: bounds.end,
    youtubeChannelTitle: context.channelTitle,
  };

  saveInFlight = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_HIGHLIGHT",
      payload,
    });
    if (!response?.ok) return false;
    notifyYouTubeClipSaved();
    resetClipState();
    return true;
  } catch {
    return false;
  } finally {
    saveInFlight = false;
  }
}

export function dismissYouTubeClipTrimmer() {
  clipRoot?.unmount();
  clipRoot = null;
  clipHost?.remove();
  clipHost = null;
  resetClipState();
}

export function positionYouTubeClipper() {}

export function positionYouTubePlayerButton() {
  if (!playerButtonHost) return;
  playerButtonHost.style.display = isYouTubeVideoPage() ? "block" : "none";
}

function mountTrimmer(): boolean {
  if (clipRoot && clipHost?.isConnected) return true;

  const context = getYouTubeClipContext();
  if (!context) return false;

  const secondary = findSecondaryColumn();
  if (!secondary) return false;

  // Tear down any stale shell before re-creating.
  clipRoot?.unmount();
  clipHost?.remove();

  dismissToolbar();

  const { host, shadowRoot } = createInlineShadow(secondary);
  host.id = "marginalia-youtube-clipper-host";
  host.style.marginBottom = "16px";
  secondary.insertBefore(host, secondary.firstChild);

  clipHost = host;
  clipRoot = createRoot(shadowRoot);

  clipRoot.render(
    createElement(YouTubeClipTrimmer, {
      context,
      readCurrentTime: readVideoTime,
      readDuration: () => readVideoDuration() || context.duration || 0,
      seekTo: (t: number) => {
        const video = document.querySelector<HTMLVideoElement>("video");
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
          return;
        video.currentTime = Math.max(0, Math.min(video.duration, t));
      },
      onClose: dismissYouTubeClipTrimmer,
    }),
  );
  return true;
}

export function showYouTubeClipTrimmer() {
  if (!mountTrimmer()) {
    throw new Error(
      "Open the standard YouTube layout to start a Marginalia clip.",
    );
  }
}

function openTrimmerInteractive() {
  try {
    showYouTubeClipTrimmer();
  } catch {
    /* In fullscreen / no secondary column: keep keyboard-only flow alive. */
  }
}

export function mountYouTubePlayerButton() {
  if (!isYouTubeVideoPage()) {
    playerButtonHost?.remove();
    playerButtonHost = null;
    dismissYouTubeClipTrimmer();
    dismissProgressMarkers();
    return;
  }

  // Always try to (re-)attach markers — YouTube may re-build the progress bar
  // on navigation.
  ensureProgressMarkers();

  attachYouTubeKeyboardShortcuts();

  const player = findPlayerContainer();
  if (!player) return;

  if (playerButtonHost && playerButtonHost.isConnected) {
    if (playerButtonHost.parentElement !== player) {
      player.appendChild(playerButtonHost);
    }
    positionYouTubePlayerButton();
    return;
  }

  playerButtonHost?.remove();

  const { host, shadowRoot } = createInlineShadow(player);
  host.id = "marginalia-youtube-player-button-host";
  host.style.position = "absolute";
  host.style.top = "12px";
  host.style.right = "12px";
  host.style.zIndex = "60";
  host.style.width = "auto";
  host.style.display = "block";
  host.style.pointerEvents = "auto";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "marginalia-youtube-player-button";
  button.title = "Clip current moment with Marginalia";
  button.setAttribute("aria-label", "Clip current moment with Marginalia");
  button.textContent = "Clip current moment";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTrimmerInteractive();
  });
  shadowRoot.appendChild(button);

  playerButtonHost = host;
  positionYouTubePlayerButton();
}

export function scheduleYouTubePlayerButtonMount() {
  if (playerButtonMountTimer != null) return;
  playerButtonMountTimer = window.setTimeout(() => {
    playerButtonMountTimer = null;
    mountYouTubePlayerButton();
  }, MOUNT_DEBOUNCE_MS);
}

function isEditableEventTarget(e: KeyboardEvent): boolean {
  for (const el of e.composedPath()) {
    if (el instanceof HTMLInputElement) return true;
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLSelectElement) return true;
    if (el instanceof HTMLElement && el.isContentEditable) return true;
  }
  return false;
}

function handleKeyboardShortcut(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!isYouTubeVideoPage()) return;
  if (isEditableEventTarget(e)) return;

  const key = e.key.toLowerCase();
  if (key !== "q" && key !== "e" && key !== "s" && key !== "r") return;

  if (key === "q") {
    e.preventDefault();
    e.stopPropagation();
    clipMarkStart(readVideoTime());
    openTrimmerInteractive();
  } else if (key === "e") {
    e.preventDefault();
    e.stopPropagation();
    clipMarkEnd(readVideoTime());
    openTrimmerInteractive();
  } else if (key === "s") {
    if (clipBounds() !== null) {
      e.preventDefault();
      e.stopPropagation();
      void executeClipSave();
    }
  } else if (key === "r") {
    const { offset, lockedStart, lockedEnd } = getClipState();
    if (offset !== null || lockedStart !== null || lockedEnd !== null) {
      e.preventDefault();
      e.stopPropagation();
      resetClipState();
    }
  }
}

function attachYouTubeKeyboardShortcuts() {
  if (keyboardAttached) return;
  keyboardAttached = true;
  document.addEventListener("keydown", handleKeyboardShortcut, true);
}
