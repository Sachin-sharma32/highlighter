import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Link,
  Share2,
  Trash2,
} from "lucide-react";
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
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-rule px-5">
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
        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-4 transition-all duration-150 hover:bg-paper-2 hover:text-red-500 active:scale-95"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
