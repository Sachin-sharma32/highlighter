import { Folder } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Collection } from "./lib";
import type { Id } from "../../../../convex/_generated/dataModel";

export function CollectionPicker({
  value,
  collections,
  onChange,
}: {
  value: Id<"collections"> | undefined;
  collections: Collection[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-lg border border-rule bg-paper-2 p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
        <Folder size={12} /> Collection
      </div>
      <Select value={value ?? "inbox"} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-paper text-xs">
          <SelectValue placeholder="Choose collection" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="inbox">Inbox</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection._id} value={collection._id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
