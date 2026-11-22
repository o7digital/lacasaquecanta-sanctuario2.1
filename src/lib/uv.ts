export interface UvPoint {
  time: string;
  value: number | null;
}
export interface UvForecast {
  date: string;
  time: string;
  validAt: string;
  value: number | null;
  maximum: number | null;
  peakTime: string | null;
  hourly: UvPoint[];
}
const uvValue = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;

// Open-Meteo UV values describe the preceding hour, rather than a live sensor.
export function normalizeUv(
  hourly: any,
  offsetSeconds: number,
  now: Date,
): UvForecast | null {
  if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.uv_index))
    return null;
  const local = new Date(+now + offsetSeconds * 1000).toISOString();
  const date = local.slice(0, 10),
    hour = Number(local.slice(11, 13));
  const values = new Map<string, unknown>();
  hourly.time.forEach((time: unknown, index: number) => {
    if (
      typeof time === "string" &&
      time.startsWith(date + "T") &&
      /T(?:[01]\d|2[0-3]):00$/.test(time)
    )
      values.set(time, hourly.uv_index[index]);
  });
  const hours = Array.from({ length: 24 }, (_, index) => {
    const time = `${date}T${String(index).padStart(2, "0")}:00`,
      value = values.get(time);
    return { time, value: uvValue(value) ? value : null };
  });
  if (hours.every((point) => point.value === null)) return null;
  const current = hours[hour];
  const maximum = hours.every((point) => point.value !== null)
    ? Math.max(...hours.map((point) => point.value!))
    : null;
  return {
    date,
    time: current.time,
    validAt: new Date(
      Date.parse(current.time + "Z") - offsetSeconds * 1000,
    ).toISOString(),
    value: current.value,
    maximum,
    peakTime:
      maximum !== null && maximum > 0
        ? hours.find((point) => point.value === maximum)!.time
        : null,
    hourly: hours,
  };
}

export function uvLevel(value: number) {
  const index = Math.round(value);
  return index < 3 ? 0 : index < 6 ? 1 : index < 8 ? 2 : index < 11 ? 3 : 4;
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const validTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(value);

export function uvCardMarkup(
  uv: UvForecast | null | undefined,
  lang: string,
  options: { stale?: boolean; loading?: boolean; now?: Date; id?: string } = {},
) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const now = options.now || new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const age = uv ? +now - Date.parse(uv.validAt) : Infinity;
  const usable =
    !!uv &&
    !options.stale &&
    uv.date === today &&
    age >= -60000 &&
    age <= 90 * 60000;
  const current = usable && uvValue(uv?.value) ? uv.value : null;
  const labels =
    lang === "en"
      ? ["Low", "Moderate", "High", "Very high", "Extreme"]
      : ["Bajo", "Moderado", "Alto", "Muy alto", "Extremo"];
  const level = current === null ? "" : labels[uvLevel(current)];
  const time = usable && validTime(uv?.time) ? uv.time.slice(11) : "";
  const id = (options.id || "uv-forecast").replace(/[^a-z0-9-]/gi, "");
  const hours = usable && Array.isArray(uv?.hourly) ? uv.hourly : [];
  const points = hours.map((point, index) =>
    validTime(point?.time) &&
    point.time.startsWith(today + "T") &&
    uvValue(point.value)
      ? {
          hour: Number(point.time.slice(11, 13)),
          value: point.value,
          time: point.time.slice(11),
          index,
        }
      : null,
  );
  const ceiling = Math.max(
    12,
    ...points.map((point) => (point ? Math.ceil(point.value) : 0)),
  );
  const x = (hour: number) => 12 + (hour / 23) * 336;
  const y = (value: number) => 100 - (value / ceiling) * 88;
  let line = "",
    area = "",
    segment: { hour: number; value: number }[] = [];
  const finish = () => {
    if (!segment.length) return;
    const path = segment
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(point.hour).toFixed(2)},${y(point.value).toFixed(2)}`,
      )
      .join(" ");
    line += path + " ";
    area += `${path} L${x(segment.at(-1)!.hour).toFixed(2)},100 L${x(segment[0].hour).toFixed(2)},100 Z `;
    segment = [];
  };
  points.forEach((point) => {
    if (point) segment.push(point);
    else finish();
  });
  finish();
  const maximum = usable && uvValue(uv?.maximum) ? uv.maximum : null;
  const peakTime =
    usable && validTime(uv?.peakTime) ? uv.peakTime.slice(11) : "";
  const currentHour = time ? Number(time.slice(0, 2)) : 0;
  const number = current === null ? "—" : String(Math.round(current));
  const unavailable = options.loading
    ? t("Loading UV forecast…", "Cargando la previsión UV…")
    : t("No recent UV data", "Sin datos UV recientes");
  const description = points
    .filter((point) => point !== null)
    .map((point) => `${point.time}: ${point.value}`)
    .join("; ");
  const stops = [
    [0, "#289500"],
    [3, "#eacb28"],
    [6, "#f88920"],
    [8, "#dc3548"],
    [11, "#8055bd"],
  ] as const;
  const meter =
    current === null
      ? ""
      : `role="meter" aria-label="${t("UV index", "Índice UV")}" aria-valuemin="0" aria-valuemax="11" aria-valuenow="${Math.min(11, Math.round(current))}" aria-valuetext="${number} · ${level} · ${time}"`;
  return `<section class="uv-card" data-uv-card aria-label="${t("UV index", "Índice UV")}">
    <div class="uv-card-header"><p class="uv-title"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>${t("UV INDEX", "ÍNDICE UV")}</p><span class="uv-location">Zihuatanejo</span></div>
    <div class="uv-reading"><strong class="uv-number" data-uv-value>${number}</strong><div><p class="uv-level" data-uv-level>${escape(level || unavailable)}</p><p class="uv-caption">${time ? `${t("Hourly forecast", "Previsión horaria")} · ${time}` : t("Hourly forecast", "Previsión horaria")}</p></div></div>
    <div class="uv-scale" ${meter}><div class="uv-spectrum">${current === null ? "" : `<span class="uv-marker" style="left:${Math.min(100, (current / 11) * 100).toFixed(2)}%"></span>`}</div><div class="uv-scale-labels" aria-hidden="true">${[0, 3, 6, 8, 11].map((value) => `<span style="left:${(value / 11) * 100}%">${value === 11 ? "11+" : value}</span>`).join("")}</div></div>
    ${line ? `<div class="uv-graph" data-uv-chart><div class="uv-graph-heading"><span>${t("Through the day", "A lo largo del día")}</span><span>${maximum === null ? "" : `${t("Peak", "Máximo")}: ${Math.round(maximum)}${peakTime ? ` · ${peakTime}` : ""}`}</span></div><div class="uv-plot"><svg class="uv-chart" viewBox="0 0 360 112" preserveAspectRatio="none" role="img" aria-label="${t("Hourly UV forecast for Zihuatanejo", "Previsión UV por hora de Zihuatanejo")}"><desc>${escape(description)}</desc><defs><linearGradient id="${id}-colors" x1="0" y1="100" x2="0" y2="12" gradientUnits="userSpaceOnUse">${stops.map(([value, color]) => `<stop offset="${Math.min(100, (value / ceiling) * 100).toFixed(2)}%" stop-color="${color}"/>`).join("")}<stop offset="100%" stop-color="#8055bd"/></linearGradient></defs>${[0, Math.round(ceiling / 2), ceiling].map((value) => `<path class="uv-grid" d="M12 ${y(value)}H348"/>`).join("")}<path d="${area}" fill="url(#${id}-colors)" opacity=".11"/><path d="${line}" stroke="url(#${id}-colors)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${current === null ? "" : `<path class="uv-now-line" d="M${x(currentHour)} 12V100"/>`}</svg>${current === null ? "" : `<span class="uv-chart-marker" aria-hidden="true" style="left:${(x(currentHour) / 360) * 100}%;top:${(y(current) / 112) * 100}%"></span>`}</div><div class="uv-hours" aria-hidden="true">${[0, 6, 12, 18, 23].map((hour) => `<span style="left:${(x(hour) / 360) * 100}%">${String(hour).padStart(2, "0")}:00</span>`).join("")}</div></div>` : ""}
    <p class="uv-footnote">${t("Hourly UV estimate · local time", "Estimación UV por hora · hora local")} · <a href="https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-%28uv%29-index" target="_blank" rel="noopener noreferrer">${t("UV scale", "Escala UV")}</a></p>
  </section>`;
}
