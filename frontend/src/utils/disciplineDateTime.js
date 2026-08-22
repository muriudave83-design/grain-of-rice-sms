export const SCHOOL_TIME_ZONE = "Africa/Nairobi";

const partsObject = (date) => Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
);

export function getSchoolDateTimeDefaults(now = new Date()) {
  const parts = partsObject(now);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function formatDisciplineDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE, day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

export function formatDisciplineTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid time";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(date);
}
