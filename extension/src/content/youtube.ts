import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { getShadow } from "./shadow";
import { dismissToolbar } from "./toolbar";
import { YouTubeClipTrimmer } from "./components/YouTubeClipTrimmer";
import { getYouTubeVideoId, youtubeWatchUrl } from "../lib/youtube";

const PLAYER_SELECTOR = ".html5-video-player";
const PLAYER_BUTTON_INSET = 14;
const PLAYER_BUTTON_MIN_INSET = 12;
const CLIPPER_TOP = 16;
const CLIPPER_PADDING = 24;
const CLIPPER_SIDE_MIN_SPACE = 480;
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

export function dismissYouTubeClipTrimmer() {
  clipRoot?.unmount();
  clipRoot = null;
  clipHost?.remove();
  clipHost = null;
}

export function positionYouTubeClipper() {
  if (!clipHost) return;
  const player = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
  const rect = player?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    clipHost.style.top = "86px";
    clipHost.style.right = "24px";
    clipHost.style.left = "";
    return;
  }

  const top = Math.max(CLIPPER_TOP, rect.top + CLIPPER_TOP);
  const sideLeft = rect.right + CLIPPER_PADDING;
  const hasSuggestionsSpace =
    window.innerWidth - sideLeft >= CLIPPER_SIDE_MIN_SPACE;

  if (hasSuggestionsSpace) {
    clipHost.style.left = `${sideLeft}px`;
    clipHost.style.right = "";
  } else {
    clipHost.style.left = "";
    clipHost.style.right = "24px";
  }
  clipHost.style.top = `${top}px`;
}

export function positionYouTubePlayerButton() {
  if (!playerButton) return;
  const player = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
  const rect = player?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;

  const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
  playerButton.style.display = isVisible ? "inline-flex" : "none";
  if (!isVisible) return;
  playerButton.style.left = `${Math.max(PLAYER_BUTTON_MIN_INSET, rect.left + PLAYER_BUTTON_INSET)}px`;
  playerButton.style.top = `${Math.max(PLAYER_BUTTON_MIN_INSET, rect.top + PLAYER_BUTTON_INSET)}px`;
}

export function showYouTubeClipTrimmer() {
  const context = getYouTubeClipContext();
  if (!context) {
    throw new Error("No playable YouTube video found.");
  }

  dismissYouTubeClipTrimmer();
  dismissToolbar();

  const sr = getShadow();
  clipHost = document.createElement("div");
  clipHost.id = "marginalia-youtube-clipper";
  clipHost.className = "marginalia-card marginalia-youtube-clipper";
  sr.appendChild(clipHost);
  clipRoot = createRoot(clipHost);

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

  positionYouTubeClipper();
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
    showYouTubeClipTrimmer();
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
