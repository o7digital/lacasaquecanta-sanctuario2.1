import type { APIRoute } from "astro";
import {
  getAuth,
  mailConfigured,
  emailDeliveryContext,
} from "../../../lib/auth";
import { ServiceError } from "../../../lib/db";
export const ALL: APIRoute = async ({ request, url }) => {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    if (
      /\/(sign-up\/email|request-password-reset|send-verification-email)$/.test(
        url.pathname,
      ) &&
      !mailConfigured()
    )
      return Response.json(
        {
          error: {
            message:
              "Email verification is not configured. / La verificación por correo no está configurada.",
          },
        },
        { status: 503, headers },
      );
    return await emailDeliveryContext.run({ failed: false }, async () => {
      const response = await getAuth(url.origin).handler(request);
      if (emailDeliveryContext.getStore()?.failed)
        return Response.json(
          {
            error: {
              code: "EMAIL_DELIVERY_FAILED",
              message:
                "Verification email could not be sent. Please try signing in again to resend it.",
            },
          },
          { status: 502, headers },
        );
      Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof ServiceError
              ? error.code
              : "Authentication temporarily unavailable",
        },
      },
      { status: error instanceof ServiceError ? error.status : 503, headers },
    );
  }
};
