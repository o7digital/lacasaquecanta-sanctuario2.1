import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import type { Content } from "../lib/schema";
import { api, message, statusLabel, requestKindLabel } from "../lib/client";
import { interests } from "../lib/circle-schema";
import { bookingUrl, localDay } from "../lib/travel";
import AuthForm from "./AuthForm";
import TravelPlanner from "./TravelPlanner";
import { localizeBrand } from "../lib/brand";
export const interestLabel = (value: string, lang: string) =>
  (
    ({
      gastronomy: ["Gastronomy", "Gastronomía"],
      sea: ["The sea", "El mar"],
      diving: ["Diving", "Buceo"],
      fishing: ["Fishing", "Pesca"],
      yoga: ["Yoga", "Yoga"],
      culture: ["Culture", "Cultura"],
      romance: ["Romance", "Romance"],
      wellbeing: ["Wellbeing", "Bienestar"],
    }) as Record<string, string[]>
  )[value]?.[lang === "en" ? 0 : 1] || value;
export default function Account({
  lang,
  tab,
  content,
  stayId,
}: {
  lang: string;
  tab: string;
  content: Content;
  stayId?: string;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [profile, setProfile] = useState<any>(),
    [card, setCard] = useState<any>(),
    [selectedStay, setSelectedStay] = useState(stayId || "");
  const load = async () => {
    const next = await api("account");
    setData(next);
    setProfile(next.profile);
    setSelectedStay((previous) => {
      if (previous && next.stays.some((stay: any) => stay.id === previous))
        return previous;
      const today = localDay();
      const confirmed = next.stays
        .filter(
          (stay: any) =>
            stay.status === "confirmed" && stay.departure?.slice(0, 10) > today,
        )
        .sort((a: any, b: any) =>
          (a.arrival || "").localeCompare(b.arrival || ""),
        )[0];
      return (
        confirmed?.id ||
        next.stays.find((stay: any) => stay.status === "project")?.id ||
        next.stays[0]?.id ||
        ""
      );
    });
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const run = async (fn: () => Promise<any>, success: string) => {
    setBusy(true);
    setStatus("");
    try {
      await fn();
      await load();
      setStatus(success);
    } catch (e) {
      setStatus(message(e, lang));
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return error ? (
      <>
        <p role="alert">
          {error === "sign_in_required"
            ? t(
                "Your private space starts with a verified account.",
                "Tu espacio privado comienza con una cuenta verificada.",
              )
            : message(new Error(error), lang)}
        </p>
        <AuthForm lang={lang} />
      </>
    ) : (
      <p role="status">
        {t("Opening your private space…", "Abriendo tu espacio privado…")}
      </p>
    );
  const actor = data.actor,
    today = localDay(),
    past = data.stays.filter(
      (s: any) =>
        s.status === "completed" ||
        (s.status === "confirmed" && s.departure?.slice(0, 10) <= today),
    ),
    upcoming = data.stays.filter(
      (s: any) => s.status === "confirmed" && s.departure?.slice(0, 10) > today,
    ),
    projects = data.stays.filter((s: any) => s.status === "project");
  const chosen = data.stays.find((s: any) => s.id === selectedStay);
  const lists: Record<string, any[]> = {
    article: content.articles,
    event: content.events,
    experience: content.experiences,
    offer: content.offers,
  };
  const savedTitle = (s: any) => {
    const item = lists[s.kind]?.find((i) => i.id === s.item_id);
    return item?.locales?.[lang]?.title || item?.title?.[lang] || s.item_id;
  };
  const savedUrl = (s: any) =>
    s.kind === "inspiration"
      ? `/${lang}/#your-stay`
      : `/${lang}/${({ article: "stories", event: "events", experience: "experiences", offer: "offers" } as Record<string, string>)[s.kind] || "explore"}/${s.item_id}/`;
  const update = (key: string, value: unknown) =>
    setProfile({ ...profile, [key]: value });
  const checkList = (
    key: string,
    values: readonly string[],
    labels?: (v: string) => string,
  ) => (
    <div className="choice-grid">
      {values.map((value) => (
        <label className="check" key={value}>
          <input
            type="checkbox"
            checked={profile[key]?.includes(value) || false}
            onChange={(e) =>
              update(
                key,
                e.target.checked
                  ? [...(profile[key] || []), value]
                  : profile[key].filter((v: string) => v !== value),
              )
            }
          />
          {labels ? labels(value) : value}
        </label>
      ))}
    </div>
  );
  const stayCard = (s: any) => (
    <article className="stay-card" key={s.id}>
      <span className={`status-tag ${s.status}`}>
        {statusLabel(s.status, lang)}
      </span>
      <h3>{s.property}</h3>
      <p>
        {s.arrival?.slice(0, 10) ||
          t("Dates to dream about", "Fechas por imaginar")}{" "}
        {s.departure && `— ${s.departure.slice(0, 10)}`}
      </p>
      {s.reference && (
        <p>
          {t("Reference", "Referencia")}: {s.reference}
        </p>
      )}
      <p>{s.data?.notes}</p>
      <button className="text-link" onClick={() => setSelectedStay(s.id)}>
        {t(
          "Open stay, flights & transfers",
          "Abrir estancia, vuelos y traslados",
        )}
      </button>
      {s.status === "project" && (
        <p className="caption">
          {t(
            "A personal project. No reservation or points have been created.",
            "Un proyecto personal. No se ha creado una reserva ni puntos.",
          )}
        </p>
      )}
    </article>
  );
  return (
    <div className="account-shell">
      <aside className="account-nav">
        <p>
          {t("Welcome", "Hola")}, <strong>{actor.name}</strong>
        </p>
        {[
          ["home", t("My space", "Mi espacio")],
          ["stays", t("My stays", "Mis estancias")],
          ["notebook", t("My notebook", "Mi cuaderno")],
          ["requests", t("My requests", "Mis solicitudes")],
          ["card", t("My card", "Mi tarjeta")],
          ["points", t("My points", "Mis puntos")],
          ["profile", t("My profile", "Mi perfil")],
        ].map(([key, label]) => (
          <a
            key={key}
            aria-current={tab === key ? "page" : undefined}
            href={`/${lang}/account/${key === "home" ? "" : key + "/"}`}
          >
            {label}
          </a>
        ))}
        {actor.roles.length > 0 && (
          <a href="/admin/">
            {t("House administration", "Administración de la casa")}
          </a>
        )}
        <button
          className="text-link"
          onClick={async () => {
            await createAuthClient().signOut();
            setData(undefined);
            setProfile(undefined);
            location.href = `/${lang}/login/`;
          }}
        >
          {t("Sign out", "Cerrar sesión")}
        </button>
      </aside>
      <div className="account-content">
        {actor.demo && (
          <div className="demo-banner">
            <strong>
              {t("Isolated demonstration", "Demostración aislada")}
            </strong>
            <p>
              {t(
                "Fictional stays, tiers and points. No commercial hotel benefits apply. Do not enter real personal data.",
                "Estancias, niveles y puntos ficticios. No se aplican beneficios comerciales del hotel. No introduzcas datos personales reales.",
              )}
            </p>
            <button
              className="text-link"
              onClick={() =>
                run(async () => {
                  await api("demo", "POST", { mode: "staff" });
                  location.href = "/admin/";
                }, "")
              }
            >
              {t(
                "Switch to the demonstration reception",
                "Cambiar a la recepción de demostración",
              )}
            </button>
          </div>
        )}
        {tab === "home" && (
          <>
            <p className="eyebrow">
              {
                (
                  {
                    before: t("BEFORE YOUR STAY", "ANTES DE TU ESTANCIA"),
                    during: t("WELCOME TO THE HOUSE", "BIENVENIDO A LA CASA"),
                    after: t("UNTIL WE MEET AGAIN", "HASTA VOLVER A VERNOS"),
                    return: t("YOUR NEXT CHAPTER", "TU PRÓXIMO CAPÍTULO"),
                  } as any
                )[data.stage]
              }
            </p>
            <h2>
              {data.stage === "during"
                ? t("Make yourself at home.", "Estás en tu casa.")
                : data.stage === "before"
                  ? t("Your return is taking shape.", "Tu regreso toma forma.")
                  : t(
                      "A little of here, kept close.",
                      "Un poco de aquí, siempre cerca.",
                    )}
            </h2>
            <div className="summary-grid">
              <a href={`/${lang}/account/stays/`}>
                <strong>{upcoming.length}</strong>
                {t(
                  "Upcoming confirmed stays",
                  "Próximas estancias confirmadas",
                )}
              </a>
              <a href={`/${lang}/account/notebook/`}>
                <strong>{data.saved.length}</strong>
                {t("Saved inspirations", "Inspiraciones guardadas")}
              </a>
              <a href={`/${lang}/account/requests/`}>
                <strong>
                  {
                    data.requests.filter((r: any) =>
                      ["sent", "pending"].includes(r.status),
                    ).length
                  }
                </strong>
                {t("Open enquiries", "Consultas abiertas")}
              </a>
            </div>
            <h2>{t("Chosen around you.", "Elegido para ti.")}</h2>
            {data.suggestions.length ? (
              <div className="catalogue-grid">
                {data.suggestions.map((s: any) => {
                  const e = content.experiences.find((x) => x.id === s.id)!;
                  return (
                    <a
                      className="catalogue-card"
                      key={s.id}
                      href={`/${lang}/experiences/${s.id}/`}
                    >
                      <img src={e.image} alt="" />
                      <div>
                        <h3>{e.title[lang as "en" | "es"]}</h3>
                        <p>
                          {t("Because you chose", "Porque elegiste")}:{" "}
                          {s.reason
                            .map((r: string) => interestLabel(r, lang))
                            .join(", ")}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p>
                {t(
                  "Choose your interests in your profile to see suggestions, with a clear explanation.",
                  "Elige tus intereses en el perfil para ver sugerencias con una explicación clara.",
                )}
              </p>
            )}
            <a className="pill" href={`/${lang}/account/profile/`}>
              {t("Choose my interests", "Elegir mis intereses")}
            </a>
          </>
        )}
        {tab === "home" && data.memberOffers?.length > 0 && (
          <section>
            <h2>
              {t("Offers for your membership", "Ofertas para tu membresía")}
            </h2>
            <div className="catalogue-grid">
              {data.memberOffers.map((o: any) => (
                <a
                  className="catalogue-card"
                  key={o.id}
                  href={`/${lang}/offers/${o.id}/`}
                >
                  <div>
                    <h3>{o.title[lang]}</h3>
                    <p>{o.intro[lang]}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
        {tab === "profile" && profile && (
          <form
            className="v2-form"
            onSubmit={(e) => {
              e.preventDefault();
              const { allergyUpdatedAt, acknowledgedAt, ...editable } = profile;
              void run(
                () =>
                  api("profile", "PUT", {
                    profile: editable,
                    version: data.profileVersion,
                  }),
                t(
                  "Your private preferences have been saved.",
                  "Tus preferencias privadas se han guardado.",
                ),
              );
            }}
          >
            <h2>
              {t(
                "The things that make it yours.",
                "Lo que hace tu estancia tuya.",
              )}
            </h2>
            <div className="form-grid">
              <label>
                {t("First name", "Nombre")}
                <input
                  value={profile.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                {t("Last name", "Apellidos")}
                <input
                  value={profile.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  maxLength={100}
                />
              </label>
            </div>
            <label>
              {t("Phone (optional)", "Teléfono (opcional)")}
              <input
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
                type="tel"
                maxLength={40}
              />
            </label>
            <label>
              {t("Communication language", "Idioma de comunicación")}
              <select
                value={profile.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <fieldset>
              <legend>{t("What I enjoy", "Lo que me gusta")}</legend>
              {checkList("interests", interests, (v) => interestLabel(v, lang))}
            </fieldset>
            <fieldset>
              <legend>
                {t("What I prefer to avoid", "Lo que prefiero evitar")}
              </legend>
              {checkList("avoid", interests, (v) => interestLabel(v, lang))}
              <label>
                {t("Anything else to avoid", "Algo más que prefiero evitar")}
                <textarea
                  value={profile.avoidText}
                  onChange={(e) => update("avoidText", e.target.value)}
                  maxLength={2000}
                />
              </label>
            </fieldset>
            <fieldset>
              <legend>
                {t(
                  "Dietary preferences (optional)",
                  "Preferencias alimentarias (opcional)",
                )}
              </legend>
              {checkList(
                "dietary",
                ["gluten-free", "vegetarian", "vegan", "other"],
                (v) =>
                  ({
                    "gluten-free": t("Gluten-free", "Sin gluten"),
                    vegetarian: t("Vegetarian", "Vegetariano"),
                    vegan: t("Vegan", "Vegano"),
                    other: t("Other", "Otra"),
                  })[v]!,
              )}
              <label>
                {t(
                  "Dietary preference notes",
                  "Notas sobre preferencias alimentarias",
                )}
                <textarea
                  value={profile.dietaryNotes}
                  onChange={(e) => update("dietaryNotes", e.target.value)}
                  maxLength={2000}
                />
              </label>
            </fieldset>
            <fieldset>
              <legend>
                {t("Allergies & intolerances", "Alergias e intolerancias")}
              </legend>
              <p className="caption">
                {t(
                  "Separate from preferences. Optional, editable and deletable. The kitchen must confirm any dietary arrangement.",
                  "Distintas de las preferencias. Opcionales, modificables y eliminables. La cocina debe confirmar cualquier atención alimentaria.",
                )}
              </p>
              <label>
                {t(
                  "Allergies or intolerances to disclose",
                  "Alergias o intolerancias que deseas compartir",
                )}
                <textarea
                  value={profile.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                  maxLength={2000}
                />
              </label>
              <label>
                {t(
                  "Who may use this information?",
                  "¿Quién puede utilizar esta información?",
                )}
                <select
                  value={profile.allergySharing}
                  onChange={(e) => update("allergySharing", e.target.value)}
                >
                  <option value="private">{t("Only me", "Solo yo")}</option>
                  <option value="concierge">
                    {t("Reception / concierge", "Recepción / conserjería")}
                  </option>
                  <option value="kitchen">
                    {t(
                      "Reception, to coordinate with the kitchen",
                      "Recepción, para coordinar con cocina",
                    )}
                  </option>
                </select>
              </label>
              {profile.allergyUpdatedAt && (
                <p className="caption">
                  {t("Updated", "Actualizado")}:{" "}
                  {new Date(profile.allergyUpdatedAt).toLocaleString(lang)}
                </p>
              )}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setProfile({
                    ...profile,
                    allergies: "",
                    allergySharing: "private",
                  });
                }}
              >
                {t(
                  "Delete my allergy information",
                  "Eliminar mi información de alergias",
                )}
              </button>
              <p>
                {profile.acknowledgedAt
                  ? t(
                      "The house has acknowledged your preferences. This does not confirm a specific dietary service.",
                      "La casa ha leído tus preferencias. Esto no confirma un servicio alimentario concreto.",
                    )
                  : t(
                      "Your preferences have not yet been acknowledged by the house.",
                      "La casa aún no ha confirmado la lectura de tus preferencias.",
                    )}
              </p>
            </fieldset>
            <label>
              {t(
                "Practical preferences: room, pillows, rhythm…",
                "Preferencias prácticas: habitación, almohadas, ritmo…",
              )}
              <textarea
                value={profile.practical}
                onChange={(e) => update("practical", e.target.value)}
                maxLength={2000}
              />
            </label>
            <label>
              {t(
                "Moments I would like to share",
                "Momentos que me gustaría compartir",
              )}
              <textarea
                value={profile.celebrations}
                onChange={(e) => update("celebrations", e.target.value)}
                maxLength={2000}
              />
            </label>
            <fieldset>
              <legend>
                {t(
                  "Editorial communication preferences",
                  "Preferencias de comunicación editorial",
                )}
              </legend>
              <p>
                {t(
                  "These choices are separate from your account and service enquiries. Email subscription requires the newsletter provider’s confirmation.",
                  "Estas opciones son independientes de la cuenta y las consultas de servicio. La suscripción por correo requiere confirmación del proveedor de newsletter.",
                )}
              </p>
              {["email", "notifications"].map((channel) => (
                <label className="check" key={channel}>
                  <input
                    type="checkbox"
                    checked={profile.communications[channel]}
                    onChange={(e) =>
                      update("communications", {
                        ...profile.communications,
                        [channel]: e.target.checked,
                      })
                    }
                  />
                  {channel === "email"
                    ? t(
                        "I would like editorial emails",
                        "Me gustaría recibir correos editoriales",
                      )
                    : t(
                        "I am interested in optional notifications (not active yet)",
                        "Me interesan las notificaciones opcionales (aún no activas)",
                      )}
                </label>
              ))}
              <div className="choice-grid">
                {[
                  ["chef", t("The chef’s letter", "La carta del chef")],
                  ["journal", t("Journal", "Revista")],
                  ["activities", t("Activities", "Actividades")],
                  ["events", t("Events", "Eventos")],
                  ["offers", t("Offers", "Ofertas")],
                  ["weddings", t("Weddings", "Bodas")],
                  ["moments", t("Special Moments", "Momentos especiales")],
                ].map(([key, label]) => (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      checked={profile.communications.topics.includes(key)}
                      onChange={(e) =>
                        update("communications", {
                          ...profile.communications,
                          topics: e.target.checked
                            ? [...profile.communications.topics, key]
                            : profile.communications.topics.filter(
                                (v: string) => v !== key,
                              ),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="pill dark" disabled={busy}>
              {t(
                "Save my private preferences",
                "Guardar mis preferencias privadas",
              )}
            </button>
          </form>
        )}
        {tab === "stays" && (
          <>
            <h2>{t("My upcoming stays", "Mis próximas estancias")}</h2>
            <p>
              {t(
                "Keep your arrival and departure flights with the stay, and follow your taxi or transfer enquiries in the same space.",
                "Conserva tus vuelos de llegada y salida con la estancia y sigue tus consultas de taxi o traslado en el mismo espacio.",
              )}
            </p>
            <div className="stay-grid">{upcoming.map(stayCard)}</div>
            {!upcoming.length && (
              <p>
                {t(
                  "No confirmed stay is linked to your account yet.",
                  "Aún no hay una estancia confirmada vinculada a tu cuenta.",
                )}
              </p>
            )}
            <h2>{t("My past stays", "Mis estancias pasadas")}</h2>
            <div className="stay-grid">{past.map(stayCard)}</div>
            {!past.length && (
              <p>
                {t(
                  "The house can link your verified past visits. Self-declared visits do not award points.",
                  "La casa puede vincular visitas anteriores verificadas. Las visitas declaradas por el cliente no conceden puntos.",
                )}
              </p>
            )}
            <h2>{t("My return projects", "Mis proyectos de regreso")}</h2>
            <div className="stay-grid">{projects.map(stayCard)}</div>
            <form
              className="v2-form inset-panel"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void run(
                  async () => {
                    const result = await api("plans", "POST", {
                      property: fd.get("property"),
                      arrival: fd.get("arrival") || undefined,
                      departure: fd.get("departure") || undefined,
                      notes: fd.get("notes"),
                    });
                    setSelectedStay(result.id);
                  },
                  t(
                    "Your return project has been saved.",
                    "Tu proyecto de regreso se ha guardado.",
                  ),
                );
              }}
            >
              <h3>{t("Prepare my return", "Preparar mi regreso")}</h3>
              <label>
                {t(
                  "The house or a private villa",
                  "La casa o una villa privada",
                )}
                <select name="property">
                  <option>La Casa Que Canta</option>
                  <option>El Ensueño</option>
                  <option>El Murmullo</option>
                </select>
              </label>
              <div className="form-grid">
                <label>
                  {t("Arrival (optional)", "Llegada (opcional)")}
                  <input name="arrival" type="date" min={today} />
                </label>
                <label>
                  {t("Departure (optional)", "Salida (opcional)")}
                  <input name="departure" type="date" min={today} />
                </label>
              </div>
              <label>
                {t("My wishes", "Mis deseos")}
                <textarea name="notes" maxLength={2000} />
              </label>
              <button className="pill dark" disabled={busy}>
                {t("Save my project", "Guardar mi proyecto")}
              </button>
              <p className="caption">
                {t(
                  "This saves a project, not a reservation.",
                  "Se guarda un proyecto, no una reserva.",
                )}
              </p>
              <a href={bookingUrl(lang as any)} target="_blank" rel="noopener">
                {t(
                  "Check official hotel availability",
                  "Consultar disponibilidad oficial del hotel",
                )}
              </a>
            </form>
            {chosen && (
              <section className="inset-panel">
                <h2>
                  {t("This stay’s notebook", "El cuaderno de esta estancia")}
                </h2>
                <p>
                  {chosen.property} · {chosen.arrival?.slice(0, 10)} ·{" "}
                  {statusLabel(chosen.status, lang)}
                </p>
                <h3>{t("Inspirations", "Inspiraciones")}</h3>
                {data.saved
                  .filter((s: any) => s.data.stayId === chosen.id)
                  .map((s: any) => (
                    <p key={s.kind + s.item_id}>
                      <a href={savedUrl(s)}>{savedTitle(s)}</a>
                    </p>
                  ))}
                <h3>{t("Associated requests", "Solicitudes asociadas")}</h3>
                {data.requests
                  .filter((r: any) => r.stay_id === chosen.id)
                  .map((r: any) => (
                    <p key={r.id}>
                      {r.details.message} · {statusLabel(r.status, lang)}
                    </p>
                  ))}
                <a href={`/${lang}/account/notebook/`}>
                  {t(
                    "Add inspirations from my notebook",
                    "Añadir inspiraciones de mi cuaderno",
                  )}
                </a>
                <TravelPlanner
                  key={chosen.id}
                  lang={lang}
                  travelerName={actor.name}
                  stay={chosen}
                  plan={data.travelPlans?.find(
                    (plan: any) => plan.stayId === chosen.id,
                  )}
                  requests={data.requests}
                  demo={actor.demo}
                  onSaved={load}
                />
              </section>
            )}
          </>
        )}
        {tab === "notebook" && (
          <>
            <h2>{t("My synced notebook", "Mi cuaderno sincronizado")}</h2>
            <p>
              {t(
                "Available after signing in on another device. Inspirations are kept separate from confirmed arrangements.",
                "Disponible al iniciar sesión en otro dispositivo. Las inspiraciones se distinguen de los servicios confirmados.",
              )}
            </p>
            <button
              className="pill"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    const read = (key: string, fallback: any) => {
                      try {
                        return (
                          JSON.parse(localStorage.getItem(key) || "null") ||
                          fallback
                        );
                      } catch {
                        return fallback;
                      }
                    };
                    return api("notebook/import", "POST", {
                      articles: read("sanctuario-saved", []),
                      events: read("sanctuario-events", []),
                      experiences: read("sanctuario-experiences", []),
                      offers: read("sanctuario-offers", []),
                      stay: read("sanctuario-stay", null),
                      inspiration: read("sanctuario-plan", null),
                    });
                  },
                  t(
                    "Device notebook imported without duplicates.",
                    "Cuaderno de este dispositivo importado sin duplicados.",
                  ),
                )
              }
            >
              {t(
                "Import the notebook on this device",
                "Importar el cuaderno de este dispositivo",
              )}
            </button>
            <label>
              {t(
                "Add inspirations to this stay or project",
                "Añadir inspiraciones a esta estancia o proyecto",
              )}
              <select
                value={selectedStay}
                onChange={(e) => setSelectedStay(e.target.value)}
              >
                <option value="">
                  {t("Choose a stay", "Elige una estancia")}
                </option>
                {data.stays
                  .filter((s: any) => s.status !== "cancelled")
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.property} ·{" "}
                      {s.arrival?.slice(0, 10) || statusLabel(s.status, lang)}
                    </option>
                  ))}
              </select>
            </label>
            {!data.saved.length && (
              <p className="empty-state">
                {t(
                  "Save a story or an experience to begin.",
                  "Guarda una historia o una experiencia para comenzar.",
                )}
              </p>
            )}
            {data.saved.map((s: any) => (
              <article className="notebook-entry" key={s.kind + s.item_id}>
                <p className="eyebrow">{t("INSPIRATION", "INSPIRACIÓN")}</p>
                <h3>
                  <a href={savedUrl(s)}>{savedTitle(s)}</a>
                </h3>
                {s.data.stayId && (
                  <p>
                    {t(
                      "Added to a stay notebook",
                      "Añadido al cuaderno de una estancia",
                    )}
                  </p>
                )}
                <div className="button-row">
                  <button
                    className="text-link"
                    disabled={!selectedStay || busy}
                    onClick={() =>
                      run(
                        () =>
                          api("notebook", "POST", {
                            kind: s.kind,
                            itemId: s.item_id,
                            stayId: selectedStay,
                          }),
                        t(
                          "Added as an inspiration. No booking was made.",
                          "Añadido como inspiración. No se ha reservado.",
                        ),
                      )
                    }
                  >
                    {t("Add to my stay", "Añadir a mi estancia")}
                  </button>
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          api("notebook", "POST", {
                            kind: s.kind,
                            itemId: s.item_id,
                            remove: true,
                          }),
                        t(
                          "Removed from the notebook.",
                          "Eliminado del cuaderno.",
                        ),
                      )
                    }
                  >
                    {t("Remove", "Eliminar")}
                  </button>
                </div>
              </article>
            ))}
          </>
        )}
        {tab === "requests" && (
          <>
            <h2>
              {t(
                "A conversation, kept together.",
                "Una conversación en un solo lugar.",
              )}
            </h2>
            {!data.requests.length && (
              <p className="empty-state">
                {t(
                  "Your requests will appear here after they have been saved successfully.",
                  "Tus solicitudes aparecerán aquí tras guardarse correctamente.",
                )}
              </p>
            )}
            {data.requests.map((r: any) => (
              <article className="request-record" key={r.id}>
                <p className="status-tag">{statusLabel(r.status, lang)}</p>
                <h3>{r.details.occasion || requestKindLabel(r.kind, lang)}</h3>
                <p>{r.details.message}</p>
                {r.kind === "transport" && r.details.transport && (
                  <section className="transport-request-details">
                    <h4>
                      {t("Your requested transfer", "Tu traslado solicitado")}
                    </h4>
                    <dl className="detail-grid">
                      {[
                        [
                          t("Direction", "Tipo"),
                          r.details.transport.direction === "arrival"
                            ? t("Arrival", "Llegada")
                            : r.details.transport.direction === "departure"
                              ? t("Departure", "Salida")
                              : t("Other journey", "Otro trayecto"),
                        ],
                        [
                          t("Pickup location", "Lugar de recogida"),
                          r.details.transport.pickup,
                        ],
                        [
                          t("Destination", "Destino"),
                          r.details.transport.dropoff,
                        ],
                        [
                          t(
                            "Requested local pickup",
                            "Recogida local solicitada",
                          ),
                          `${r.details.transport.pickupDate} · ${r.details.transport.pickupTime}`,
                        ],
                        [
                          t("Passengers", "Pasajeros"),
                          r.details.transport.passengers,
                        ],
                        [
                          t("Luggage pieces", "Piezas de equipaje"),
                          r.details.transport.luggage,
                        ],
                        [
                          t("Flight number", "Número de vuelo"),
                          r.details.transport.flightNumber || "—",
                        ],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {r.details.transport.notes && (
                      <p>{r.details.transport.notes}</p>
                    )}
                  </section>
                )}
                {r.status === "confirmed" &&
                  r.details.transportConfirmation && (
                    <section className="transport-confirmation">
                      <h4>
                        {t(
                          "Transfer confirmed by the house",
                          "Traslado confirmado por la casa",
                        )}
                      </h4>
                      <dl className="detail-grid">
                        {[
                          [
                            t("Provider", "Prestador"),
                            r.details.transportConfirmation.provider,
                          ],
                          [
                            t(
                              "Confirmed local pickup",
                              "Recogida local confirmada",
                            ),
                            `${r.details.transportConfirmation.pickupDate} · ${r.details.transportConfirmation.pickupTime}`,
                          ],
                          [
                            t("Driver", "Conductor"),
                            r.details.transportConfirmation.driver ||
                              t(
                                "To be communicated by the house",
                                "Por comunicar por la casa",
                              ),
                          ],
                          [
                            t("Vehicle", "Vehículo"),
                            r.details.transportConfirmation.vehicle ||
                              t(
                                "To be communicated by the house",
                                "Por comunicar por la casa",
                              ),
                          ],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {r.details.transportConfirmation.price !== undefined &&
                        r.details.transportConfirmation.currency && (
                          <p>
                            {t("Confirmed price", "Precio confirmado")}:{" "}
                            {r.details.transportConfirmation.price}{" "}
                            {r.details.transportConfirmation.currency}
                          </p>
                        )}
                    </section>
                  )}
                {r.details.dining?.localTime && (
                  <p>
                    {t(
                      "Requested local dinner time",
                      "Hora local deseada para la cena",
                    )}
                    : {r.details.dining.localTime} ·{" "}
                    {t(
                      "On the beach, subject to confirmation",
                      "En la playa, sujeto a confirmación",
                    )}
                  </p>
                )}
                <p className="caption">
                  {t("Reference", "Referencia")}: {r.id}
                </p>
                {r.surprise && (
                  <p>
                    {t(
                      "Surprise · authorised contact only",
                      "Sorpresa · solo contacto autorizado",
                    )}
                    : {r.contact_email}
                  </p>
                )}
                <ol className="request-history">
                  {r.history.map((h: any, i: number) => (
                    <li key={i}>
                      <time>{new Date(h.created_at).toLocaleString(lang)}</time>
                      <strong>{statusLabel(h.status, lang)}</strong>
                      {h.message && <p>{h.message}</p>}
                    </li>
                  ))}
                </ol>
                <form
                  className="v2-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    void run(
                      async () => {
                        await api("requests/" + r.id + "/messages", "POST", {
                          message: f.get("message"),
                        });
                        form.reset();
                      },
                      t(
                        "Your reply has been saved.",
                        "Tu respuesta se ha guardado.",
                      ),
                    );
                  }}
                >
                  <label>
                    {t(
                      "Continue the conversation",
                      "Continuar la conversación",
                    )}
                    <textarea name="message" required maxLength={5000} />
                  </label>
                  <button className="pill" disabled={busy}>
                    {t("Save my reply", "Guardar mi respuesta")}
                  </button>
                </form>
                <div className="button-row">
                  {r.status === "draft" && (
                    <button
                      className="pill"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            api("requests/" + r.id, "PUT", { status: "sent" }),
                          t("Request sent.", "Solicitud enviada."),
                        )
                      }
                    >
                      {t("Send this draft", "Enviar este borrador")}
                    </button>
                  )}
                  {["draft", "sent", "pending", "confirmed"].includes(
                    r.status,
                  ) && (
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            api("requests/" + r.id, "PUT", {
                              status: "cancelled",
                            }),
                          t("Request cancelled.", "Solicitud cancelada."),
                        )
                      }
                    >
                      {t("Cancel request", "Cancelar solicitud")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </>
        )}
        {tab === "card" && (
          <>
            <h2>{localizeBrand(data.program.name, lang)}</h2>
            <div
              className={`member-card ${(data.membership.tier || "pending").toLowerCase()}`}
            >
              <span>
                {localizeBrand(data.program.name, lang).toUpperCase()}
              </span>
              <h3>{actor.name}</h3>
              <strong>
                {data.membership.active
                  ? data.membership.tier
                  : t(
                      "Membership awaiting activation",
                      "Membresía pendiente de activación",
                    )}
              </strong>
              <p>{data.membership.member_number}</p>
              {data.membership.active && (
                <p>
                  {data.membership.points}{" "}
                  {t("available points", "puntos disponibles")}
                </p>
              )}
            </div>
            {data.membership.active ? (
              <>
                <button
                  className="pill"
                  disabled={busy}
                  onClick={() =>
                    run(
                      async () => setCard(await api("card", "POST", {})),
                      t(
                        "Card code refreshed. Valid for ten minutes.",
                        "Código actualizado. Válido durante diez minutos.",
                      ),
                    )
                  }
                >
                  {t(
                    "Show / refresh my personal QR",
                    "Mostrar / actualizar mi QR personal",
                  )}
                </button>
                {card?.qr && (
                  <div className="personal-qr">
                    <img
                      src={card.qr}
                      alt={t(
                        "Personal membership QR for authorised staff",
                        "QR personal de miembro para personal autorizado",
                      )}
                    />
                    <p className="caption">
                      {t("Valid until", "Válido hasta")}:{" "}
                      {new Date(card.expiresAt).toLocaleTimeString(lang)}
                    </p>
                    <details>
                      <summary>
                        {t(
                          "Manual code for reception",
                          "Código manual para recepción",
                        )}
                      </summary>
                      <code>{card.token}</code>
                    </details>
                  </div>
                )}
                <button
                  className="text-link"
                  onClick={() =>
                    run(
                      async () => {
                        await api("card/revoke", "POST", {});
                        setCard(undefined);
                      },
                      t(
                        "All existing card codes have been revoked.",
                        "Todos los códigos anteriores se han revocado.",
                      ),
                    )
                  }
                >
                  {t("Revoke my card codes", "Revocar mis códigos de tarjeta")}
                </button>
              </>
            ) : (
              <p>
                {t(
                  "The house must activate its programme and assign your level. No points rule or benefit is assumed.",
                  "La casa debe activar el programa y asignar tu nivel. No se supone ningún barémo ni beneficio.",
                )}
              </p>
            )}
            <h3>{t("My activated benefits", "Mis beneficios activados")}</h3>
            {data.membership.benefits.length ? (
              data.membership.benefits.map((b: any) => (
                <p key={b.id}>{b.title}</p>
              ))
            ) : (
              <p>
                {t(
                  "No benefit has been activated for this membership.",
                  "No se ha activado ningún beneficio para esta membresía.",
                )}
              </p>
            )}
          </>
        )}
        {tab === "points" && (
          <>
            <h2>
              {t(
                "Every point, accounted for.",
                "Cada punto tiene su historia.",
              )}
            </h2>
            <p className="balance">
              {data.membership.points} <span>{t("points", "puntos")}</span>
            </p>
            {!data.program.active && (
              <p>
                {t(
                  "The loyalty programme has not been activated by the house.",
                  "La casa aún no ha activado el programa de fidelidad.",
                )}
              </p>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      t("Date", "Fecha"),
                      t("Reason", "Motivo"),
                      t("Movement", "Movimiento"),
                      t("Points", "Puntos"),
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((p: any) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString(lang)}</td>
                      <td>{p.reason}</td>
                      <td>{statusLabel(p.kind, lang)}</td>
                      <td>
                        {p.points > 0 ? "+" : ""}
                        {p.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.points.length && (
              <p>
                {t(
                  "No point transactions yet.",
                  "Aún no hay movimientos de puntos.",
                )}
              </p>
            )}
          </>
        )}
        <p className="form-status" role="status">
          {status}
        </p>
      </div>
    </div>
  );
}
