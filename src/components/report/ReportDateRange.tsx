import { format, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReportDateRangeProps {
  fromDate: string;
  toDate: string;
  earliest: string;
  latest: string;
  onChange: (from: string, to: string) => void;
}

export function ReportDateRange({ fromDate, toDate, earliest, latest, onChange }: ReportDateRangeProps) {
  const fromValue = fromDate ? parse(fromDate, "yyyy-MM-dd", new Date()) : undefined;
  const toValue = toDate ? parse(toDate, "yyyy-MM-dd", new Date()) : undefined;

  const setFrom = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : "", toDate);
  };

  const setTo = (date: Date | undefined) => {
    onChange(fromDate, date ? format(date, "yyyy-MM-dd") : "");
  };

  const clearDates = () => onChange("", "");

  const hasFilter = fromDate || toDate;

  // Quick presets
  const applyPreset = (months: number) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - months, end.getDate());
    onChange(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
          Report Period
        </span>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[150px] justify-start text-left font-mono text-xs",
                  !fromValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {fromValue ? format(fromValue, "MMM d, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromValue}
                onSelect={setFrom}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[150px] justify-start text-left font-mono text-xs",
                  !toValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {toValue ? format(toValue, "MMM d, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toValue}
                onSelect={setTo}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearDates} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="outline" size="sm" className="text-xs font-mono h-7 px-2.5" onClick={() => applyPreset(3)}>
            3M
          </Button>
          <Button variant="outline" size="sm" className="text-xs font-mono h-7 px-2.5" onClick={() => applyPreset(6)}>
            6M
          </Button>
          <Button variant="outline" size="sm" className="text-xs font-mono h-7 px-2.5" onClick={() => applyPreset(12)}>
            1Y
          </Button>
          <Button variant="outline" size="sm" className="text-xs font-mono h-7 px-2.5" onClick={clearDates}>
            All
          </Button>
        </div>
      </div>
    </section>
  );
}
