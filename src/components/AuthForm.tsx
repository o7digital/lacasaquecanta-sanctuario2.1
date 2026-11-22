import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { api, message } from "../lib/client";
const authClient = createAuthClient();
export default function AuthForm({
  lang,
  staff = false,
}: {
  lang: string;
  staff?: boolean;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [mode, setMode] = useState("signin"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [config, setConfig] = useState<any>();
  useEffect(() => {
    api("status")
      .then(setConfig)
      .catch(() => {});
    if (new URLSearchParams(location.search).has("token")) setMode("reset");
  }, []);
  const destination = () => {
    const value = new URLSearchParams(location.search).get("returnTo");
    return value?.startsWith(`/${lang}/`) && !value.startsWith("//")
      ? value
      : staff
        ? "/admin/"
        : `/${lang}/account/`;
  };
  const demo = async (role: string) => {
    setBusy(true);
    setStatus("");
    try {
      await api("demo", "POST", { mode: role });
      location.href = role === "staff" ? "/admin/" : destination();
    } catch (e) {
      setStatus(message(e, lang));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-panel">
      <p className="page-intro">
        {staff
          ? t(
              "Sign in with your verified house-team account. Permissions are assigned by the administrator.",
              "Inicia sesión con tu cuenta verificada del equipo. La administración asigna los permisos.",
            )
          : t(
              "A notebook that follows you. Stays and wishes in one place. Your own private connection to the house.",
              "Un cuaderno que te acompaña. Estancias y deseos en un solo lugar. Tu vínculo privado con la casa.",
            )}
      </p>
      <div
        className="auth-tabs"
        role="group"
        aria-label={t("Account access", "Acceso a la cuenta")}
      >
        {[
          ["signin", t("Sign in", "Iniciar sesión")],
          ["signup", t("Create account", "Crear cuenta")],
          ["recover", t("Recover access", "Recuperar acceso")],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setStatus("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {config && !config.database && (
        <p className="sample-note">
          {t(
            "Private accounts are awaiting secure database activation. You can read the journal freely.",
            "Las cuentas privadas están pendientes de activar su base de datos segura. Puedes leer la revista libremente.",
          )}
        </p>
      )}
      {config && !config.identity && mode !== "signin" && (
        <p className="sample-note">
          {t(
            "Email verification is awaiting activation. New accounts and access recovery will open when email delivery is connected.",
            "La verificación por correo está pendiente de activación. Las nuevas cuentas y la recuperación se abrirán al conectar el envío de correo.",
          )}
        </p>
      )}
      <form
        className="v2-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setStatus("");
          const fd = new FormData(e.currentTarget);
          try {
            let result: any;
            if (mode === "signup")
              result = await authClient.signUp.email({
                name: String(fd.get("name")),
                email: String(fd.get("email")),
                password: String(fd.get("password")),
                callbackURL: `/${lang}/account/`,
              });
            else if (mode === "recover")
              result = await authClient.requestPasswordReset({
                email: String(fd.get("email")),
                redirectTo: `${location.origin}/${lang}/login/`,
              });
            else if (mode === "reset")
              result = await authClient.resetPassword({
                newPassword: String(fd.get("password")),
                token: new URLSearchParams(location.search).get("token") || "",
              });
            else
              result = await authClient.signIn.email({
                email: String(fd.get("email")),
                password: String(fd.get("password")),
              });
            if (result.error) {
              if (result.error.code === "EMAIL_NOT_VERIFIED")
                setStatus(
                  t(
                    "Verify your email first. Check your inbox for the verification link.",
                    "Verifica primero tu correo. Revisa tu bandeja de entrada.",
                  ),
                );
              else if (result.error.code === "INVALID_EMAIL_OR_PASSWORD")
                setStatus(
                  t(
                    "The email or password is incorrect.",
                    "El correo o la contraseña no es correcto.",
                  ),
                );
              else
                setStatus(
                  t(
                    "Unable to complete this request. Check your details and email verification.",
                    "No se pudo completar la solicitud. Revisa tus datos y la verificación por correo.",
                  ),
                );
            } else if (mode === "signin") location.href = destination();
            else
              setStatus(
                mode === "signup"
                  ? t(
                      "Check your email to verify your account before signing in.",
                      "Revisa tu correo para verificar la cuenta antes de iniciar sesión.",
                    )
                  : mode === "reset"
                    ? t(
                        "Password updated. You can sign in.",
                        "Contraseña actualizada. Ya puedes iniciar sesión.",
                      )
                    : t(
                        "If this account exists, an access recovery email will be sent.",
                        "Si existe la cuenta, recibirás un correo para recuperar el acceso.",
                      ),
              );
          } catch (error) {
            setStatus(message(error, lang));
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <label>
            {t("Your name", "Tu nombre")}
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            {t("Email address", "Correo electrónico")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
        )}
        {mode !== "recover" && (
          <label>
            {mode === "reset"
              ? t("New password", "Nueva contraseña")
              : t("Password", "Contraseña")}
            <input
              type="password"
              name="password"
              autoComplete={
                mode === "signup" || mode === "reset"
                  ? "new-password"
                  : "current-password"
              }
              required
              minLength={12}
            />
            <small>
              {t("At least 12 characters.", "Al menos 12 caracteres.")}
            </small>
          </label>
        )}
        <button
          className="pill dark"
          disabled={
            busy ||
            config?.database === false ||
            (mode !== "signin" && !config?.identity)
          }
        >
          {busy
            ? t("Please wait…", "Un momento…")
            : mode === "signup"
              ? t("Create my account", "Crear mi cuenta")
              : mode === "recover"
                ? t("Send recovery email", "Enviar correo de recuperación")
                : mode === "reset"
                  ? t("Save new password", "Guardar contraseña")
                  : t("Sign in", "Iniciar sesión")}
        </button>
        <p className="caption">
          {t(
            "Creating an account does not subscribe you to marketing emails.",
            "Crear una cuenta no te suscribe a correos comerciales.",
          )}
        </p>
      </form>
      <p role="status" className="form-status">
        {status}
      </p>
      {config?.demo && (
        <div className="demo-choice">
          <h2>{t("Explore the demonstration", "Explora la demostración")}</h2>
          <p>
            {t(
              "A private sandbox with fictional guests, stays and points. No hotel request or email is sent. Do not enter real personal information.",
              "Un espacio privado de prueba con clientes, estancias y puntos ficticios. No se envían solicitudes al hotel ni correos. No introduzcas datos personales reales.",
            )}
          </p>
          <div className="button-row">
            <button
              className="pill"
              disabled={busy}
              onClick={() => demo("guest")}
            >
              {t("Explore as a guest", "Explorar como cliente")}
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => demo("staff")}
            >
              {t("Explore as the house team", "Explorar como equipo")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
