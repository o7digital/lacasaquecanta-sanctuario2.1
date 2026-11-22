import type { Content, Locale } from "./schema";
import { offerEligibility } from "./circle-schema";
import { localDay } from "./travel";

export function offerPeriod(
  start: string | undefined,
  end: string | undefined,
  lang: Locale,
) {
  if (!start && !end)
    return lang === "en" ? "Confirm with the house" : "Confirma con la casa";
  const format = (value: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));
  return [start && format(start), end && format(end)]
    .filter(Boolean)
    .join(" — ");
}

export function offerStatus(
  offer: Content["offers"][number],
  lang: Locale,
  today = localDay(),
) {
  const state = offerEligibility(offer, today);
  if (state === "expired")
    return lang === "en" ? "Offer ended" : "Oferta finalizada";
  if (state === "not_open")
    return lang === "en" ? "Booking opens later" : "Reservas próximamente";
  return lang === "en" ? "On request" : "Por consultar";
}
