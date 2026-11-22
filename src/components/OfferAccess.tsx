import { useEffect, useState } from "react";
import { api } from "../lib/client";
import { offerEligibility } from "../lib/circle-schema";
import { localDay } from "../lib/travel";
import type { Content } from "../lib/schema";
import RequestForm from "./RequestForm";
export default function OfferAccess({
  lang,
  offer,
}: {
  lang: string;
  offer: Content["offers"][number];
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [account, setAccount] = useState<any>();
  useEffect(() => {
    api("account")
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);
  const eligibility = offerEligibility(offer, localDay(), account?.membership);
  if (eligibility === "eligible")
    return <RequestForm lang={lang} kind="offer" itemId={offer.id} />;
  return (
    <section className="empty-state">
      <p>
        {eligibility === "expired"
          ? t("This offer has expired.", "Esta oferta ha caducado.")
          : eligibility === "not_open"
            ? t(
                "Booking for this offer has not opened yet.",
                "El periodo de reserva de esta oferta aún no ha comenzado.",
              )
            : eligibility === "preview_only"
              ? t(
                  "Editorial preview. This offer cannot be requested yet.",
                  "Vista previa editorial. Esta oferta aún no puede solicitarse.",
                )
              : t(
                  "This offer requires an eligible membership assigned by the house.",
                  "Esta oferta requiere una membresía elegible asignada por la casa.",
                )}
      </p>
      {!account && (
        <a className="pill" href={`/${lang}/login/`}>
          {t(
            "Sign in to check my membership",
            "Iniciar sesión para comprobar mi membresía",
          )}
        </a>
      )}
    </section>
  );
}
