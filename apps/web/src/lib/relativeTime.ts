/**
 * Small self-contained relative-time + recency-grouping helpers for the
 * chat sidebar. No date library is installed in this app, and the need
 * here is narrow enough (chat list timestamps) that pulling one in isn't
 * worth it.
 */

/** "2h ago", "Yesterday", "3d ago", or a short date for anything older. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24 && isSameCalendarDay(date, now)) return `${diffHours}h ago`;
  if (isYesterday(date, now)) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type RecencyGroup = "Today" | "Yesterday" | "Earlier";

export function getRecencyGroup(iso: string): RecencyGroup {
  const date = new Date(iso);
  const now = new Date();

  if (isSameCalendarDay(date, now)) return "Today";
  if (isYesterday(date, now)) return "Yesterday";
  return "Earlier";
}

/** Groups items by recency bucket, preserving the (already-sorted) input order within each group. */
export function groupByRecency<T>(items: T[], getIso: (item: T) => string): Array<[RecencyGroup, T[]]> {
  const order: RecencyGroup[] = ["Today", "Yesterday", "Earlier"];
  const buckets = new Map<RecencyGroup, T[]>();

  for (const item of items) {
    const group = getRecencyGroup(getIso(item));
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(item);
  }

  return order.filter((g) => buckets.has(g)).map((g) => [g, buckets.get(g)!]);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameCalendarDay(date, yesterday);
}
