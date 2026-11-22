import { betterAuth } from "better-auth";
import { getPool, ServiceError, transaction } from "./db";
import { AsyncLocalStorage } from "node:async_hooks";
export const emailDeliveryContext = new AsyncLocalStorage<{
  failed: boolean;
}>();
export const mailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
async function sendIdentityEmail(to: string, url: string, reset = false) {
  if (!mailConfigured()) throw new ServiceError("email_not_configured", 503);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM,
        to: [to],
        subject: reset
          ? "El Sanctuario · Recover access / Recuperar acceso"
          : "El Sanctuario · Verify your email / Verifica tu correo",
        text: `El Sanctuario · La Casa Que Canta\n\n${reset ? "Recover access / Recuperar acceso" : "Verify your email / Verifica tu correo"}\n${url}\n\nIf you did not request this, ignore this email. / Si no lo solicitaste, ignora este correo.`,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new ServiceError("email_delivery_failed", 502);
  } catch (error) {
    const delivery = emailDeliveryContext.getStore();
    if (delivery) delivery.failed = true;
    throw error;
  }
}
function createInstance(origin: string) {
  return betterAuth({
    database: getPool(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: origin,
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) =>
        sendIdentityEmail(user.email, url, true),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendIdentityEmail(user.email, url),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    advanced: {
      useSecureCookies: origin.startsWith("https:"),
      ipAddress: {
        ipAddressHeaders: process.env.VERCEL
          ? ["x-vercel-forwarded-for"]
          : ["x-forwarded-for"],
      },
    },
  });
}
const instances = new Map<string, ReturnType<typeof createInstance>>();
export function getAuth(origin: string) {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  )
    throw new ServiceError("auth_not_configured", 503);
  if (instances.has(origin)) return instances.get(origin)!;
  const auth = createInstance(origin);
  instances.set(origin, auth);
  return auth;
}
export interface Actor {
  id: string;
  name: string;
  email: string;
  tenant: string;
  roles: string[];
  demo: boolean;
}
export async function actorFor(request: Request): Promise<Actor> {
  const session = await getAuth(new URL(request.url).origin).api.getSession({
    headers: request.headers,
  });
  if (!session || !session.user.emailVerified)
    throw new ServiceError("sign_in_required", 401);
  const { user } = session;
  return transaction(async (client) => {
    await client.query(
      "INSERT INTO sc_actor(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [user.id],
    );
    if (
      process.env.STAFF_BOOTSTRAP_EMAIL?.toLowerCase() ===
      user.email.toLowerCase()
    ) {
      await client.query("SELECT pg_advisory_xact_lock(721922)");
      await client.query(
        "UPDATE sc_actor SET roles=ARRAY['admin'] WHERE user_id=$1 AND tenant_id='hotel' AND NOT EXISTS(SELECT 1 FROM sc_actor WHERE tenant_id='hotel' AND 'admin'=ANY(roles))",
        [user.id],
      );
    }
    const {
      rows: [record],
    } = await client.query(
      "SELECT tenant_id,roles FROM sc_actor WHERE user_id=$1",
      [user.id],
    );
    if (record.tenant_id.startsWith("demo:")) {
      const { rowCount } = await client.query(
        "SELECT digest FROM sc_demo WHERE tenant_id=$1 AND expires_at>now()",
        [record.tenant_id],
      );
      if (!rowCount) throw new ServiceError("sign_in_required", 401);
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenant: record.tenant_id,
      roles: record.roles,
      demo: record.tenant_id.startsWith("demo:"),
    };
  });
}
export function requireRole(actor: Actor, ...roles: string[]) {
  if (
    !actor.roles.includes("admin") &&
    !roles.some((role) => actor.roles.includes(role))
  )
    throw new ServiceError("staff_access_required", 403);
}
