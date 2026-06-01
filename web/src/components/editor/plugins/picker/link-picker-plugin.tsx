import { LinkIcon } from "lucide-react";

import { InsertLinkDialog } from "@/components/editor/plugins/link/insert-link-dialog";
import { ComponentPickerOption } from "@/components/editor/plugins/picker/component-picker-option";

export function LinkPickerPlugin() {
  return new ComponentPickerOption("Link", {
    icon: <LinkIcon className="size-4" />,
    keywords: ["link", "url", "hyperlink", "anchor", "href"],
    onSelect: (_, editor, showModal) =>
      showModal("Insert Link", (onClose) => (
        <InsertLinkDialog editor={editor} onClose={onClose} />
      )),
  });
}
