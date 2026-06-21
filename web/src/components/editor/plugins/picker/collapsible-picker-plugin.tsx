import { ListCollapse } from "lucide-react";

import { ComponentPickerOption } from "@/components/editor/plugins/picker/component-picker-option";
import { INSERT_COLLAPSIBLE_COMMAND } from "@/components/editor/plugins/collapsible/insert-collapsible-command";

export function CollapsiblePickerPlugin() {
  return new ComponentPickerOption("Toggle List", {
    icon: <ListCollapse className="size-4" />,
    keywords: ["toggle", "collapsible", "collapse", "details", "accordion"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined),
  });
}
