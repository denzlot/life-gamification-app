import type { DailyPlanItemResponse } from "../api/types";

function planItemOrderKey(date: string) {
  return `flowvisior:plan-item-order:${date}`;
}

export function readPlanItemOrder(date: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(planItemOrderKey(date));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

export function writePlanItemOrder(date: string, items: DailyPlanItemResponse[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(planItemOrderKey(date), JSON.stringify(items.map((item) => item.id)));
  } catch {
    // Manual ordering is a UI preference; ignore storage limits/private mode.
  }
}

export function applyPlanItemOrder(items: DailyPlanItemResponse[], date: string) {
  const order = readPlanItemOrder(date);
  if (order.length === 0) return items;
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const left = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const right = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function reorderItems(items: DailyPlanItemResponse[], activeId: number, overId: number) {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function capturePlanItemRects() {
  if (typeof document === "undefined") return new Map<number, DOMRect>();
  const rects = new Map<number, DOMRect>();
  document.querySelectorAll<HTMLElement>("[data-plan-item-id]").forEach((element) => {
    const id = Number(element.dataset.planItemId);
    if (Number.isFinite(id)) rects.set(id, element.getBoundingClientRect());
  });
  return rects;
}

export function animatePlanItemShift(previousRects: Map<number, DOMRect>) {
  if (typeof document === "undefined" || previousRects.size === 0) return;
  window.requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-plan-item-id]").forEach((element) => {
      const id = Number(element.dataset.planItemId);
      const previous = previousRects.get(id);
      if (!previous) return;
      const next = element.getBoundingClientRect();
      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      element.animate(
        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
        { duration: 190, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    });
  });
}

export function readBooleanPreference(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1";
}

export function writeBooleanPreference(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // UI preference only.
  }
}
