import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { api, message, statusLabel, requestKindLabel } from "../lib/client";
import { EDITORIAL_BRANCH } from "../lib/schema";
import AuthForm from "./AuthForm";
import Editor from "./Editor";
import CatalogueEditor from "./CatalogueEditor";
import RuleEditor from "./RuleEditor";
export default function StaffConsole() {
  const [lang, setLang] = useState("en");
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [tab, setTab] = useState("requests"),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [guest, setGuest] = useState<any>(),
    [selected, setSelected] = useState(""),
    [scan, setScan] = useState(""),
    [member, setMember] = useState<any>(),
    [integration, setIntegration] = useState<any>(),
    [enrolQR, setEnrolQR] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    camera = useRef<{ stop: () => void } | null>(null);
  const load = async () => {
    const d = await api("staff");
    setData(d);
    return d;
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
    api("status")
      .then(setIntegration)
      .catch(() => {});
    return () => camera.current?.stop();
  }, []);
  useEffect(
    () => () => {
      camera.current?.stop();
    },
    [tab],
  );
  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    setStatus("");
    try {
      await fn();
      await load();
      setStatus(ok);
    } catch (e) {
      setStatus(message(e, lang));
    } finally {
      setBusy(false);
    }
  };
  const selectGuest = async (userId: string) => {
    setSelected(userId);
    try {
      setGuest(await api("staff/guests/" + userId));
    } catch (e) {
      setStatus(message(e, lang));
    }
  };
  if (!data)
    return (
      <>
        <div className="button-row">
          <button
            className="text-link"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
          >
            EN / ES
          </button>
        </div>
        {error && (
          <p className="form-status" role="status">
            {message(new Error(error), lang)}
          </p>
        )}
        <AuthForm lang={lang} staff />
      </>
    );
  const actor = data.actor,
    admin = actor.roles.includes("admin"),
    can = (role: string) => admin || actor.roles.includes(role);
  const tabs = [
    ...(can("concierge")
      ? [
          ["requests", t("Requests", "Solicitudes")],
          ["guests", t("Guests & stays", "Clientes y estancias")],
        ]
      : []),
    ...(can("editor")
      ? [
          ["editor", t("Articles & events", "Artículos y eventos")],
          ["catalogue", t("Issues & experiences", "Números y experiencias")],
        ]
      : []),
    ...(can("loyalty")
      ? [
          ["loyalty", t("Loyalty", "Fidelidad")],
          ["rules", t("Programme rules", "Reglas del programa")],
        ]
      : []),
    ...(can("concierge") || can("loyalty")
      ? [["scan", t("Scan a card", "Escanear tarjeta")]]
      : []),
    ...(admin
      ? [
          ["settings", t("Staff & integrations", "Personal e integraciones")],
          ["audit", t("Audit trail", "Historial de cambios")],
        ]
      : []),
  ];
  const activeTab = tabs.some(([key]) => key === tab) ? tab : tabs[0]?.[0];
  return (
    <div className="staff-console">
      <div className="button-row">
        <p>
          {actor.name} · {actor.roles.join(", ")}
        </p>
        <button
          className="text-link"
          onClick={() => setLang(lang === "en" ? "es" : "en")}
        >
          EN / ES
        </button>
        <button
          className="text-link"
          onClick={async () => {
            await createAuthClient().signOut();
            location.reload();
          }}
        >
          {t("Sign out", "Cerrar sesión")}
        </button>
      </div>
      {actor.demo && (
        <div className="demo-banner">
          <strong>
            {t(
              "Isolated demonstration reception",
              "Recepción de demostración aislada",
            )}
          </strong>
          <p>
            {t(
              "Every guest, stay and loyalty rule in this sandbox is fictional. Edits do not change the hotel’s public content or records.",
              "Todos los clientes, estancias y reglas de este espacio son ficticios. Los cambios no modifican el contenido público ni los registros del hotel.",
            )}
          </p>
          <button
            className="text-link"
            onClick={() =>
              run(async () => {
                await api("demo", "POST", { mode: "guest" });
                location.href = `/${lang}/account/`;
              }, "")
            }
          >
            {t(
              "Return to the demonstration guest",
              "Volver al cliente de demostración",
            )}
          </button>
        </div>
      )}
      <nav
        className="staff-tabs"
        aria-label={t("Administration sections", "Secciones de administración")}
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            aria-pressed={activeTab === key}
            onClick={() => {
              setTab(key);
              setStatus("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {activeTab === "editor" && <Editor branch={EDITORIAL_BRANCH} server />}
      {activeTab === "catalogue" && <CatalogueEditor lang={lang} />}
      {activeTab === "requests" && (
        <>
          <h2>
            {t(
              "The house’s request book",
              "El libro de solicitudes de la casa",
            )}
          </h2>
          {!data.requests.length && (
            <p className="empty-state">
              {t(
                "No enquiries have been saved yet.",
                "Aún no hay consultas guardadas.",
              )}
            </p>
          )}
          {data.requests.map((r: any) => (
            <article className="staff-record" key={r.id}>
              <span className="status-tag">{statusLabel(r.status, lang)}</span>
              <h3>
                {r.name} ·{" "}
                {r.details.occasion || requestKindLabel(r.kind, lang)}
              </h3>
              <p>{r.details.message}</p>
              <p>
                {r.details.date} ·{" "}
                {r.details.people &&
                  `${r.details.people} ${t("people", "personas")}`}
              </p>
              {r.details.dining && (
                <p>
                  {t(
                    "Requested beach dinner time",
                    "Hora solicitada para la cena en la playa",
                  )}
                  :{" "}
                  {r.details.dining.localTime ||
                    t("To be arranged", "Por acordar")}{" "}
                  · {t("Zihuatanejo local time", "Hora local de Zihuatanejo")}
                </p>
              )}
              {r.details.transport && (
                <section className="inset-panel">
                  <h3>
                    {t(
                      "Requested taxi / transfer",
                      "Taxi / traslado solicitado",
                    )}
                  </h3>
                  <dl className="detail-grid">
                    <div>
                      <dt>{t("Pickup", "Recogida")}</dt>
                      <dd>
                        {r.details.transport.pickup} ·{" "}
                        {r.details.transport.pickupDate}{" "}
                        {r.details.transport.pickupTime}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Destination", "Destino")}</dt>
                      <dd>{r.details.transport.dropoff}</dd>
                    </div>
                    <div>
                      <dt>
                        {t("Passengers / luggage", "Pasajeros / equipaje")}
                      </dt>
                      <dd>
                        {r.details.transport.passengers} /{" "}
                        {r.details.transport.luggage}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Related flight", "Vuelo relacionado")}</dt>
                      <dd>{r.details.transport.flightNumber || "—"}</dd>
                    </div>
                  </dl>
                  <p>{r.details.transport.notes}</p>
                  <p className="caption">
                    {t(
                      "Pickup time is local to the pickup point. These are the guest’s requested arrangements, awaiting the provider’s confirmation.",
                      "La hora es local al lugar de recogida. Son los deseos del cliente, pendientes de confirmación del prestador.",
                    )}
                  </p>
                </section>
              )}
              {r.travel_itinerary && (
                <details>
                  <summary>
                    {t(
                      "Current flight details shared by the guest",
                      "Datos actuales de vuelos compartidos por el cliente",
                    )}
                  </summary>
                  {(["arrival", "departure"] as const).map(
                    (leg) =>
                      r.travel_itinerary[leg] && (
                        <p key={leg}>
                          <strong>
                            {leg === "arrival"
                              ? t("Arrival", "Llegada")
                              : t("Departure", "Salida")}
                          </strong>
                          : {r.travel_itinerary[leg].airline}{" "}
                          {r.travel_itinerary[leg].number} ·{" "}
                          {r.travel_itinerary[leg].date}{" "}
                          {r.travel_itinerary[leg].time} ·{" "}
                          {r.travel_itinerary[leg].airport} ·{" "}
                          {r.travel_itinerary[leg].route}
                        </p>
                      ),
                  )}
                  <p className="caption">
                    {t(
                      "Guest-provided flight information. A flight change does not change an already sent transfer request; agree any revised pickup in this dossier.",
                      "Datos del vuelo proporcionados por el cliente. Cambiar un vuelo no modifica un traslado ya solicitado; acuerda cualquier cambio de recogida en este expediente.",
                    )}
                  </p>
                </details>
              )}
              {r.details.transportConfirmation && (
                <section className="inset-panel">
                  <h3>
                    {t(
                      "Confirmed transport arrangements",
                      "Datos del traslado confirmados",
                    )}
                  </h3>
                  <p>
                    {r.details.transportConfirmation.provider} ·{" "}
                    {r.details.transportConfirmation.pickupDate}{" "}
                    {r.details.transportConfirmation.pickupTime}
                  </p>
                  <p>
                    {r.details.transportConfirmation.driver} ·{" "}
                    {r.details.transportConfirmation.vehicle}
                  </p>
                  {r.details.transportConfirmation.price !== undefined && (
                    <p>
                      {r.details.transportConfirmation.price}{" "}
                      {r.details.transportConfirmation.currency}
                    </p>
                  )}
                </section>
              )}
              {r.details.flexibility && (
                <p>
                  {t("Flexibility", "Flexibilidad")}: {r.details.flexibility}
                </p>
              )}
              {r.details.dietaryNotes && (
                <p>
                  {t(
                    "Voluntarily shared dietary notes",
                    "Notas alimentarias compartidas voluntariamente",
                  )}
                  : {r.details.dietaryNotes}
                </p>
              )}
              <p>
                <strong>
                  {r.surprise
                    ? t(
                        "Surprise: use only this authorised contact",
                        "Sorpresa: utilizar únicamente este contacto autorizado",
                      )
                    : t("Contact", "Contacto")}
                </strong>
                : {r.contact_email}
              </p>
              <p className="caption">
                {t("Reference", "Referencia")}: {r.id}
              </p>
              {!["cancelled", "declined"].includes(r.status) && (
                <form
                  className="v2-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(
                      () =>
                        api("requests/" + r.id, "PUT", {
                          status: f.get("status"),
                          message: f.get("message"),
                          confirmationReference: f.get("confirmationReference"),
                          transportConfirmation:
                            r.kind === "transport" &&
                            f.get("status") === "confirmed"
                              ? {
                                  provider: f.get("provider"),
                                  pickupDate: f.get("confirmedPickupDate"),
                                  pickupTime: f.get("confirmedPickupTime"),
                                  driver: f.get("driver") || "",
                                  vehicle: f.get("vehicle") || "",
                                  price:
                                    f.get("confirmedPrice") !== ""
                                      ? Number(f.get("confirmedPrice"))
                                      : undefined,
                                  currency:
                                    f.get("confirmedCurrency") || undefined,
                                }
                              : undefined,
                        }),
                      t(
                        "Response saved in the guest’s request.",
                        "Respuesta guardada en la solicitud del cliente.",
                      ),
                    );
                  }}
                >
                  <div className="form-grid">
                    <label>
                      {t("Next status", "Siguiente estado")}
                      <select name="status">
                        <option value={r.status}>
                          {r.kind === "transport" && r.status === "confirmed"
                            ? t(
                                "Update confirmed transport and reply",
                                "Actualizar el traslado confirmado y responder",
                              )
                            : t(
                                "Reply without changing status",
                                "Responder sin cambiar el estado",
                              )}
                        </option>
                        {(r.status === "draft"
                          ? ["sent", "cancelled"]
                          : r.status === "confirmed"
                            ? ["cancelled"]
                            : ["pending", "confirmed", "declined", "cancelled"]
                        )
                          .filter((v) => v !== r.status)
                          .map((v) => (
                            <option key={v} value={v}>
                              {statusLabel(v, lang)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Actual confirmation reference (required to confirm)",
                        "Referencia real de confirmación (obligatoria para confirmar)",
                      )}
                      <input
                        name="confirmationReference"
                        maxLength={200}
                        defaultValue={r.details.confirmationReference || ""}
                      />
                    </label>
                  </div>
                  {r.kind === "transport" && (
                    <fieldset>
                      <legend>
                        {t(
                          "Provider-confirmed transport",
                          "Traslado confirmado por el prestador",
                        )}
                      </legend>
                      <p className="caption">
                        {t(
                          "Confirm or update these details only after the provider accepts them. A message and confirmation reference are required; changes are recorded in the request audit.",
                          "Confirma o actualiza estos datos cuando el prestador los acepte. Se requieren mensaje y referencia de confirmación; los cambios quedan registrados en el historial de la solicitud.",
                        )}
                      </p>
                      <label>
                        {t(
                          "Actual taxi / transfer provider",
                          "Prestador real del taxi / traslado",
                        )}
                        <input
                          name="provider"
                          maxLength={200}
                          defaultValue={
                            r.details.transportConfirmation?.provider || ""
                          }
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          {t(
                            "Confirmed pickup date",
                            "Fecha de recogida confirmada",
                          )}
                          <input
                            name="confirmedPickupDate"
                            type="date"
                            defaultValue={
                              r.details.transportConfirmation?.pickupDate ||
                              r.details.transport?.pickupDate
                            }
                          />
                        </label>
                        <label>
                          {t(
                            "Confirmed pickup time",
                            "Hora de recogida confirmada",
                          )}
                          <input
                            name="confirmedPickupTime"
                            type="time"
                            defaultValue={
                              r.details.transportConfirmation?.pickupTime ||
                              r.details.transport?.pickupTime
                            }
                          />
                        </label>
                      </div>
                      <label>
                        {t("Driver (if known)", "Conductor (si se conoce)")}
                        <input
                          name="driver"
                          maxLength={200}
                          defaultValue={
                            r.details.transportConfirmation?.driver || ""
                          }
                        />
                      </label>
                      <label>
                        {t("Vehicle (if known)", "Vehículo (si se conoce)")}
                        <input
                          name="vehicle"
                          maxLength={200}
                          defaultValue={
                            r.details.transportConfirmation?.vehicle || ""
                          }
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          {t(
                            "Confirmed price (if known)",
                            "Precio confirmado (si se conoce)",
                          )}
                          <input
                            name="confirmedPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={
                              r.details.transportConfirmation?.price ?? ""
                            }
                          />
                        </label>
                        <label>
                          {t("Currency", "Divisa")}
                          <input
                            name="confirmedCurrency"
                            maxLength={3}
                            pattern="[A-Z]{3}"
                            defaultValue={
                              r.details.transportConfirmation?.currency || ""
                            }
                          />
                        </label>
                      </div>
                    </fieldset>
                  )}
                  <label>
                    {t(
                      "Reply to the authorised contact, visible in the guest’s account",
                      "Respuesta al contacto autorizado, visible en la cuenta del cliente",
                    )}
                    <textarea name="message" required maxLength={5000} />
                  </label>
                  <button className="pill dark" disabled={busy}>
                    {t("Save response", "Guardar respuesta")}
                  </button>
                </form>
              )}
            </article>
          ))}
        </>
      )}
      {["guests", "loyalty"].includes(activeTab) && (
        <>
          <label className="v2-form">
            {t("Choose a member", "Elige un miembro")}
            <select
              value={selected}
              onChange={(e) => void selectGuest(e.target.value)}
            >
              <option value="">{t("Select", "Seleccionar")}</option>
              {data.guests.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.member_number || u.email}
                </option>
              ))}
            </select>
          </label>
          {selected && guest && (
            <>
              {activeTab === "guests" && (
                <section className="inset-panel">
                  <h2>
                    {t(
                      "Preferences shared with reception",
                      "Preferencias compartidas con recepción",
                    )}
                  </h2>
                  <dl className="detail-grid">
                    {[
                      ["interests", t("Interests", "Intereses")],
                      ["avoid", t("Prefer to avoid", "Prefiere evitar")],
                      [
                        "avoidText",
                        t(
                          "Notes to avoid",
                          "Notas sobre lo que prefiere evitar",
                        ),
                      ],
                      [
                        "dietary",
                        t("Dietary preferences", "Preferencias alimentarias"),
                      ],
                      [
                        "dietaryNotes",
                        t("Dietary notes", "Notas alimentarias"),
                      ],
                      [
                        "allergies",
                        t(
                          "Allergies shared with the house",
                          "Alergias compartidas con la casa",
                        ),
                      ],
                      [
                        "practical",
                        t("Practical preferences", "Preferencias prácticas"),
                      ],
                      ["celebrations", t("Celebrations", "Celebraciones")],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>
                          {Array.isArray(guest.profile?.[key])
                            ? guest.profile[key].join(", ")
                            : guest.profile?.[key] || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    {t(
                      "Acknowledgement records that the team has read the preferences; it does not promise a dietary service.",
                      "La confirmación de lectura registra que el equipo ha leído las preferencias; no promete un servicio alimentario.",
                    )}
                  </p>
                  <button
                    className="pill"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          api("staff/preferences/ack", "POST", {
                            userId: selected,
                          }),
                        t(
                          "Preferences acknowledged.",
                          "Preferencias marcadas como leídas.",
                        ),
                      )
                    }
                  >
                    {t(
                      "Acknowledge preferences",
                      "Confirmar lectura de preferencias",
                    )}
                  </button>
                  <h3>
                    {t(
                      "Verified stay history",
                      "Historial de estancias verificadas",
                    )}
                  </h3>
                  {guest.stays.map((s: any) => (
                    <p key={s.id}>
                      {s.property} · {s.arrival?.slice(0, 10)} —{" "}
                      {s.departure?.slice(0, 10)} ·{" "}
                      {statusLabel(s.status, lang)} · {s.source} · {s.reference}
                    </p>
                  ))}
                  {guest.travelPlans?.length > 0 && (
                    <section>
                      <h3>
                        {t(
                          "Shared arrival & departure flights",
                          "Vuelos compartidos de llegada y salida",
                        )}
                      </h3>
                      {guest.travelPlans.map((travel: any) => (
                        <div className="staff-record" key={travel.stayId}>
                          {(["arrival", "departure"] as const).map(
                            (leg) =>
                              travel.itinerary[leg] && (
                                <p key={leg}>
                                  <strong>
                                    {leg === "arrival"
                                      ? t("Arrival", "Llegada")
                                      : t("Departure", "Salida")}
                                  </strong>
                                  : {travel.itinerary[leg].airline}{" "}
                                  {travel.itinerary[leg].number} ·{" "}
                                  {travel.itinerary[leg].date}{" "}
                                  {travel.itinerary[leg].time} ·{" "}
                                  {travel.itinerary[leg].airport} ·{" "}
                                  {travel.itinerary[leg].route}
                                </p>
                              ),
                          )}
                        </div>
                      ))}
                    </section>
                  )}
                  <form
                    className="v2-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(
                        async () => {
                          await api("staff/stays", "POST", {
                            userId: selected,
                            property: f.get("property"),
                            arrival: f.get("arrival"),
                            departure: f.get("departure"),
                            status: f.get("status"),
                            reference: f.get("reference"),
                            origin: f.get("origin"),
                            notes: f.get("notes"),
                          });
                          await selectGuest(selected);
                        },
                        t(
                          "Verified stay imported. No points were automatically awarded.",
                          "Estancia verificada importada. No se han concedido puntos automáticamente.",
                        ),
                      );
                    }}
                  >
                    <h3>
                      {t(
                        "Import a stay verified by the house",
                        "Importar estancia verificada por la casa",
                      )}
                    </h3>
                    <label>
                      {t("Property", "Establecimiento")}
                      <select name="property">
                        <option>La Casa Que Canta</option>
                        <option>El Ensueño</option>
                        <option>El Murmullo</option>
                      </select>
                    </label>
                    <div className="form-grid">
                      <label>
                        {t("Arrival", "Llegada")}
                        <input type="date" name="arrival" required />
                      </label>
                      <label>
                        {t("Departure", "Salida")}
                        <input type="date" name="departure" required />
                      </label>
                    </div>
                    <label>
                      {t("Verified status", "Estado verificado")}
                      <select name="status">
                        {["confirmed", "completed", "cancelled"].map((s) => (
                          <option value={s} key={s}>
                            {statusLabel(s, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Hotel booking reference",
                        "Referencia de reserva del hotel",
                      )}
                      <input name="reference" required maxLength={200} />
                    </label>
                    <label>
                      {t(
                        "Actual source of verification",
                        "Fuente real de verificación",
                      )}
                      <input name="origin" required maxLength={200} />
                      <small>
                        {t(
                          "For example, the name of the hotel register you checked. Do not assume PMS access from a booking link.",
                          "Por ejemplo, el nombre del registro del hotel consultado. Un enlace de reserva no concede acceso al PMS.",
                        )}
                      </small>
                    </label>
                    <label>
                      {t("Import notes", "Notas de importación")}
                      <textarea name="notes" maxLength={2000} />
                    </label>
                    <button className="pill dark" disabled={busy}>
                      {t(
                        "Import verified stay",
                        "Importar estancia verificada",
                      )}
                    </button>
                  </form>
                </section>
              )}
              {can("loyalty") && (
                <>
                  <form
                    className="v2-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(
                        () =>
                          api("staff/tiers", "PUT", {
                            userId: selected,
                            tier: f.get("tier"),
                            reason: f.get("reason"),
                          }),
                        t(
                          "Tier assignment saved with its reason.",
                          "Nivel asignado con su justificación.",
                        ),
                      );
                    }}
                  >
                    <h3>
                      {t(
                        "Assign an approved membership level",
                        "Asignar un nivel aprobado",
                      )}
                    </h3>
                    <label>
                      {t("Tier", "Nivel")}
                      <select name="tier">
                        {["Gold", "Platinum", "Black"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Justification under the programme rules",
                        "Justificación según las reglas del programa",
                      )}
                      <textarea name="reason" required maxLength={2000} />
                    </label>
                    <button
                      className="pill"
                      disabled={busy || !data.program?.rules.active}
                    >
                      {t("Assign level", "Asignar nivel")}
                    </button>
                  </form>
                  <form
                    className="v2-form inset-panel"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(
                        async () => {
                          await api("staff/points", "POST", {
                            userId: selected,
                            operation: f.get("operation"),
                            stayId: f.get("stayId"),
                            requestId: f.get("requestId"),
                            reference: f.get("reference"),
                          });
                          await selectGuest(selected);
                        },
                        t(
                          "Validated operation recorded. Repeating the same event cannot duplicate its points.",
                          "Operación validada registrada. Repetir el mismo evento no duplica sus puntos.",
                        ),
                      );
                    }}
                  >
                    <h3>
                      {t(
                        "Record a validated operation",
                        "Registrar una operación validada",
                      )}
                    </h3>
                    <label>
                      {t("Configured rule", "Regla configurada")}
                      <select name="operation" required>
                        {data.program?.rules.operations.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.description}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Verified completed stay, if applicable",
                        "Estancia finalizada verificada, si corresponde",
                      )}
                      <select name="stayId">
                        <option value="">—</option>
                        {guest.stays
                          .filter((s: any) => s.status === "completed")
                          .map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.reference} · {s.arrival.slice(0, 10)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Confirmed experience request, if applicable",
                        "Solicitud de experiencia confirmada, si corresponde",
                      )}
                      <select name="requestId">
                        <option value="">—</option>
                        {data.requests
                          .filter(
                            (r: any) =>
                              r.guest_id === selected &&
                              r.kind === "experience" &&
                              r.status === "confirmed",
                          )
                          .map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.id}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {t(
                        "Verified redemption reference, if applicable",
                        "Referencia de canje verificada, si corresponde",
                      )}
                      <input name="reference" maxLength={150} />
                    </label>
                    <button
                      className="pill dark"
                      disabled={busy || !data.program?.rules.active}
                    >
                      {t("Record operation", "Registrar operación")}
                    </button>
                  </form>
                  <h3>{t("Points ledger", "Registro de puntos")}</h3>
                  {guest.points.map((p: any) => (
                    <div className="staff-record" key={p.id}>
                      <p>
                        {p.points} · {statusLabel(p.kind, lang)} · {p.reason}
                      </p>
                      {p.kind !== "reversed" && (
                        <form
                          className="v2-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void run(
                              async () => {
                                await api("staff/points", "POST", {
                                  userId: selected,
                                  reverseId: p.id,
                                  reason: f.get("reason"),
                                });
                                await selectGuest(selected);
                              },
                              t(
                                "A reversal was appended. The original transaction remains in the ledger.",
                                "Se añadió una anulación. El movimiento original permanece en el registro.",
                              ),
                            );
                          }}
                        >
                          <label>
                            {t("Reason for correction", "Motivo de corrección")}
                            <input name="reason" required maxLength={2000} />
                          </label>
                          <button className="text-link" disabled={busy}>
                            {t("Append reversal", "Añadir anulación")}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
      {activeTab === "rules" && data.program && (
        <RuleEditor
          lang={lang}
          initial={data.program}
          onSaved={() => void load()}
        />
      )}
      {activeTab === "scan" && (
        <>
          <h2>
            {t(
              "Identify a member securely",
              "Identificar un miembro de forma segura",
            )}
          </h2>
          <p>
            {t(
              "A scan identifies a member. It does not prove a stay or award points.",
              "Un escaneo identifica a un miembro. No demuestra una estancia ni concede puntos.",
            )}
          </p>
          <video ref={video} className="scanner-video" playsInline muted />
          <button
            className="pill"
            onClick={async () => {
              setStatus("");
              try {
                const { BrowserQRCodeReader } = await import("@zxing/browser");
                const reader = new BrowserQRCodeReader();
                camera.current = await reader.decodeFromVideoDevice(
                  undefined,
                  video.current!,
                  async (result) => {
                    if (result) {
                      camera.current?.stop();
                      setScan(result.getText());
                      try {
                        setMember(
                          await api("staff/scan", "POST", {
                            token: result.getText(),
                          }),
                        );
                      } catch (e) {
                        setStatus(message(e, lang));
                      }
                    }
                  },
                );
              } catch {
                setStatus(
                  t(
                    "Camera unavailable. Enter the personal code below.",
                    "Cámara no disponible. Introduce el código personal abajo.",
                  ),
                );
              }
            }}
          >
            {t("Use the camera", "Utilizar cámara")}
          </button>
          <form
            className="v2-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                async () =>
                  setMember(await api("staff/scan", "POST", { token: scan })),
                t(
                  "Member identified. No points were awarded.",
                  "Miembro identificado. No se han concedido puntos.",
                ),
              );
            }}
          >
            <label>
              {t(
                "Personal code (manual entry)",
                "Código personal (entrada manual)",
              )}
              <input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <button className="pill dark" disabled={busy}>
              {t("Identify member", "Identificar miembro")}
            </button>
          </form>
          {member && (
            <section className="inset-panel">
              <h3>{member.name}</h3>
              <p>
                {member.member_number} · {member.tier} · {member.points}{" "}
                {t("points", "puntos")}
              </p>
              <button
                className="text-link"
                onClick={() => {
                  setTab(can("concierge") ? "guests" : "loyalty");
                  void selectGuest(member.user_id);
                }}
              >
                {t(
                  "Open authorised operations",
                  "Abrir operaciones autorizadas",
                )}
              </button>
            </section>
          )}
          <h3>{t("Enrolment QR", "QR de adhesión")}</h3>
          <p>
            {t(
              "A separate public code opens the account enrolment page.",
              "Un código público distinto abre la página de adhesión.",
            )}
          </p>
          <button
            className="pill"
            onClick={async () => {
              const qr = await import("qrcode");
              setEnrolQR(
                await qr.toDataURL(`${location.origin}/${lang}/join/`, {
                  width: 240,
                  margin: 2,
                }),
              );
            }}
          >
            {t("Show enrolment QR", "Mostrar QR de adhesión")}
          </button>
          {enrolQR && (
            <img
              width="240"
              height="240"
              src={enrolQR}
              alt={t("Public enrolment QR", "QR público de adhesión")}
            />
          )}
        </>
      )}
      {activeTab === "settings" && (
        <>
          <h2>{t("House-team permissions", "Permisos del equipo")}</h2>
          <form
            className="v2-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(
                () =>
                  api("staff/roles", "PUT", {
                    email: f.get("email"),
                    roles: f.getAll("role"),
                  }),
                t(
                  "Staff permissions updated.",
                  "Permisos de personal actualizados.",
                ),
              );
            }}
          >
            <label>
              {t("Verified account email", "Correo de una cuenta verificada")}
              <input name="email" type="email" required />
            </label>
            <fieldset>
              <legend>{t("Assigned roles", "Roles asignados")}</legend>
              {[
                ["editor", t("Editorial", "Edición")],
                [
                  "concierge",
                  t("Reception / concierge", "Recepción / conserjería"),
                ],
                ["loyalty", t("Loyalty", "Fidelidad")],
                ["admin", t("Administration", "Administración")],
              ].map(([key, label]) => (
                <label className="check" key={key}>
                  <input type="checkbox" name="role" value={key} />
                  {label}
                </label>
              ))}
            </fieldset>
            <button className="pill dark" disabled={busy}>
              {t("Set permissions", "Asignar permisos")}
            </button>
          </form>
          <h3>{t("Integration status", "Estado de integraciones")}</h3>
          <ul>
            <li>
              {t("Private database", "Base privada")}:{" "}
              {integration?.database
                ? t("Connected", "Conectada")
                : t("Awaiting activation", "Pendiente de activación")}
            </li>
            <li>
              {t("Identity verification emails", "Correos de verificación")}:{" "}
              {integration?.identity
                ? t("Configured", "Configurados")
                : t("Not configured", "Sin configurar")}
            </li>
            <li>
              Newsletter:{" "}
              {integration?.newsletter
                ? t(
                    "Configured; provider confirmation required",
                    "Configurada; requiere confirmación del proveedor",
                  )
                : t("Not activated", "No activada")}
            </li>
            <li>
              {t(
                "Hotel reservation data connection",
                "Conexión a datos de reservas del hotel",
              )}
              :{" "}
              {t(
                "Not configured; verified manual import is available",
                "Sin configurar; importación manual verificada disponible",
              )}
            </li>
          </ul>
          <p className="caption">
            {t(
              "Connection status does not certify delivery of an email or access to hotel inventory.",
              "El estado de configuración no certifica la entrega de un correo ni acceso al inventario del hotel.",
            )}
          </p>
        </>
      )}
      {activeTab === "audit" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Date", "Fecha")}</th>
                <th>{t("Action", "Acción")}</th>
                <th>{t("Record", "Registro")}</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.map((a: any, i: number) => (
                <tr key={i}>
                  <td>{new Date(a.created_at).toLocaleString(lang)}</td>
                  <td>{a.action}</td>
                  <td>{a.entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="staff-status" role="status">
        {status}
      </p>
    </div>
  );
}
