import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

interface YouTubeClipBarProps {
  onOpenTrimmer: () => void;
}

export function YouTubeClipBar({ onOpenTrimmer }: YouTubeClipBarProps) {
  return (
    <div className="border-b border-rule bg-paper-2 px-4 py-2">
      <Button onClick={onOpenTrimmer} className="h-8 w-full text-xs">
        <Scissors size={12} data-icon="inline-start" />
        Clip current moment
      </Button>
    </div>
  );
}
