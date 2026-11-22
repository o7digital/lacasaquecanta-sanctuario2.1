import { useEffect, useState } from "react";
import UvIndex from "./UvIndex";
export default function Weather({ lang }: { lang: string }) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [data, setData] = useState<any>(),
    [error, setError] = useState(false),
    [unit, setUnit] = useState("C"),
    [clock, setClock] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/api/weather", {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) throw Error();
        const d = await r.json();
        if (active) {
          setData(d);
          setError(Boolean(d.stale));
        }
      } catch {
        if (active) setError(true);
      }
    };
    void load();
    const timer = setInterval(load, 15 * 60000);
    const refreshVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "America/Mexico_City",
        }).format(new Date()),
      );
    tick();
    const c = setInterval(tick, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(c);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
    };
  }, [lang]);
  const temp = (n: number) =>
    Math.round(unit === "F" ? (n * 9) / 5 + 32 : n) + `°${unit}`;
  const description = data
    ? data.current.weather_code === 0
      ? t("Clear sky", "Cielo despejado")
      : data.current.weather_code <= 3
        ? t("Cloudy", "Nublado")
        : data.current.weather_code >= 95
          ? t("Thunderstorms", "Tormentas")
          : data.current.weather_code >= 51
            ? t("Rain", "Lluvia")
            : t("Coastal conditions", "Condiciones costeras")
    : "";
  return (
    <section className="today-weather">
      <div>
        <p className="eyebrow">{t("TODAY IN THE BAY", "HOY EN LA BAHÍA")}</p>
        <h2>Zihuatanejo</h2>
        <p>{clock}</p>
        <label className="unit-select">
          {t("Temperature unit", "Unidad de temperatura")}
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="C">°C</option>
            <option value="F">°F</option>
          </select>
        </label>
      </div>
      <div aria-live="polite">
        <strong className="today-temp">
          {data ? temp(data.current.temperature_2m) : "—"}
        </strong>
        <p>
          {data
            ? description
            : error
              ? t(
                  "Weather temporarily unavailable",
                  "Clima temporalmente no disponible",
                )
              : t("Loading current weather…", "Cargando el clima actual…")}
        </p>
        {data && (
          <>
            <p>
              {t("Feels like", "Sensación")}:{" "}
              {temp(data.current.apparent_temperature)} ·{" "}
              {t("Low / high", "Mín. / máx.")}:{" "}
              {temp(data.daily.temperature_2m_min[0])} /{" "}
              {temp(data.daily.temperature_2m_max[0])}
            </p>
            <p className={error ? "error-text" : "caption"}>
              {error
                ? t(
                    "Last received data — refresh unavailable: ",
                    "Último dato recibido — no se pudo actualizar: ",
                  )
                : t("Updated: ", "Actualizado: ")}
              {new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Mexico_City",
              }).format(new Date(data.fetchedAt))}
            </p>
          </>
        )}
        <p className="caption">
          {t(
            "Sea activities require confirmation from the hotel or provider.",
            "Las actividades en el mar requieren confirmación del hotel o prestador.",
          )}{" "}
          <a href="https://open-meteo.com/" rel="noopener" target="_blank">
            Open-Meteo
          </a>
        </p>
      </div>
      <UvIndex
        uv={data?.uv}
        lang={lang}
        stale={Boolean(data?.stale) || error}
        loading={!data && !error}
      />
    </section>
  );
}
