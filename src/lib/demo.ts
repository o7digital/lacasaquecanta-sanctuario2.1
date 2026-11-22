import { randomUUID, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getPool, transaction, ServiceError } from "./db";
import { getAuth } from "./auth";
import { digest } from "./circle";
import { localDay, plusDays } from "./travel";
export async function startDemo(request: Request, mode: string) {
  if (process.env.DEMO_ENABLED !== "true")
    throw new ServiceError("demo_disabled", 404);
  const cookie = request.headers
    .get("cookie")
    ?.match(/(?:^|; )sc_demo=([a-f0-9]{64})(?:;|$)/)?.[1];
  let sandbox = cookie
    ? (
        await getPool().query(
          "SELECT * FROM sc_demo WHERE digest=$1 AND expires_at>now()",
          [digest(cookie)],
        )
      ).rows[0]
    : null;
  let demoToken = cookie;
  if (!sandbox) {
    const tenant = "demo:" + randomUUID(),
      guestId = randomUUID(),
      staffId = randomUUID(),
      otherId = randomUUID();
    demoToken = randomBytes(32).toString("hex");
    const password = randomBytes(32).toString("base64url"),
      passwordHash = await hashPassword(password),
      today = localDay();
    await transaction(async (client) => {
      for (const [userId, name, roles] of [
        [guestId, "Alex · Demo", []],
        [staffId, "House team · Demo", ["admin"]],
        [otherId, "Sam · Demo", []],
      ] as const) {
        await client.query(
          'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',
          [userId, name, `${userId}@demo.invalid`],
        );
        await client.query(
          'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',
          [randomUUID(), userId, passwordHash],
        );
        await client.query(
          "INSERT INTO sc_actor(user_id,tenant_id,roles) VALUES($1,$2,$3)",
          [userId, tenant, [...roles]],
        );
        await client.query(
          "INSERT INTO sc_profile(user_id,data) VALUES($1,$2)",
          [
            userId,
            JSON.stringify({
              language: "en",
              interests: ["gastronomy", "sea"],
              dietary: [],
            }),
          ],
        );
        await client.query(
          "INSERT INTO sc_membership(user_id,tenant_id,member_number,tier,active) VALUES($1,$2,$3,$4,true)",
          [
            userId,
            tenant,
            "DEMO-" + randomBytes(5).toString("hex").toUpperCase(),
            userId === guestId
              ? "Gold"
              : userId === otherId
                ? "Platinum"
                : "Black",
          ],
        );
      }
      const completedId = randomUUID();
      for (const [stayId, arrival, departure, status, reference] of [
        [
          completedId,
          plusDays(today, -90),
          plusDays(today, -85),
          "completed",
          "DEMO-PAST",
        ],
        [
          randomUUID(),
          plusDays(today, 21),
          plusDays(today, 26),
          "confirmed",
          "DEMO-NEXT",
        ],
      ] as const)
        await client.query(
          "INSERT INTO sc_stay(id,tenant_id,guest_id,property,arrival,departure,status,reference,source,imported_at) VALUES($1,$2,$3,'La Casa Que Canta',$4,$5,$6,$7,'isolated-demo',now())",
          [stayId, tenant, guestId, arrival, departure, status, reference],
        );
      await client.query(
        "INSERT INTO sc_program(tenant_id,rules) VALUES($1,$2)",
        [
          tenant,
          JSON.stringify({
            name: "Circle · isolated demonstration",
            active: true,
            tiers: [
              {
                name: "Gold",
                minimumPoints: 0,
                criteria: "Demo assignment only",
              },
              {
                name: "Platinum",
                minimumPoints: 200,
                criteria: "Fictional demo rule",
              },
              {
                name: "Black",
                minimumPoints: 500,
                criteria: "Fictional demo rule",
              },
            ],
            operations: [
              {
                id: "demo-stay",
                kind: "earned",
                trigger: "completed_stay",
                points: 100,
                description: "Fictional demo stay credit",
              },
            ],
            benefits: [],
            terms: "Fictional isolated test rules. No hotel or monetary value.",
          }),
        ],
      );
      await client.query(
        "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,stay_id,actor_id) VALUES($1,$2,$3,$4,100,'earned','Fictional demonstration credit',$5,$6)",
        [
          randomUUID(),
          tenant,
          guestId,
          `stay:${completedId}:demo-stay`,
          completedId,
          staffId,
        ],
      );
      await client.query(
        "INSERT INTO sc_demo(digest,tenant_id,guest_id,staff_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')",
        [digest(demoToken!), tenant, guestId, staffId],
      );
    });
    sandbox = { tenant_id: tenant, guest_id: guestId, staff_id: staffId };
    // A random password is used only to establish the first library-managed session.
    const response = await getAuth(new URL(request.url).origin).api.signInEmail(
      {
        body: {
          email: `${mode === "staff" ? staffId : guestId}@demo.invalid`,
          password,
        },
        asResponse: true,
      },
    );
    if (!response.ok) throw new ServiceError("demo_session_failed", 503);
    response.headers.append(
      "Set-Cookie",
      `sc_demo=${demoToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return response;
  }
  // Rotate the selected demo account's credential; existing sessions remain separate.
  const selected = mode === "staff" ? sandbox.staff_id : sandbox.guest_id,
    password = randomBytes(32).toString("base64url");
  await getPool().query(
    'UPDATE account SET password=$1 WHERE "userId"=$2 AND "providerId"=\'credential\'',
    [await hashPassword(password), selected],
  );
  return getAuth(new URL(request.url).origin).api.signInEmail({
    body: { email: `${selected}@demo.invalid`, password },
    asResponse: true,
  });
}
