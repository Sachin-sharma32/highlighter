import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Clock, Repeat, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoRecurrence } from "@/lib/messages";

// Due dates are carried as `datetime-local` strings ("YYYY-MM-DDTHH:mm") to
// match the rest of the widget's plumbing.
function parseValue(value: string): { date?: Date; time: string } {
  if (!value) return { date: undefined, time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: undefined, time: "" };
  return { date, time: value.slice(11, 16) };
}

function compose(date: Date, time: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = time || "09:00";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${t}`;
}

export function DueDateField({
  value,
  onChange,
  container,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  container: HTMLElement | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { date, time } = parseValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border bg-paper px-2.5 text-xs outline-none transition-colors",
          "focus-visible:border-accent",
          date
            ? "border-accent text-ink"
            : "border-rule text-ink-3 hover:text-ink",
          className,
        )}
      >
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-4" />
        <span className="truncate">
          {date ? format(date, "MMM d, h:mm a") : "Set due date"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        container={container}
        align="start"
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(day) => {
            if (day) onChange(compose(day, time));
          }}
          autoFocus
        />
        <div className="flex items-center gap-2 border-t border-rule p-2">
          <label className="flex h-7 flex-1 items-center gap-1.5 rounded-md border border-rule bg-paper px-2 text-ink-3 focus-within:border-accent">
            <Clock className="h-3.5 w-3.5 shrink-0 text-ink-4" />
            <input
              type="time"
              value={time}
              onChange={(e) => {
                const next = e.target.value;
                onChange(compose(date ?? new Date(), next));
              }}
              aria-label="Due time"
              className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
            />
          </label>
          {date && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-ink-3 transition-colors hover:bg-paper-3 hover:text-accent"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const RECURRENCE_NONE = "once";

export function RecurrenceSelect({
  value,
  onChange,
  container,
  className,
}: {
  value: TodoRecurrence | "";
  onChange: (value: TodoRecurrence | "") => void;
  container: HTMLElement | null;
  className?: string;
}) {
  return (
    <Select
      value={value || RECURRENCE_NONE}
      onValueChange={(v) =>
        onChange(v === RECURRENCE_NONE ? "" : (v as TodoRecurrence))
      }
    >
      <SelectTrigger
        aria-label="Repeat"
        className={cn(
          "h-8 w-auto gap-1.5 rounded-lg border-rule bg-paper px-2.5 text-xs text-ink shadow-none focus:ring-1 focus:ring-accent",
          className,
        )}
      >
        <Repeat className="h-3.5 w-3.5 shrink-0 text-ink-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        container={container ?? undefined}
        className="pointer-events-auto min-w-[8rem] border-rule bg-paper-2 text-ink"
      >
        {[
          { value: RECURRENCE_NONE, label: "No repeat" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ].map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-xs text-ink-2 focus:bg-paper-3 focus:text-ink data-[state=checked]:text-accent"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
