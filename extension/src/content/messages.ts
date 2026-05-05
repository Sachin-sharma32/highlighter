import type { TabMessage } from "../lib/messages";
import { focusHighlight, unwrapMarksById } from "./marks";
import { setHighlightingEnabled } from "./settings";
import { dismissToolbar } from "./toolbar";
import { getYouTubeClipContext, showYouTubeClipTrimmer } from "./youtube";

export function attachMessageListener() {
  chrome.runtime.onMessage.addListener(
    (msg: TabMessage, _sender, sendResponse) => {
      if (msg?.type === "SCROLL_TO_HIGHLIGHT" && msg.payload?.id) {
        void focusHighlight(msg.payload.id).then((focused) =>
          sendResponse({ ok: focused }),
        );
        return true;
      }
      if (msg?.type === "DELETE_HIGHLIGHT_MARK" && msg.payload?.id) {
        unwrapMarksById(msg.payload.id);
        sendResponse({ ok: true });
        return true;
      }
      if (msg?.type === "HIGHLIGHTING_TOGGLED") {
        setHighlightingEnabled(msg.payload.enabled);
        if (!msg.payload.enabled) dismissToolbar();
        sendResponse({ ok: true });
        return true;
      }
      if (msg?.type === "GET_YOUTUBE_CLIP_CONTEXT") {
        const context = getYouTubeClipContext();
        sendResponse(
          context
            ? { ok: true, data: context }
            : { ok: false, error: "No playable YouTube video found." },
        );
        return true;
      }
      if (msg?.type === "SHOW_YOUTUBE_CLIP_TRIMMER") {
        try {
          showYouTubeClipTrimmer();
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not open clip trimmer.",
          });
        }
        return true;
      }
    },
  );
}
