import type { JournalEvent, Locale } from "./schema";
export const localDay = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export function plusDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export const eventState = (event: JournalEvent, today = localDay()) =>
  event.status === "cancelled"
    ? "cancelled"
    : event.end <= today
      ? "past"
      : "upcoming";
export function bookingUrl(
  lang: Locale,
  property = "La Casa Que Canta",
  arrival?: string,
  departure?: string,
) {
  const url = new URL("https://be.synxis.com/");
  url.search = new URLSearchParams({
    chain: "22402",
    hotel: "78821",
    src: "24C",
    locale: lang === "en" ? "en-US" : "es-MX",
  }).toString();
  // Villa booking identifiers have not been validated. Never apply the hotel's
  // inventory to a villa: send readers to each villa's own official website.
  if (property === "El Ensueño") return "https://www.el-ensueno.com/";
  if (property === "El Murmullo") return "https://www.el-murmullo.com/";
  if (arrival && departure && departure > arrival && arrival >= localDay()) {
    url.searchParams.set("arrive", arrival);
    url.searchParams.set("depart", departure);
  }
  return url.toString();
}
function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function fold(value: string) {
  let line = "",
    result = "";
  for (const char of value) {
    if (new TextEncoder().encode(line + char).length > 73) {
      result += line + "\r\n";
      line = " ";
    }
    line += char;
  }
  return result + line;
}
export function calendar(event: JournalEvent, lang: Locale, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//El Sanctuario//Journal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@el-sanctuario.lacasaquecanta.com`,
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    ...(event.startTime && event.endTime
      ? [
          `DTSTART;TZID=America/Mexico_City:${event.start.replace(/-/g, "")}T${event.startTime.replace(":", "")}00`,
          `DTEND;TZID=America/Mexico_City:${plusDays(event.end, -1).replace(/-/g, "")}T${event.endTime.replace(":", "")}00`,
        ]
      : [
          `DTSTART;VALUE=DATE:${event.start.replace(/-/g, "")}`,
          `DTEND;VALUE=DATE:${event.end.replace(/-/g, "")}`,
        ]),
    `SUMMARY:${icsEscape(event.title[lang])}`,
    `LOCATION:${icsEscape(event.location[lang])}`,
    `DESCRIPTION:${icsEscape(event.description[lang] + "\n" + event.source)}`,
    `URL:${event.source}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
