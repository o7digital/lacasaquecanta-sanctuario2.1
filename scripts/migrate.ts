import { readFile, readdir } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
const auth = getAuth(process.env.BETTER_AUTH_URL || "http://127.0.0.1:4321");
const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
const directory = new URL("../migrations/", import.meta.url);
for (const file of (await readdir(directory))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort())
  await getPool().query(await readFile(new URL(file, directory), "utf8"));
console.log("El Sanctuario schema ready.");
await getPool().end();
