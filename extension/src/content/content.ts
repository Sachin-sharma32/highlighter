import { isDashboardUrl } from "../lib/dashboard";
import { readMarginaliaTarget } from "../lib/urls";

import "virtual:click-to-component/client";
import {
  focusHighlight,
  repaintHighlights,
  scheduleRepaintRetry,
  setMarkClickHandler,
} from "./marks";
import { attachMessageListener } from "./messages";
import { attachSelectionListeners } from "./selection";
import { isInsideShadowHost } from "./shadow";
import { bootstrapSettings } from "./settings";
import { openEditCardFromMark, scheduleToolbarPosition } from "./toolbar";
import {
  mountYouTubePlayerButton,
  positionYouTubePlayerButton,
  scheduleYouTubePlayerButtonMount,
} from "./youtube";

if (!isDashboardUrl(location.href)) {
  bootstrapSettings();
  setMarkClickHandler((mark) => void openEditCardFromMark(mark));
  attachSelectionListeners();
  attachMessageListener();

  window.addEventListener(
    "scroll",
    () => {
      scheduleToolbarPosition();
      positionYouTubePlayerButton();
    },
    true,
  );

  window.addEventListener("resize", () => {
    scheduleToolbarPosition();
    positionYouTubePlayerButton();
    scheduleYouTubePlayerButtonMount();
  });

  window.addEventListener(
    "yt-navigate-finish",
    scheduleYouTubePlayerButtonMount,
  );
  window.addEventListener(
    "yt-page-data-updated",
    scheduleYouTubePlayerButtonMount,
  );

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => isInsideShadowHost(m.target))) return;
    scheduleRepaintRetry();
    positionYouTubePlayerButton();
    scheduleYouTubePlayerButtonMount();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  repaintHighlights()
    .then(() => {
      mountYouTubePlayerButton();
      const hashId = readMarginaliaTarget(location.href);
      if (hashId) {
        requestAnimationFrame(() => {
          void focusHighlight(hashId);
        });
      }
    })
    .catch(() => {});
}
