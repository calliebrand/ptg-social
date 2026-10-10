import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TZ = "America/Chicago";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function chicagoToday(now = new Date()) {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

export function chicagoStamp(date: Date) {
  return formatInTimeZone(date, TZ, "EEE MMM d, yyyy · h:mm a");
}

export function addDaysToDateString(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function startOfWeekMonday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToDateString(date, diff);
}

export function monthGrid(year: number, month: number) {
  const first = `${year}-${pad(month)}-01`;
  const start = startOfWeekMonday(first);
  const days: string[] = [];
  let cursor = start;
  for (let i = 0; i < 42; i++) {
    days.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
  }
  while (
    days.length > 28 &&
    !days.slice(-7).some((day) => day.startsWith(`${year}-${pad(month)}`))
  ) {
    days.splice(-7, 7);
  }
  return days;
}

export function weekDays(anchor: string) {
  const start = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysToDateString(start, i));
}

export function monthTitle(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function weekdayLabels() {
  return WEEKDAYS;
}

export function dayNumber(date: string) {
  return Number(date.slice(8));
}

export function inMonth(date: string, year: number, month: number) {
  return date.startsWith(`${year}-${pad(month)}`);
}

export function parseMonthParam(value: string | undefined, now = new Date()) {
  const fallback = formatInTimeZone(now, TZ, "yyyy-MM");
  const raw = value && /^\d{4}-\d{2}$/.test(value) ? value : fallback;
  const [year, month] = raw.split("-").map(Number);
  if (month < 1 || month > 12) {
    const [y, m] = fallback.split("-").map(Number);
    return { year: y, month: m, key: fallback };
  }
  return { year, month, key: `${year}-${pad(month)}` };
}

export function shiftMonth(key: string, delta: number) {
  const { year, month } = parseMonthParam(key);
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

export function chicagoDateKey(date: Date) {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function chicagoTimeValue(date: Date) {
  return formatInTimeZone(date, TZ, "HH:mm");
}

export function chicagoDateValue(date: Date) {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function zonedDateTime(date: string, time: string) {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  return fromZonedTime(`${date}T${safeTime}:00`, TZ);
}

export function moveToChicagoDay(existing: Date | null, day: string) {
  const time = existing ? chicagoTimeValue(existing) : "09:00";
  return zonedDateTime(day, time);
}

export function rangeForDays(days: string[]) {
  const start = fromZonedTime(`${days[0]}T00:00:00`, TZ);
  const end = fromZonedTime(
    `${addDaysToDateString(days[days.length - 1], 1)}T00:00:00`,
    TZ,
  );
  return { start, end };
}

/** "7:00 AM CT" -> 24h clock */
export function parseClock(raw: string) {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const minute = match[2];
  const ap = match[3].toUpperCase();
  if (ap === "PM" && hour !== 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return `${pad(hour)}:${minute}`;
}
