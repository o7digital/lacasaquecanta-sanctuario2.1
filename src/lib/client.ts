export async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch("/api/v2/" + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    const e = new Error(data.error || "temporarily_unavailable") as Error & {
      status?: number;
    };
    e.status = response.status;
    throw e;
  }
  return data;
}
export const message = (error: unknown, lang: string) => {
  const code = error instanceof Error ? error.message : String(error);
  const messages: Record<string, [string, string]> = {
    sign_in_required: [
      "Sign in to use your private space.",
      "Inicia sesión para usar tu espacio privado.",
    ],
    database_not_configured: [
      "Your private space is awaiting secure storage activation. The public journal is available.",
      "Tu espacio privado está pendiente de activar su almacenamiento seguro. La revista pública está disponible.",
    ],
    auth_not_configured: [
      "Account access is awaiting activation.",
      "El acceso a las cuentas está pendiente de activación.",
    ],
    temporarily_unavailable: [
      "The service is temporarily unavailable. Your text is still here; please try again.",
      "El servicio no está disponible temporalmente. Tu texto sigue aquí; inténtalo de nuevo.",
    ],
    profile_conflict: [
      "Your profile changed in another session. Reload before saving.",
      "Tu perfil cambió en otra sesión. Recarga antes de guardar.",
    ],
    staff_access_required: [
      "This account does not have the required staff permission.",
      "Esta cuenta no tiene el permiso de personal necesario.",
    ],
    program_not_active: [
      "The house has not activated the loyalty rules.",
      "La casa aún no ha activado las reglas de fidelidad.",
    ],
    card_expired_or_revoked: [
      "This card code has expired or was revoked. Ask the member to refresh it.",
      "Este código ha caducado o fue revocado. Pide al miembro que lo actualice.",
    ],
    origin: [
      "Please reload this page before trying again.",
      "Recarga la página antes de intentarlo de nuevo.",
    ],
    validation: [
      "Check the form fields before sending.",
      "Revisa los campos antes de enviar.",
    ],
    demo_disabled: [
      "The demonstration is not enabled on this environment.",
      "La demostración no está habilitada en este entorno.",
    ],
    offer_not_eligible: [
      "This offer is no longer available for this request.",
      "Esta oferta ya no está disponible para esta solicitud.",
    ],
    invalid_transition: [
      "This request status has changed. Reload to see the current status.",
      "El estado de la solicitud ha cambiado. Recarga para ver el actual.",
    ],
  };
  if (!navigator.onLine)
    return lang === "en"
      ? "You are offline. This action has not been sent. Your text is still here."
      : "Estás sin conexión. Esta acción no se ha enviado. Tu texto sigue aquí.";
  return (
    messages[code]?.[lang === "en" ? 0 : 1] ||
    (lang === "en"
      ? "Unable to complete this action. Please check the details and try again."
      : "No se pudo completar la acción. Revisa los datos e inténtalo de nuevo.")
  );
};
export const statusLabel = (status: string, lang: string) =>
  (
    ({
      draft: ["Draft", "Borrador"],
      sent: ["Sent", "Enviada"],
      pending: ["Awaiting response", "En espera"],
      confirmed: ["Confirmed", "Confirmada"],
      declined: ["Declined", "Rechazada"],
      cancelled: ["Cancelled", "Cancelada"],
      completed: ["Completed", "Finalizada"],
      project: ["Return project", "Proyecto de regreso"],
      earned: ["Earned", "Ganados"],
      used: ["Used", "Utilizados"],
      reversed: ["Reversed", "Anulados"],
      expired: ["Expired", "Caducados"],
    }) as Record<string, string[]>
  )[status]?.[lang === "en" ? 0 : 1] || status;
