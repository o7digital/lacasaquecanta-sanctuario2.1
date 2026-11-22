import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { api, message, statusLabel } from "../lib/client";
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
                {r.name} · {r.details.occasion || r.kind}
              </h3>
              <p>{r.details.message}</p>
              <p>
                {r.details.date} ·{" "}
                {r.details.people &&
                  `${r.details.people} ${t("people", "personas")}`}
              </p>
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
                          {t(
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
                      <input name="confirmationReference" maxLength={200} />
                    </label>
                  </div>
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
