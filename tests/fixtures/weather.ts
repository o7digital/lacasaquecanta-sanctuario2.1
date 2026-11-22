import { normalizeWeather } from "../../src/lib/weather";

export function weatherFixture(now = new Date("2026-11-22T18:15:00Z")) {
  const local = new Date(+now - 21600 * 1000).toISOString();
  const date = local.slice(0, 10);
  const daily = Array.from({ length: 5 }, (_, index) =>
    new Date(Date.parse(date + "T12:00:00Z") + index * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const uv = [
    0, 0, 0, 0, 0, 0, 0, 0.1, 0.7, 1.8, 3.4, 5.4, 6.8, 8.1, 8.4, 6.2, 3.1, 1.2,
    0.2, 0, 0, 0, 0, 0,
  ];
  return normalizeWeather(
    {
      utc_offset_seconds: -21600,
      current: {
        time: local.slice(0, 13) + ":00",
        temperature_2m: 28,
        apparent_temperature: 30,
        weather_code: 1,
        wind_speed_10m: 12,
      },
      daily: {
        time: daily,
        sunset: daily.map((day) => day + "T18:10"),
        temperature_2m_max: [29, 30, 30, 31, 31],
        temperature_2m_min: [23, 23, 24, 24, 24],
      },
      hourly: {
        time: uv.map(
          (_, index) => `${date}T${String(index).padStart(2, "0")}:00`,
        ),
        uv_index: uv,
      },
    },
    now,
  );
}
