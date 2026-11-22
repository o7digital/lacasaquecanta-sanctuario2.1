import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const path = ".env.local";
let text = "";
try {
  text = await readFile(path, "utf8");
} catch {}
const defaults = {
  DATABASE_URL:
    "postgresql://sanctuario:sanctuario-local-only@127.0.0.1:5543/sanctuario_v2",
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
  DEMO_ENABLED: "true",
};
for (const [key, value] of Object.entries(defaults))
  if (!new RegExp("^" + key + "=", "m").test(text))
    text += "\n" + key + "=" + value + "\n";
await writeFile(path, text, { mode: 0o600 });
await chmod(path, 0o600);
console.log(
  "Local configuration ready. No credentials were printed. Start the local database, then run npm run db:migrate.",
);
