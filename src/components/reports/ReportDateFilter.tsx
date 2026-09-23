import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RANGE_PRESETS, rangeLabel, resolveRange } from "@/lib/filters";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import {
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToggleButton,
  useFilterPanelState,
} from "@/components/ui/FilterPanel";

export interface ReportDateRangeState {
  days: number;
  setDays: (value: number) => void;
  from: string;
  setFrom: (value: string) => void;
  to: string;
  setTo: (value: string) => void;
  open: boolean;
  toggle: () => void;
  /** Resolved concrete bounds — pass straight into the report API functions. */
  range: { from: string; to: string };
  active: boolean;
  reset: () => void;
}

/** One shared "date range" filter, used by every report page — same preset/custom pattern as the dashboard. */
export function useReportDateRange(storageKey: string, defaultDays = 14): ReportDateRangeState {
  const [days, setDays] = useState(defaultDays);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { open, toggle } = useFilterPanelState(storageKey);

  const range = useMemo(() => resolveRange({ days, from, to }), [days, from, to]);
  const active = Boolean(from || to || days !== defaultDays);

  function reset() {
    setDays(defaultDays);
    setFrom("");
    setTo("");
  }

  return { days, setDays, from, setFrom, to, setTo, open, toggle, range, active, reset };
}

export function ReportDateFilterButton({ state }: { state: ReportDateRangeState }) {
  const { t } = useTranslation("reports");
  return <FilterToggleButton open={state.open} onToggle={state.toggle} activeCount={state.active ? 1 : 0} label={t("reportDate.buttonLabel")} />;
}

export function ReportDateFilterPanel({ state, idPrefix }: { state: ReportDateRangeState; idPrefix: string }) {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { days, setDays, from, setFrom, to, setTo, open, reset, active } = state;

  return (
    <FilterPanel open={open} title={t("reportDate.filterTitle")} onReset={active ? reset : undefined}>
      <div className="grid gap-3 sm:grid-cols-3">
        <FilterField label={t("reportDate.window.label")} htmlFor={`${idPrefix}-days`}>
          <Select
            id={`${idPrefix}-days`}
            value={days}
            onChange={(event) => {
              setDays(Number(event.target.value));
              setFrom("");
              setTo("");
            }}
          >
            {RANGE_PRESETS.map((option) => (
              <option key={option} value={option}>
                {tCommon("range.lastDays", { count: option })}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField label={t("reportDate.custom.from.label")} htmlFor={`${idPrefix}-from`} hint={t("reportDate.custom.from.hint")}>
          <Input id={`${idPrefix}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </FilterField>

        <FilterField label={t("reportDate.custom.to.label")} htmlFor={`${idPrefix}-to`}>
          <Input id={`${idPrefix}-to`} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </FilterField>
      </div>

      {(from || to) && (
        <FilterChips
          chips={[{ key: "range", label: t("reportDate.windowChip", { window: rangeLabel({ days, from, to }) }) }]}
          onRemove={reset}
          onClear={reset}
        />
      )}
    </FilterPanel>
  );
}
