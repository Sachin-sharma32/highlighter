import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Link,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconBtn } from "./IconBtn";

export function DetailToolbar({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onCopy,
  onShare,
  onCopyLink,
  onDelete,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCopy: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-5 shrink-0"
      style={{ height: 44, borderBottom: "1px solid var(--rule)" }}
    >
      <IconBtn onClick={onPrevious} disabled={!hasPrevious}>
        <ChevronLeft size={13} />
      </IconBtn>
      <IconBtn onClick={onNext} disabled={!hasNext}>
        <ChevronRight size={13} />
      </IconBtn>
      <div className="flex-1" />
      <IconBtn onClick={onCopy}>
        <Copy size={13} />
      </IconBtn>
      <IconBtn onClick={onShare}>
        <Share2 size={13} />
      </IconBtn>
      <IconBtn onClick={onCopyLink}>
        <Link size={13} />
      </IconBtn>
      <button
        onClick={onDelete}
        title="Delete highlight"
        className="flex items-center justify-center rounded-md transition-colors"
        style={{ width: 28, height: 28, color: "var(--ink-4)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "oklch(60% 0.2 25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--ink-4)";
        }}
      >
        <Trash2 size={13} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center rounded-md"
            style={{ width: 28, height: 28, color: "var(--ink-3)" }}
          >
            <MoreHorizontal size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-2 text-xs cursor-pointer text-red-600"
          >
            <Trash2 size={12} /> Delete highlight
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
