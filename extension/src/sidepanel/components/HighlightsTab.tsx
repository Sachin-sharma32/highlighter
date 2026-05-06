import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Highlight } from "../types";
import { EmptyState } from "./EmptyState";
import { HighlightRow } from "./HighlightRow";

interface HighlightsTabProps {
  highlights: Highlight[];
  onRowClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
  domains: { domain: string; count: number }[];
  domainFilter: string;
  setDomainFilter: (f: string) => void;
  currentHostname: string;
}

export function HighlightsTab({
  highlights,
  onRowClick,
  onDelete,
  domains,
  domainFilter,
  setDomainFilter,
  currentHostname,
}: HighlightsTabProps) {
  return (
    <div>
      <div className="px-4 py-2.5 border-b border-rule">
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-ink-4" />
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="flex-1 h-8 bg-transparent text-xs text-ink outline-none font-mono cursor-pointer border-none shadow-none focus:ring-0 px-0">
              <SelectValue placeholder="Current page" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="__current__">
                Current page ({currentHostname})
              </SelectItem>
              <SelectItem value="__all__">All domains</SelectItem>
              {domains.map(({ domain, count }) => (
                <SelectItem key={domain} value={domain}>
                  {domain} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {highlights.length === 0 ? (
        <EmptyState
          text="No highlights for this filter."
          sub="Try selecting a different domain."
        />
      ) : (
        highlights.map((highlight, index) => (
          <HighlightRow
            key={highlight._id}
            highlight={highlight}
            variant="detailed"
            className={
              index < highlights.length - 1 ? "border-b border-rule" : ""
            }
            onClick={onRowClick}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
