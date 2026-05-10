import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface PopupHeaderProps {
  hostname: string;
  highlightingEnabled: boolean;
  onToggleHighlighting: () => void;
  onDisconnect: () => void;
}

export function PopupHeader({
  hostname,
  highlightingEnabled,
  onToggleHighlighting,
  onDisconnect,
}: PopupHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-rule px-4 py-[14px]">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink font-display text-[17px] font-medium text-paper ring-[1.5px] ring-accent">
        M
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-medium text-ink">
          Marginalia
        </div>
        <div
          data-testid="popup-on-page-label"
          className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4"
        >
          {hostname}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-ink-4">
          {highlightingEnabled ? "On" : "Off"}
        </span>
        <Switch
          checked={highlightingEnabled}
          onCheckedChange={onToggleHighlighting}
        />
      </div>
      <Button
        onClick={onDisconnect}
        title="Disconnect"
        variant="ghost"
        size="icon"
        className="size-8 rounded p-1"
      >
        <LogOut size={14} />
      </Button>
    </div>
  );
}
