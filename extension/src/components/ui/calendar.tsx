import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * A compact calendar styled with the extension's paper/ink/accent tokens so it
 * renders correctly inside the content-script shadow DOM (which doesn't define
 * the default shadcn color tokens). Sizing is pinned to px utilities since
 * `rem` resolves against the host page inside the shadow root.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        root: cn("w-fit", d.root),
        months: cn("relative flex flex-col", d.months),
        month: cn("flex flex-col gap-3", d.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between",
          d.nav,
        ),
        button_previous: cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink aria-disabled:opacity-40",
          d.button_previous,
        ),
        button_next: cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink aria-disabled:opacity-40",
          d.button_next,
        ),
        month_caption: cn(
          "flex h-7 items-center justify-center px-7",
          d.month_caption,
        ),
        caption_label: cn(
          "select-none text-sm font-medium text-ink",
          d.caption_label,
        ),
        weekdays: cn("flex", d.weekdays),
        weekday: cn(
          "w-8 select-none text-[11px] font-normal text-ink-4",
          d.weekday,
        ),
        week: cn("mt-1 flex w-full", d.week),
        day: cn("h-8 w-8 p-0 text-center", d.day),
        outside: cn("text-ink-4 opacity-50", d.outside),
        disabled: cn("text-ink-4 opacity-40", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", cls)} {...rest} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", cls)} {...rest} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected || undefined}
      data-today={modifiers.today || undefined}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-sm text-ink-2 transition-colors",
        "hover:bg-paper-3",
        "data-[today=true]:font-semibold data-[today=true]:text-accent",
        "data-[selected=true]:bg-accent data-[selected=true]:text-paper",
        "data-[selected=true]:hover:bg-accent data-[selected=true]:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
