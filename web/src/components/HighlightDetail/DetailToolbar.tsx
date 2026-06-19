import {
  ArrowLeft,
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
  onBack,
  onPrevious,
  onNext,
  onCopy,
  onShare,
  onCopyLink,
  onDelete,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  onBack?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onCopy: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-rule px-3 sm:px-5">
      {/* Back to the list — only the single-column mobile layout needs it. */}
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back to list"
          className="mr-0.5 flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink md:hidden"
        >
          <ArrowLeft size={15} />
        </button>
      )}
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
