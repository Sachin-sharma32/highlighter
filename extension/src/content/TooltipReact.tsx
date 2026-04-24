import { createRoot, Root } from "react-dom/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Folder } from "lucide-react";
import React, { useState } from "react";

interface MultiSelectProps {
  collections: { _id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  container: HTMLElement;
}

function MultiSelect({ collections, selectedIds, onChange, container }: MultiSelectProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-full items-center justify-between rounded border border-rule bg-paper px-2 text-xs font-mono text-ink shadow-sm outline-none hover:bg-paper-2 focus:ring-1 focus:ring-accent">
        <div className="flex items-center gap-1.5 truncate">
          <Folder size={12} className="text-ink-4" />
          <span className="truncate">
            {selectedCount === 0
              ? "No collections"
              : selectedCount === 1
              ? collections.find(c => c._id === selectedIds[0])?.name || "1 collection"
              : `${selectedCount} collections`}
          </span>
        </div>
        <ChevronDown size={12} className="text-ink-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent container={container} className="w-[200px] bg-paper">
        {collections.map(c => (
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

export function renderMultiSelect(
  domElement: HTMLElement,
  collections: { _id: string; name: string }[],
  selectedIds: string[],
  onChange: (ids: string[]) => void,
  shadowContainer: HTMLElement
) {
  const root = createRoot(domElement);
  root.render(
    <MultiSelect
      collections={collections}
      selectedIds={selectedIds}
      onChange={onChange}
      container={shadowContainer}
    />
  );
  return root;
}
