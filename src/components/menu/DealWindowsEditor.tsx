import { Plus, Trash2 } from "lucide-react";
import { WEEKDAYS, todayWeekday, type Weekday } from "@/lib/weekday";
import { weekdayLabel } from "@/lib/i18n/labels";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("menu");
  const { t: tCommon } = useTranslation("common");
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
                {weekdayLabel(tCommon, day)}
              </option>
            ))}
          </Select>
          <Input
            type="time"
            value={window.startTime}
            onChange={(event) => onChange(windows.map((w, i) => (i === index ? { ...w, startTime: event.target.value } : w)))}
            className="w-auto!"
          />
          <span className="text-xs text-ink-soft">{t("dealWindows.to")}</span>
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
            title={t("dealWindows.remove")}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          onChange([
            ...windows,
            { day: todayWeekday(), startTime: t("dealWindows.seedStart"), endTime: t("dealWindows.seedEnd") },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        {t("dealWindows.add")}
      </Button>
    </div>
  );
}
