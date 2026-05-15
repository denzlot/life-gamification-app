import type { DayQuality } from "../api/types";

export const DAY_QUALITY_LABEL: Record<DayQuality, string> = {
  GOOD: "Хороший",
  NORMAL: "Нормальный",
  BAD: "Плохой",
  EMPTY: "Пустой"
};

export const DAY_QUALITY_ICON: Record<DayQuality, string> = {
  GOOD: "✓",
  NORMAL: "-",
  BAD: "!",
  EMPTY: "-"
};

export function dayQualityLabel(quality?: DayQuality | null) {
  return quality ? DAY_QUALITY_LABEL[quality] : "";
}

export function dayQualityIcon(quality?: DayQuality | null) {
  return quality ? DAY_QUALITY_ICON[quality] : "";
}
