import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
const auth = getAuth(process.env.BETTER_AUTH_URL || "http://127.0.0.1:4321");
const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
await getPool().query(
  await readFile(
    new URL("../migrations/001-circle.sql", import.meta.url),
    "utf8",
  ),
);
console.log("El Sanctuario schema ready.");
await getPool().end();
