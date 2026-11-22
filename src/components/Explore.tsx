import { useEffect, useState } from "react";
import type { Content, Locale } from "../lib/schema";
import { experienceCategories, experienceLabels } from "../lib/schema";
import { eventState, localDay, plusDays } from "../lib/travel";
import { api } from "../lib/client";
export default function Explore({
  content,
  lang,
}: {
  content: Content;
  lang: Locale;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [category, setCategory] = useState("all"),
    [context, setContext] = useState("all"),
    [date, setDate] = useState(""),
    [view, setView] = useState("list"),
    [stay, setStay] = useState<any>(),
    [relevant, setRelevant] = useState(false),
    [past, setPast] = useState(false);
  useEffect(() => {
    api("account")
      .then((a) =>
        setStay(
          a.stays.find(
            (s: any) =>
              s.status === "confirmed" &&
              s.departure?.slice(0, 10) > localDay(),
          ),
        ),
      )
      .catch(() => {});
  }, []);
  const start = relevant && stay ? stay.arrival?.slice(0, 10) : date,
    end = relevant && stay ? stay.departure?.slice(0, 10) : date;
  const experiences = content.experiences.filter(
    (e) =>
      (category === "all" || category === e.category) &&
      (context === "all" || context === e.context) &&
      (!start ||
        !e.start ||
        (e.start <= (end || start) && (!e.end || e.end >= start))),
  );
  const events = content.events.filter(
    (e) =>
      (category === "all" || category === "events") &&
      (context === "all" || context === e.context) &&
      (past ? eventState(e) === "past" : eventState(e) !== "past") &&
      (!start || (e.start <= (end || start) && e.end > start)),
  );
  const today = localDay(),
    todayEvents = content.events.filter(
      (e) => e.status !== "cancelled" && e.start <= today && e.end > today,
    );
  return (
    <>
      <section className="day-program">
        <h2>{t("The day’s programme", "El programa de hoy")}</h2>
        {todayEvents.length ? (
          todayEvents.map((e) => (
            <p key={e.id}>
              <a href={`/${lang}/events/${e.id}/`}>{e.title[lang]}</a> ·{" "}
              {e.startTime ||
                t(
                  "Ask the organiser for times",
                  "Consulta horarios al organizador",
                )}{" "}
              · {e.location[lang]}
            </p>
          ))
        ) : (
          <p>
            {t(
              "No confirmed events are listed for today. Ask the house about the day’s possibilities.",
              "No hay eventos confirmados publicados para hoy. Consulta con la casa las posibilidades del día.",
            )}
          </p>
        )}
      </section>
      <div className="explore-filters">
        <label>
          {t("Category", "Categoría")}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">
              {t("All experiences", "Todas las experiencias")}
            </option>
            {experienceCategories.map((c) => (
              <option key={c} value={c}>
                {experienceLabels[c][lang]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Where", "Dónde")}
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="all">{t("Hotel & bay", "Hotel y bahía")}</option>
            <option value="hotel">{t("At the hotel", "En el hotel")}</option>
            <option value="bay">{t("In the bay", "En la bahía")}</option>
          </select>
        </label>
        <label>
          {t("Date", "Fecha")}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={relevant}
          />
        </label>
        <div
          className="view-switch"
          role="group"
          aria-label={t("Display", "Vista")}
        >
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            {t("List", "Lista")}
          </button>
          <button
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            {t("Calendar", "Agenda")}
          </button>
        </div>
      </div>
      {stay && (
        <label className="check">
          <input
            type="checkbox"
            checked={relevant}
            onChange={(e) => setRelevant(e.target.checked)}
          />
          {t(
            "Around my next confirmed stay",
            "Durante mi próxima estancia confirmada",
          )}{" "}
          · {stay.arrival.slice(0, 10)} — {stay.departure.slice(0, 10)}
        </label>
      )}
      <div className={view === "calendar" ? "calendar-list" : "catalogue-grid"}>
        {experiences.map((e) => (
          <a
            className="catalogue-card"
            key={e.id}
            href={`/${lang}/experiences/${e.id}/`}
          >
            {view === "list" && <img src={e.image} alt="" loading="lazy" />}
            <div>
              <p className="eyebrow">
                {experienceLabels[e.category][lang]} ·{" "}
                {e.context === "hotel"
                  ? t("THE HOUSE", "LA CASA")
                  : t("THE BAY", "LA BAHÍA")}
              </p>
              <h3>{e.title[lang]}</h3>
              <p>{e.intro[lang]}</p>
              <span className="status-tag">
                {e.availability === "confirmed"
                  ? e.start
                  : e.availability === "unavailable"
                    ? t("Unavailable", "No disponible")
                    : t(
                        "On request · date to confirm",
                        "Por consultar · fecha por confirmar",
                      )}
              </span>
              {e.status === "sample" && (
                <p className="caption">
                  {t(
                    "Editorial proposal, awaiting hotel approval",
                    "Propuesta editorial pendiente de aprobación del hotel",
                  )}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
      <div className="section-heading">
        <h2>{t("Agenda & events", "Agenda y eventos")}</h2>
        <button className="text-link" onClick={() => setPast(!past)}>
          {past
            ? t("Show upcoming events", "Ver próximos eventos")
            : t("View past events", "Ver eventos pasados")}
        </button>
      </div>
      <div className={view === "calendar" ? "calendar-list" : "catalogue-grid"}>
        {events.map((e) => (
          <a
            className="catalogue-card event-list-card"
            key={e.id}
            href={`/${lang}/events/${e.id}/`}
          >
            <div>
              <p className="eyebrow">
                {e.start} — {plusDays(e.end, -1)}
              </p>
              <h3>{e.title[lang]}</h3>
              <p>
                {e.location[lang]} ·{" "}
                {e.context === "hotel"
                  ? t("Hotel", "Hotel")
                  : t("Bay", "Bahía")}
              </p>
              <p className="status-tag">
                {e.status === "cancelled"
                  ? t("Cancelled", "Cancelado")
                  : eventState(e) === "past"
                    ? t("Past event", "Evento pasado")
                    : t("Listed by organiser", "Publicado por el organizador")}
              </p>
            </div>
          </a>
        ))}
      </div>
      {!events.length && (
        <p className="empty-state">
          {t(
            "No events match these filters.",
            "No hay eventos con estos filtros.",
          )}
        </p>
      )}
    </>
  );
}
