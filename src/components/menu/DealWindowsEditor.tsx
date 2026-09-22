import { Plus, Trash2 } from "lucide-react";
import { WEEKDAYS, WEEKDAY_LABELS, todayWeekday, type Weekday } from "@/lib/weekday";
import type { DealWindow } from "@/lib/deals";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

/** Per-day time-window rows for a deal — different start/end times per day. Shared by ProductFormPage and DealFormPage. */
export default function DealWindowsEditor({
  windows,
  onChange,
}: {
  windows: DealWindow[];
  onChange: (next: DealWindow[]) => void;
}) {
  return (
    <div className="space-y-2">
      {windows.map((window, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Select
            value={window.day}
            onChange={(event) =>
              onChange(windows.map((w, i) => (i === index ? { ...w, day: event.target.value as Weekday } : w)))
            }
            className="w-auto!"
          >
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {WEEKDAY_LABELS[day]}
              </option>
            ))}
          </Select>
          <Input
            type="time"
            value={window.startTime}
            onChange={(event) => onChange(windows.map((w, i) => (i === index ? { ...w, startTime: event.target.value } : w)))}
            className="w-auto!"
          />
          <span className="text-xs text-ink-soft">to</span>
          <Input
            type="time"
            value={window.endTime}
            onChange={(event) => onChange(windows.map((w, i) => (i === index ? { ...w, endTime: event.target.value } : w)))}
            className="w-auto!"
          />
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onChange(windows.filter((_, i) => i !== index))}
            title="Remove this window"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...windows, { day: todayWeekday(), startTime: "11:00", endTime: "14:00" }])}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add day &amp; time
      </Button>
    </div>
  );
}
