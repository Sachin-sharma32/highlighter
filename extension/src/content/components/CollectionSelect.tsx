import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Folder } from "lucide-react";
import type { Collection } from "../settings";

interface Props {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  container: HTMLElement;
}

export function CollectionSelect({
  collections,
  selectedIds,
  onChange,
  container,
}: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;
  const label =
    selectedCount === 0
      ? "No collections"
      : selectedCount === 1
        ? collections.find((c) => c._id === selectedIds[0])?.name ||
          "1 collection"
        : `${selectedCount} collections`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-full items-center justify-between border border-rule bg-paper px-2 text-xs font-mono text-ink shadow-sm outline-none hover:bg-paper-2 focus:ring-1 focus:ring-accent">
        <div className="flex items-center gap-1.5 truncate">
          <Folder size={12} className="text-ink-4" />
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown size={12} className="text-ink-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent container={container} className="w-[200px] bg-paper">
        {collections.map((c) => (
          <DropdownMenuCheckboxItem
            key={c._id}
            checked={selectedIds.includes(c._id)}
            onCheckedChange={() => toggle(c._id)}
            className="text-xs"
          >
            {c.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
