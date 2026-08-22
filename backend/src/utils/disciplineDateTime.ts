export const SCHOOL_TIME_ZONE = "Africa/Nairobi";
export const SCHOOL_UTC_OFFSET = "+03:00";

export type IncidentDateTimeResult =
  | { value: Date }
  | { error: "INVALID_DATE" | "INVALID_TIME" | "INVALID_TIMESTAMP" | "FUTURE_TIMESTAMP" };

export function parseIncidentDateTime(
  incidentDate: unknown,
  incidentTime: unknown,
  now = new Date(),
): IncidentDateTimeResult {
  if (typeof incidentDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) {
    return { error: "INVALID_DATE" };
  }
  const [year, month, day] = incidentDate.split("-").map(Number);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return { error: "INVALID_DATE" };
  }

  if (typeof incidentTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(incidentTime)) {
    return { error: "INVALID_TIME" };
  }

  const value = new Date(`${incidentDate}T${incidentTime}:00${SCHOOL_UTC_OFFSET}`);
  if (Number.isNaN(value.getTime())) return { error: "INVALID_TIMESTAMP" };
  if (value.getTime() > now.getTime() + 5 * 60 * 1000) return { error: "FUTURE_TIMESTAMP" };
  return { value };
}
