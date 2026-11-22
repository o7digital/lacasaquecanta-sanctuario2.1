export interface Weather {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    sunset: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  fetchedAt: string;
  expiresAt: string;
  stale?: boolean;
}
export function normalizeWeather(value: any, now = new Date()): Weather {
  const current = value?.current,
    daily = value?.daily;
  if (
    !current ||
    !daily ||
    ![
      current.temperature_2m,
      current.apparent_temperature,
      current.weather_code,
      current.wind_speed_10m,
    ].every(Number.isFinite)
  )
    throw new Error("Invalid current weather");
  if (!Number.isFinite(value.utc_offset_seconds))
    throw new Error("Missing timezone offset");
  const validAt =
    Date.parse(current.time + "Z") - value.utc_offset_seconds * 1000;
  if (!Number.isFinite(validAt) || Math.abs(+now - validAt) > 3 * 3600000)
    throw new Error("Outdated weather");
  if (
    !Array.isArray(daily.time) ||
    daily.time.length < 5 ||
    !daily.sunset?.[0] ||
    !Array.isArray(daily.temperature_2m_max) ||
    !Array.isArray(daily.temperature_2m_min)
  )
    throw new Error("Invalid daily weather");
  if (
    ![
      ...daily.temperature_2m_max.slice(0, 5),
      ...daily.temperature_2m_min.slice(0, 5),
    ].every(Number.isFinite)
  )
    throw new Error("Invalid forecast temperatures");
  return {
    current,
    daily,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(+now + 15 * 60000).toISOString(),
  };
}
let cached: Weather | undefined, pending: Promise<Weather> | undefined;
export async function getWeather(): Promise<Weather> {
  if (cached && Date.parse(cached.expiresAt) > Date.now()) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const key = process.env.OPEN_METEO_API_KEY;
      const url = new URL(
        "/v1/forecast",
        key
          ? "https://customer-api.open-meteo.com"
          : "https://api.open-meteo.com",
      );
      url.search = new URLSearchParams({
        latitude: "17.64",
        longitude: "-101.55",
        current:
          "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,sunset",
        timezone: "America/Mexico_City",
        forecast_days: "5",
      }).toString();
      if (key) url.searchParams.set("apikey", key);
      const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
      if (!response.ok) throw new Error("Weather unavailable");
      cached = normalizeWeather(await response.json());
      return cached;
    } catch (error) {
      if (cached && Date.now() - Date.parse(cached.fetchedAt) < 24 * 3600000)
        return { ...cached, stale: true };
      throw error;
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
