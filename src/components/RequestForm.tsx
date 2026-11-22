import { useEffect, useState } from "react";
import { api, message } from "../lib/client";
export default function RequestForm({
  lang,
  kind,
  itemId,
}: {
  lang: string;
  kind: "experience" | "wedding" | "moment" | "stay" | "offer";
  itemId?: string;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const isDinner = kind === "experience" && itemId === "romantic-beach-dinner";
  const canBeSurprise = kind === "moment" || isDinner;
  const [account, setAccount] = useState<any>(),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [surprise, setSurprise] = useState(false),
    [key, setKey] = useState(""),
    [done, setDone] = useState<any>();
  useEffect(() => {
    setKey(crypto.randomUUID());
    api("account")
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);
  return (
    <section className="request-panel" id="request">
      <p className="eyebrow">
        {t("A CONVERSATION WITH THE HOUSE", "UNA CONVERSACIÓN CON LA CASA")}
      </p>
      <h2>{t("Make it personal.", "Hazlo personal.")}</h2>
      <p>
        {t(
          "Share your wishes. The house will reply in your private request. An enquiry becomes confirmed only after an explicit response.",
          "Comparte tus deseos. La casa responderá en tu solicitud privada. Una consulta solo se confirma tras una respuesta expresa.",
        )}
      </p>
      {account === null ? (
        <div className="empty-state">
          <p>
            {t(
              "Sign in to save and follow your request.",
              "Inicia sesión para guardar y seguir tu solicitud.",
            )}
          </p>
          <a
            className="pill dark"
            href={`/${lang}/login/?returnTo=${encodeURIComponent(location.pathname + "#request")}`}
          >
            {t(
              "Sign in or create an account",
              "Iniciar sesión o crear una cuenta",
            )}
          </a>
        </div>
      ) : account ? (
        <form
          className="v2-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setStatus("");
            const form = e.currentTarget,
              fd = new FormData(form);
            try {
              const result = await api("requests", "POST", {
                kind,
                itemId,
                stayId: fd.get("stayId") || undefined,
                date: fd.get("date") || undefined,
                flexibility: fd.get("flexibility") || "",
                people: Number(fd.get("people")) || undefined,
                occasion: fd.get("occasion") || "",
                accommodation: fd.get("accommodation") || "",
                message: fd.get("message"),
                dietaryNotes: fd.get("dietaryNotes") || "",
                surprise,
                authorisedContact: surprise
                  ? fd.get("authorisedContact")
                  : undefined,
                dining: isDinner
                  ? {
                      setting: "beach",
                      localTime: fd.get("dinnerTime") || undefined,
                    }
                  : undefined,
                idempotencyKey: key,
                saveDraft:
                  (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                    "value",
                  ) === "draft",
              });
              setDone(result);
              setKey(crypto.randomUUID());
              setStatus(
                t(
                  "Your request has been saved.",
                  "Tu solicitud se ha guardado.",
                ),
              );
            } catch (error) {
              setStatus(message(error, lang));
            } finally {
              setBusy(false);
            }
          }}
        >
          {account.actor.demo && (
            <p className="demo-banner">
              {t(
                "Isolated demonstration. No request is sent to the hotel.",
                "Demostración aislada. No se envía ninguna solicitud al hotel.",
              )}
            </p>
          )}
          <label>
            {t(
              "Attach to a stay or project",
              "Vincular a una estancia o proyecto",
            )}
            <select name="stayId">
              <option value="">{t("No stay yet", "Aún sin estancia")}</option>
              {account.stays
                .filter((s: any) => s.status !== "cancelled")
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.property} ·{" "}
                    {s.arrival?.slice(0, 10) ||
                      t("Return project", "Proyecto de regreso")}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              {t("Desired date", "Fecha deseada")}
              <input type="date" name="date" required={isDinner} />
            </label>
            <label>
              {t("Number of people", "Número de personas")}
              <input
                type="number"
                name="people"
                min="1"
                max="500"
                required={isDinner}
              />
            </label>
          </div>
          {isDinner && (
            <>
              <label>
                {t(
                  "Desired local dinner time (optional)",
                  "Hora local deseada para la cena (opcional)",
                )}
                <input
                  type="time"
                  name="dinnerTime"
                  aria-label={t(
                    "Desired local dinner time (optional)",
                    "Hora local deseada para la cena (opcional)",
                  )}
                  aria-describedby="dinner-time-note"
                />
                <small id="dinner-time-note">
                  {t(
                    "Zihuatanejo time · the house must confirm the arrangement.",
                    "Hora de Zihuatanejo · la casa debe confirmar la organización.",
                  )}
                </small>
              </label>
              <label>
                {t("Occasion (optional)", "Ocasión (opcional)")}
                <input name="occasion" maxLength={150} />
              </label>
              <p className="caption">
                {t(
                  "A beach setting is a wish to discuss. The house must confirm the location, setup, weather alternative, menu and price before the dinner is arranged.",
                  "El montaje en la playa es un deseo por consultar. La casa debe confirmar lugar, montaje, alternativa por clima, menú y precio antes de organizar la cena.",
                )}
              </p>
            </>
          )}
          {(kind === "wedding" || kind === "moment") && (
            <>
              <label>
                {t("Date flexibility", "Flexibilidad de fechas")}
                <input name="flexibility" maxLength={2000} />
              </label>
              <label>
                {kind === "wedding"
                  ? t("Ceremony or reception", "Ceremonia o recepción")
                  : t("Occasion", "Ocasión")}
                <input name="occasion" maxLength={150} />
              </label>
              <label>
                {t("Accommodation wishes", "Deseos de alojamiento")}
                <input name="accommodation" maxLength={2000} />
              </label>
            </>
          )}
          <label>
            {t("Your wishes", "Tus deseos")}
            <textarea
              name="message"
              required
              minLength={3}
              maxLength={5000}
              rows={5}
            />
          </label>
          <label>
            {t(
              "Dietary information to share with this request (optional)",
              "Información alimentaria para esta solicitud (opcional)",
            )}
            <textarea name="dietaryNotes" maxLength={2000} rows={2} />
          </label>
          {canBeSurprise && (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={surprise}
                  onChange={(e) => setSurprise(e.target.checked)}
                />
                {t("This is a surprise", "Es una sorpresa")}
              </label>
              {surprise && (
                <label>
                  {t(
                    "Only contact this authorised email address",
                    "Contactar únicamente este correo autorizado",
                  )}
                  <input
                    name="authorisedContact"
                    type="email"
                    required
                    maxLength={254}
                  />
                  <small>
                    {t(
                      "The other traveller is not notified automatically.",
                      "No se avisa automáticamente al otro viajero.",
                    )}
                  </small>
                </label>
              )}
            </>
          )}
          <div className="button-row">
            <button className="pill dark" disabled={busy || Boolean(done)}>
              {busy
                ? t("Saving…", "Guardando…")
                : t("Send my enquiry", "Enviar mi consulta")}
            </button>
            <button
              className="text-link"
              value="draft"
              formNoValidate={isDinner}
              disabled={busy || Boolean(done)}
            >
              {t("Save as draft", "Guardar borrador")}
            </button>
          </div>
          <p className="form-status" role="status">
            {status}
          </p>
          {done && (
            <p>
              {t("Reference", "Referencia")}: <strong>{done.id}</strong> ·{" "}
              <a href={`/${lang}/account/requests/`}>
                {t("Follow my request", "Seguir mi solicitud")}
              </a>
            </p>
          )}
          <p className="caption">
            {t(
              "If saving fails, your text stays in this form. You can also contact the house directly.",
              "Si falla el envío, tu texto permanece en este formulario. También puedes contactar directamente con la casa.",
            )}{" "}
            <a href="mailto:sales.reservations@lacasaquecanta.com">
              sales.reservations@lacasaquecanta.com
            </a>
          </p>
        </form>
      ) : (
        <p role="status">
          {t("Loading your private space…", "Cargando tu espacio privado…")}
        </p>
      )}
    </section>
  );
}
