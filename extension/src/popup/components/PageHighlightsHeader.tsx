import { Separator } from "@/components/ui/separator";
import { HL_BG_CLASS, type Highlight } from "../types";

interface PageHighlightsHeaderProps {
  title: string;
  highlights: Highlight[];
}

export function PageHighlightsHeader({
  title,
  highlights,
}: PageHighlightsHeaderProps) {
  return (
    <>
      <div className="px-4 pt-2.5">
        <div
          className="mb-2 truncate font-display text-[13px] text-ink-2"
          data-testid="popup-tab-title"
        >
          {title}
        </div>
        <div className="flex h-1.5 gap-px overflow-hidden rounded-full">
          {highlights.map((h) => (
            <div
              key={`${h._id}-bar`}
              className={`flex-1 rounded-full ${HL_BG_CLASS[h.color]}`}
            />
          ))}
        </div>
      </div>
      <Separator className="mx-4 mt-2.5" />
    </>
  );
}
