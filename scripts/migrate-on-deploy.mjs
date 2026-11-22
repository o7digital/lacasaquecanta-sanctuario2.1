import { spawnSync } from "node:child_process";

// Opt in for one reviewed deployment; credentials stay inside Vercel.
if (process.env.SC_MIGRATE_ON_BUILD === "true") {
  if (process.env.VERCEL !== "1") {
    throw new Error("Deployment migrations must run inside Vercel.");
  }
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("Deployment migration configuration is incomplete.");
  }
  const migration = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts"],
    { stdio: "inherit" },
  );
  if (migration.error) throw migration.error;
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}
