import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUv, uvCardMarkup, uvLevel } from "../src/lib/uv";
import { weatherFixture } from "./fixtures/weather";

const now = new Date("2026-11-22T18:15:00Z");
test("UV keeps its local hourly forecast time and distinguishes the current value from the daily peak", () => {
  const data = weatherFixture(now);
  assert.equal(data.uv?.value, 6.8);
  assert.equal(data.uv?.time, "2026-11-22T12:00");
  assert.equal(data.uv?.validAt, "2026-11-22T18:00:00.000Z");
  assert.equal(data.uv?.maximum, 8.4);
  assert.equal(data.uv?.peakTime, "2026-11-22T14:00");
  const markup = uvCardMarkup(data.uv, "en", { now });
  assert.match(markup, /data-uv-value>7</);
  assert.match(markup, /data-uv-level>High</);
  assert.match(markup, /Hourly forecast · 12:00/);
  assert.match(markup, /Peak: 8 · 14:00/);
});
test("a genuine zero at night stays zero and is never treated as missing", () => {
  const night = new Date("2026-11-23T05:15:00Z"),
    data = weatherFixture(night);
  assert.equal(data.uv?.value, 0);
  assert.match(
    uvCardMarkup(data.uv, "es", { now: night }),
    /aria-valuenow="0"/,
  );
  assert.match(
    uvCardMarkup(data.uv, "es", { now: night }),
    /data-uv-level>Bajo</,
  );
});
test("missing, null, negative and nonnumeric UV data cannot become a fabricated zero or complete peak", () => {
  assert.equal(normalizeUv({}, -21600, now), null);
  const time = Array.from(
    { length: 24 },
    (_, hour) => `2026-11-22T${String(hour).padStart(2, "0")}:00`,
  );
  for (const invalid of [null, -1, "0", NaN, Infinity]) {
    const values = Array(24).fill(3);
    values[12] = invalid;
    const uv = normalizeUv({ time, uv_index: values }, -21600, now)!;
    assert.equal(uv.value, null);
    assert.equal(uv.maximum, null);
    const html = uvCardMarkup(uv, "en", { now });
    assert.match(html, /No recent UV data/);
    assert.doesNotMatch(html, /aria-valuenow=/);
  }
});
test("stale forecasts, older hours and injected values cannot appear as a fresh UV reading", () => {
  const uv = weatherFixture(now).uv!;
  assert.doesNotMatch(
    uvCardMarkup(uv, "en", { now, stale: true }),
    /aria-valuenow=|data-uv-chart/,
  );
  assert.doesNotMatch(
    uvCardMarkup(uv, "en", { now: new Date(+now + 2 * 3600000) }),
    /aria-valuenow=/,
  );
  const invalid = structuredClone(uv);
  (invalid.hourly[10] as any).value = "<img src=x onerror=alert(1)>";
  invalid.hourly[11].time = "<script>alert(1)</script>";
  const html = uvCardMarkup(invalid, "en", { now });
  assert.doesNotMatch(html, /<img|<script|onerror/);
  assert.match(html, /gradientUnits="userSpaceOnUse"/);
});
test("UV categories match the displayed rounded whole-number index", () => {
  assert.deepEqual(
    [0, 2.4, 2.5, 5.5, 7.5, 10.5, 14].map(uvLevel),
    [0, 0, 1, 2, 3, 4, 4],
  );
});
