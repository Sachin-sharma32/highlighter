import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { createInlineShadow, getShadow } from "./shadow";
import { dismissToolbar } from "./toolbar";
import { YouTubeClipTrimmer } from "./components/YouTubeClipTrimmer";
import { getYouTubeVideoId, youtubeWatchUrl } from "../lib/youtube";

const SECONDARY_SELECTORS = [
  "ytd-watch-flexy #secondary",
  "#secondary.ytd-watch-flexy",
  "#secondary",
];
const MOUNT_DEBOUNCE_MS = 250;

let clipHost: HTMLElement | null = null;
let clipRoot: Root | null = null;
let playerButton: HTMLButtonElement | null = null;
let playerButtonMountTimer: number | null = null;

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

export function dismissYouTubeClipTrimmer() {
  clipRoot?.unmount();
  clipRoot = null;
  clipHost?.remove();
  clipHost = null;
}

// Kept for backwards compatibility — the clipper is now embedded in the
// suggested videos column and scrolls with it, so no positioning is needed.
export function positionYouTubeClipper() {}

export function positionYouTubePlayerButton() {
  if (!playerButton) return;
  playerButton.style.display = isYouTubeVideoPage() ? "inline-flex" : "none";
}

export function showYouTubeClipTrimmer() {
  const context = getYouTubeClipContext();
  if (!context) {
    throw new Error("No playable YouTube video found.");
  }

  const secondary = findSecondaryColumn();
  if (!secondary) {
    throw new Error(
      "Open the standard YouTube layout to start a Marginalia clip.",
    );
  }

  dismissYouTubeClipTrimmer();
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
      readCurrentTime: () => {
        const video = document.querySelector<HTMLVideoElement>("video");
        if (!video || !Number.isFinite(video.currentTime)) return 0;
        return Math.max(0, Math.floor(video.currentTime));
      },
      onClose: dismissYouTubeClipTrimmer,
    }),
  );
}

export function mountYouTubePlayerButton() {
  if (!isYouTubeVideoPage()) {
    playerButton?.remove();
    playerButton = null;
    dismissYouTubeClipTrimmer();
    return;
  }

  const sr = getShadow();
  if (playerButton && playerButton.isConnected) {
    positionYouTubePlayerButton();
    return;
  }

  playerButton?.remove();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "marginalia-youtube-player-button";
  button.title = "Clip current moment with Marginalia";
  button.setAttribute("aria-label", "Clip current moment with Marginalia");
  button.textContent = "Clip current moment";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      showYouTubeClipTrimmer();
    } catch {
      /* surfaced via popup flow; no-op here */
    }
  });

  sr.appendChild(button);
  playerButton = button;
  positionYouTubePlayerButton();
}

export function scheduleYouTubePlayerButtonMount() {
  if (playerButtonMountTimer != null) return;
  playerButtonMountTimer = window.setTimeout(() => {
    playerButtonMountTimer = null;
    mountYouTubePlayerButton();
  }, MOUNT_DEBOUNCE_MS);
}
