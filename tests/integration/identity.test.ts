import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ALL } from "../../src/pages/api/auth/[...all]";
import { getPool } from "../../src/lib/db";
import { getAuth } from "../../src/lib/auth";
if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw Error("Identity tests require the dedicated local database.");
after(async () => {
  await getPool().end();
});
test("identity requires verified email and recovery changes the credential; provider failure never reports email delivery success", async () => {
  const previousFetch = globalThis.fetch,
    oldKey = process.env.RESEND_API_KEY,
    oldSender = process.env.AUTH_EMAIL_FROM;
  const origin = "http://127.0.0.1:4339",
    email = `${randomUUID()}@example.com`,
    password = "A-test-only-password-123";
  let emailText = "",
    fail = false;
  process.env.RESEND_API_KEY = "isolated-test-key";
  process.env.AUTH_EMAIL_FROM = "El Sanctuario <test@example.com>";
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.resend.com/emails") {
      emailText = JSON.parse(String(init?.body)).text;
      return fail
        ? Response.json({ error: "isolated_failure" }, { status: 500 })
        : Response.json({ id: "isolated-provider-acceptance" });
    }
    return previousFetch(input, init);
  };
  const route = async (path: string, body?: unknown) => {
    const url = new URL("/api/auth/" + path, origin);
    return ALL({
      url,
      request: new Request(url, {
        method: body ? "POST" : "GET",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "x-forwarded-for":
            "198.18." +
            String(Math.floor(Math.random() * 200)) +
            "." +
            String(Math.floor(Math.random() * 200) + 1),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    } as any);
  };
  try {
    const signup = await route("sign-up/email", {
      email,
      password,
      name: "Identity fixture",
      callbackURL: "/en/account/",
    });
    assert.equal(signup.status, 200);
    const { user } = await signup.json();
    assert.equal(user.emailVerified, false);
    assert.ok(emailText.includes("/verify-email?"));
    const refused = await route("sign-in/email", { email, password });
    assert.equal(refused.status, 403);
    const verifyURL = emailText
      .split("\n")
      .find((line) => line.startsWith("http"))!;
    const verified = await ALL({
      url: new URL(verifyURL),
      request: new Request(verifyURL),
    } as any);
    assert.ok([200, 302].includes(verified.status));
    assert.equal(
      (
        await getPool().query(
          'SELECT \"emailVerified\" FROM \"user\" WHERE id=$1',
          [user.id],
        )
      ).rows[0].emailVerified,
      true,
    );
    await route("request-password-reset", {
      email,
      redirectTo: origin + "/en/login/",
    });
    const resetURL = new URL(
      emailText.split("\n").find((line) => line.startsWith("http"))!,
    );
    const token = resetURL.pathname.split("/").at(-1)!;
    const callback = await ALL({
      url: resetURL,
      request: new Request(resetURL),
    } as any);
    const target = callback.headers.get("location");
    const resetToken = target
      ? new URL(target, origin).searchParams.get("token") || token
      : token;
    const reset = await route("reset-password", {
      token: resetToken,
      newPassword: "Another-test-password-456",
    });
    assert.equal(reset.status, 200);
    assert.equal(
      (await route("sign-in/email", { email, password })).status,
      401,
    );
    assert.equal(
      (
        await route("sign-in/email", {
          email,
          password: "Another-test-password-456",
        })
      ).status,
      200,
    );
    fail = true;
    const failed = await route("sign-up/email", {
      email: `${randomUUID()}@example.com`,
      password,
      name: "Failure fixture",
    });
    assert.equal(failed.status, 502);
    assert.equal((await failed.json()).error.code, "EMAIL_DELIVERY_FAILED");
    const session = await getAuth(origin).api.getSession({
      headers: new Headers(),
    });
    assert.equal(session, null);
  } finally {
    globalThis.fetch = previousFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    if (oldSender === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = oldSender;
  }
});
