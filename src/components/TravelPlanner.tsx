import { useId, useState } from "react";
import { api, message, statusLabel } from "../lib/client";
import { localDay } from "../lib/travel";
import "../styles/travel.css";

type Flight = {
  airline: string;
  number: string;
  date: string;
  time: string;
  airport: string;
  route: string;
};
type Itinerary = { arrival?: Flight; departure?: Flight };
type TravelPlan = {
  stayId: string;
  itinerary: Itinerary;
  version: number;
  updatedAt?: string;
};
type Stay = {
  id: string;
  property: string;
  arrival?: string | null;
  departure?: string | null;
  status: string;
};
const emptyFlight = (): Flight => ({
  airline: "",
  number: "",
  date: "",
  time: "",
  airport: "",
  route: "",
});
const flightWithContent = (flight: Flight) =>
  Object.values(flight).some((value) => value.trim()) ? flight : undefined;

export default function TravelPlanner({
  lang,
  travelerName,
  stay,
  plan,
  requests,
  demo,
  onSaved,
}: {
  lang: string;
  travelerName: string;
  stay: Stay;
  plan?: TravelPlan;
  requests: any[];
  demo: boolean;
  onSaved: () => Promise<void>;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const formId = useId();
  const [arrival, setArrival] = useState<Flight>(
    plan?.itinerary.arrival || emptyFlight(),
  );
  const [departure, setDeparture] = useState<Flight>(
    plan?.itinerary.departure || emptyFlight(),
  );
  const [version, setVersion] = useState(plan?.version || 0);
  const [updatedAt, setUpdatedAt] = useState(plan?.updatedAt || "");
  const [flightStatus, setFlightStatus] = useState("");
  const [flightBusy, setFlightBusy] = useState(false);
  const [flightDirty, setFlightDirty] = useState(false);
  const [transfer, setTransfer] = useState({
    direction: "arrival",
    pickup: "",
    dropoff: stay.property,
    pickupDate: "",
    pickupTime: "",
    passengers: "",
    luggage: "",
    flightNumber: "",
    notes: "",
  });
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferStatus, setTransferStatus] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [receipt, setReceipt] = useState<{ id: string; status: string }>();
  const existing = requests.filter(
    (request) => request.kind === "transport" && request.stay_id === stay.id,
  );
  const editable = stay.status !== "cancelled";
  const transferEditable =
    (stay.status === "confirmed" || stay.status === "project") &&
    (!stay.departure || stay.departure.slice(0, 10) >= localDay());
  const updateFlight = (
    direction: "arrival" | "departure",
    key: keyof Flight,
    value: string,
  ) => {
    const set = direction === "arrival" ? setArrival : setDeparture;
    set((previous) => ({ ...previous, [key]: value }));
    setFlightDirty(true);
    setFlightStatus("");
  };
  const updateTransfer = (key: keyof typeof transfer, value: string) => {
    if (receipt) {
      setReceipt(undefined);
      setRequestKey(crypto.randomUUID());
    }
    setTransfer((previous) => ({ ...previous, [key]: value }));
    setTransferStatus("");
  };
  const errorText = (error: unknown) => {
    const code = error instanceof Error ? error.message : "";
    if (code === "travel_conflict")
      return t(
        "Flight details were changed in another session. Your text is still here. Reload the saved details before saving again.",
        "Los datos de vuelo cambiaron en otra sesión. Tu texto sigue aquí. Recarga los datos guardados antes de volver a guardar.",
      );
    if (code === "stay_not_found")
      return t(
        "This stay is no longer available. Reload your stays before trying again.",
        "Esta estancia ya no está disponible. Recarga tus estancias antes de intentarlo de nuevo.",
      );
    if (code === "invalid_travel_dates")
      return t(
        "Check the flight dates against your stay: departure must follow arrival, with arrival before the end of the stay and departure after its start.",
        "Revisa las fechas de los vuelos y de la estancia: la salida debe ser posterior a la llegada, con llegada antes del fin de la estancia y salida después de su inicio.",
      );
    return message(error, lang);
  };
  const flightFields = (direction: "arrival" | "departure", flight: Flight) => {
    const isArrival = direction === "arrival";
    const labels: Record<keyof Flight, string> = {
      airline: isArrival
        ? t("Arrival airline", "Aerolínea de llegada")
        : t("Departure airline", "Aerolínea de salida"),
      number: isArrival
        ? t("Arrival flight number", "Número de vuelo de llegada")
        : t("Departure flight number", "Número de vuelo de salida"),
      date: isArrival
        ? t("Arrival flight date", "Fecha del vuelo de llegada")
        : t("Departure flight date", "Fecha del vuelo de salida"),
      time: isArrival
        ? t("Arrival local flight time", "Hora local del vuelo de llegada")
        : t("Departure local flight time", "Hora local del vuelo de salida"),
      airport: isArrival
        ? t("Arrival airport", "Aeropuerto de llegada")
        : t("Departure airport", "Aeropuerto de salida"),
      route: isArrival
        ? t("Arrival origin", "Origen del vuelo de llegada")
        : t("Departure destination", "Destino del vuelo de salida"),
    };
    const hasContent = Boolean(flightWithContent(flight));
    return (
      <fieldset>
        <legend>
          {isArrival
            ? t("Arrival flight", "Vuelo de llegada")
            : t("Departure flight", "Vuelo de salida")}
        </legend>
        <div className="form-grid">
          {(
            ["airline", "number", "date", "time", "airport", "route"] as const
          ).map((key) => (
            <label key={key} htmlFor={`${formId}-${direction}-${key}`}>
              {labels[key]}
              <input
                id={`${formId}-${direction}-${key}`}
                type={
                  key === "date" ? "date" : key === "time" ? "time" : "text"
                }
                value={flight[key]}
                minLength={
                  key === "number" ? 2 : key === "airport" ? 3 : undefined
                }
                maxLength={key === "number" ? 20 : key === "route" ? 160 : 120}
                pattern={key === "number" ? "[A-Za-z0-9 \\x2D]+" : undefined}
                required={
                  hasContent &&
                  ["number", "date", "time", "airport"].includes(key)
                }
                disabled={!editable || flightBusy}
                onChange={(event) =>
                  updateFlight(direction, key, event.target.value)
                }
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="text-link"
          disabled={!editable || flightBusy || !hasContent}
          onClick={() => {
            (isArrival ? setArrival : setDeparture)(emptyFlight());
            setFlightDirty(true);
            setFlightStatus("");
          }}
        >
          {isArrival
            ? t(
                "Remove arrival flight details",
                "Eliminar datos del vuelo de llegada",
              )
            : t(
                "Remove departure flight details",
                "Eliminar datos del vuelo de salida",
              )}
        </button>
      </fieldset>
    );
  };
  return (
    <section className="travel-planner" aria-labelledby={`${formId}-title`}>
      <p className="eyebrow">{t("ARRIVAL & DEPARTURE", "LLEGADA Y SALIDA")}</p>
      <h2 id={`${formId}-title`}>
        {t(
          "The journey, thoughtfully prepared.",
          "Tu viaje, preparado con cuidado.",
        )}
      </h2>
      <p className="caption" data-testid="travel-owner">
        {t("Personal travel details for", "Datos personales de viaje de")}{" "}
        <strong>{travelerName}</strong>
      </p>
      <p>
        {t(
          "Your flights and transfer requests belong to your personal space for this stay. Sign in to the same account on your phone, tablet or computer to find them. The house team can consult these details to prepare your arrival and departure.",
          "Tus vuelos y solicitudes de traslado pertenecen a tu espacio personal para esta estancia. Inicia sesión en la misma cuenta desde tu teléfono, tableta u ordenador para encontrarlos. El equipo de la casa puede consultar estos datos para preparar tu llegada y salida.",
        )}
      </p>
      {demo && (
        <p className="demo-banner">
          {t(
            "Isolated demonstration. Flight details and transfer enquiries stay in this test space.",
            "Demostración aislada. Los datos de vuelo y las consultas de traslado permanecen en este espacio de prueba.",
          )}
        </p>
      )}
      <form
        className="v2-form travel-flight-form"
        data-testid="flight-details-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setFlightBusy(true);
          setFlightStatus("");
          try {
            const result = await api("travel", "PUT", {
              stayId: stay.id,
              itinerary: {
                arrival: flightWithContent(arrival),
                departure: flightWithContent(departure),
              },
              version,
            });
            setVersion(result.version);
            setArrival(result.itinerary.arrival || emptyFlight());
            setDeparture(result.itinerary.departure || emptyFlight());
            setUpdatedAt(result.updatedAt || new Date().toISOString());
            setFlightDirty(false);
            setFlightStatus(
              t(
                "Your private flight details have been saved.",
                "Tus datos de vuelo privados se han guardado.",
              ),
            );
            await onSaved().catch(() => {});
          } catch (error) {
            setFlightStatus(errorText(error));
          } finally {
            setFlightBusy(false);
          }
        }}
      >
        <h3>{t("My flight details", "Mis datos de vuelo")}</h3>
        <p className="caption">
          {t(
            "Use the local date and time at the airport entered for each flight. Check schedules and any changes with your airline.",
            "Utiliza la fecha y hora local del aeropuerto indicado para cada vuelo. Confirma horarios y cambios con tu aerolínea.",
          )}
        </p>
        {flightFields("arrival", arrival)}
        {flightFields("departure", departure)}
        {updatedAt && (
          <p className="caption">
            {t("Last saved", "Último guardado")}:{" "}
            {new Date(updatedAt).toLocaleString(lang)}
          </p>
        )}
        <div className="button-row">
          <button
            className="pill dark"
            disabled={!editable || flightBusy || !flightDirty}
          >
            {flightBusy
              ? t("Saving…", "Guardando…")
              : t("Save flight details", "Guardar datos de vuelo")}
          </button>
          <button
            type="button"
            className="text-link"
            disabled={flightBusy}
            onClick={async () => {
              if (
                flightDirty &&
                !window.confirm(
                  t(
                    "Replace your unsaved changes with the saved flight details?",
                    "¿Sustituir tus cambios sin guardar por los datos de vuelo guardados?",
                  ),
                )
              )
                return;
              setFlightBusy(true);
              try {
                const fresh = await api("account");
                const saved = fresh.travelPlans?.find(
                  (value: TravelPlan) => value.stayId === stay.id,
                );
                setArrival(saved?.itinerary.arrival || emptyFlight());
                setDeparture(saved?.itinerary.departure || emptyFlight());
                setVersion(saved?.version || 0);
                setUpdatedAt(saved?.updatedAt || "");
                setFlightDirty(false);
                setFlightStatus(
                  t(
                    "Saved flight details reloaded.",
                    "Datos de vuelo guardados recargados.",
                  ),
                );
              } catch (error) {
                setFlightStatus(errorText(error));
              } finally {
                setFlightBusy(false);
              }
            }}
          >
            {t(
              "Reload saved flight details",
              "Recargar datos de vuelo guardados",
            )}
          </button>
        </div>
        {!editable && (
          <p className="caption">
            {t(
              "These flight details are kept with this cancelled stay.",
              "Estos datos de vuelo se conservan con esta estancia cancelada.",
            )}
          </p>
        )}
        <p className="form-status" role="status">
          {flightStatus}
        </p>
      </form>
      {transferEditable && (
        <form
          className="v2-form transfer-form"
          data-testid="transfer-request-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setTransferBusy(true);
            setTransferStatus("");
            try {
              const detail = {
                ...transfer,
                passengers: Number(transfer.passengers),
                luggage: Number(transfer.luggage),
              };
              const result = await api("requests", "POST", {
                kind: "transport",
                stayId: stay.id,
                date: transfer.pickupDate,
                people: detail.passengers,
                message:
                  `${t("Taxi / transfer enquiry", "Consulta de taxi / traslado")}: ${transfer.pickup} — ${transfer.dropoff}. ${transfer.notes}`.trim(),
                idempotencyKey: requestKey,
                transport: detail,
              });
              setReceipt(result);
              setTransferStatus(
                t(
                  "Your transfer enquiry has been saved. The house must confirm the arrangement.",
                  "Tu consulta de traslado se ha guardado. La casa debe confirmar el servicio.",
                ),
              );
              await onSaved().catch(() => {});
            } catch (error) {
              setTransferStatus(errorText(error));
            } finally {
              setTransferBusy(false);
            }
          }}
        >
          <h3>{t("Taxi & transfers", "Taxi y traslados")}</h3>
          <p>
            {t(
              "Choose your preferred pickup details. The house will confirm availability, price and the final pickup arrangements in your request.",
              "Indica la recogida que prefieres. La casa confirmará disponibilidad, precio y los detalles finales en tu solicitud.",
            )}
          </p>
          <label htmlFor={`${formId}-direction`}>
            {t("Transfer direction", "Tipo de traslado")}
            <select
              id={`${formId}-direction`}
              value={transfer.direction}
              disabled={transferBusy || Boolean(receipt)}
              onChange={(event) =>
                updateTransfer("direction", event.target.value)
              }
            >
              <option value="arrival">{t("Arrival", "Llegada")}</option>
              <option value="departure">{t("Departure", "Salida")}</option>
              <option value="other">
                {t("Other journey", "Otro trayecto")}
              </option>
            </select>
          </label>
          <button
            type="button"
            className="text-link"
            disabled={
              transferBusy ||
              Boolean(receipt) ||
              transfer.direction === "other" ||
              !flightWithContent(
                transfer.direction === "departure" ? departure : arrival,
              )
            }
            onClick={() => {
              const flight =
                transfer.direction === "departure" ? departure : arrival;
              if (flightDirty) {
                setTransferStatus(
                  t(
                    "Save your flight details first, then copy them into this enquiry.",
                    "Guarda primero tus datos de vuelo y luego cópialos en esta consulta.",
                  ),
                );
                return;
              }
              setTransfer((previous) => ({
                ...previous,
                pickup:
                  transfer.direction === "departure"
                    ? stay.property
                    : flight.airport,
                dropoff:
                  transfer.direction === "departure"
                    ? flight.airport
                    : stay.property,
                pickupDate: flight.date,
                flightNumber: flight.number,
              }));
              setTransferStatus(
                t(
                  "Saved flight details copied. Choose your preferred pickup time separately.",
                  "Datos de vuelo guardados copiados. Elige por separado la hora de recogida deseada.",
                ),
              );
            }}
          >
            {t("Use saved flight details", "Utilizar datos de vuelo guardados")}
          </button>
          <div className="form-grid">
            {(
              [
                ["pickup", t("Pickup location", "Lugar de recogida")],
                ["dropoff", t("Destination", "Destino")],
                ["pickupDate", t("Pickup date", "Fecha de recogida")],
                [
                  "pickupTime",
                  t("Pickup local time", "Hora local de recogida"),
                ],
                ["passengers", t("Passengers", "Pasajeros")],
                ["luggage", t("Luggage pieces", "Piezas de equipaje")],
                [
                  "flightNumber",
                  t(
                    "Flight number for this transfer",
                    "Número de vuelo para este traslado",
                  ),
                ],
              ] as const
            ).map(([key, label]) => (
              <label key={key} htmlFor={`${formId}-transfer-${key}`}>
                {label}
                <input
                  id={`${formId}-transfer-${key}`}
                  value={transfer[key]}
                  type={
                    key === "pickupDate"
                      ? "date"
                      : key === "pickupTime"
                        ? "time"
                        : key === "passengers" || key === "luggage"
                          ? "number"
                          : "text"
                  }
                  min={
                    key === "pickupDate"
                      ? localDay()
                      : key === "passengers"
                        ? 1
                        : key === "luggage"
                          ? 0
                          : undefined
                  }
                  max={
                    key === "passengers"
                      ? 30
                      : key === "luggage"
                        ? 50
                        : undefined
                  }
                  minLength={
                    key === "pickup" || key === "dropoff" ? 3 : undefined
                  }
                  maxLength={key === "flightNumber" ? 20 : 200}
                  required={key !== "flightNumber"}
                  disabled={transferBusy || Boolean(receipt)}
                  onChange={(event) => updateTransfer(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="caption">
            {t(
              "Enter the pickup time in the local time of the pickup location.",
              "Introduce la hora de recogida en la hora local del lugar de recogida.",
            )}
          </p>
          <label htmlFor={`${formId}-transfer-notes`}>
            {t("Transfer notes", "Notas del traslado")}
            <textarea
              id={`${formId}-transfer-notes`}
              value={transfer.notes}
              rows={3}
              maxLength={2000}
              disabled={transferBusy || Boolean(receipt)}
              onChange={(event) => updateTransfer("notes", event.target.value)}
            />
          </label>
          <button
            className="pill dark"
            disabled={transferBusy || Boolean(receipt)}
          >
            {transferBusy
              ? t("Saving…", "Guardando…")
              : t("Send transfer enquiry", "Enviar consulta de traslado")}
          </button>
          <p className="form-status" role="status">
            {transferStatus}
          </p>
          {receipt && (
            <div className="transfer-receipt">
              <p>
                {t("Reference", "Referencia")}: <strong>{receipt.id}</strong> ·{" "}
                {statusLabel(receipt.status, lang)}
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setReceipt(undefined);
                  setRequestKey(crypto.randomUUID());
                  setTransferStatus("");
                }}
              >
                {t(
                  "Prepare another transfer enquiry",
                  "Preparar otra consulta de traslado",
                )}
              </button>
            </div>
          )}
        </form>
      )}
      <p className="caption">
        {t(
          "When flight plans change, update your flight details and reply in the associated transfer request. Editing saved flights does not amend an enquiry already sent.",
          "Cuando cambien tus vuelos, actualiza sus datos y responde en la solicitud de traslado asociada. Editar los vuelos guardados no modifica una consulta ya enviada.",
        )}
      </p>
      {existing.length > 0 && (
        <section className="transfer-history">
          <h3>
            {t(
              "Transfer enquiries for this stay",
              "Consultas de traslado de esta estancia",
            )}
          </h3>
          {existing.map((request) => (
            <article className="transfer-request-record" key={request.id}>
              <span className="status-tag">
                {statusLabel(request.status, lang)}
              </span>
              <h4>
                {request.details.transport?.pickup} —{" "}
                {request.details.transport?.dropoff}
              </h4>
              <p>
                {t("Requested local pickup", "Recogida local solicitada")}:{" "}
                {request.details.transport?.pickupDate} ·{" "}
                {request.details.transport?.pickupTime} ·{" "}
                {request.details.transport?.passengers}{" "}
                {t("passengers", "pasajeros")}
              </p>
              {request.status === "confirmed" &&
                request.details.transportConfirmation && (
                  <p className="transfer-confirmed-summary">
                    <strong>
                      {t("Confirmed local pickup", "Recogida local confirmada")}
                    </strong>
                    : {request.details.transportConfirmation.pickupDate} ·{" "}
                    {request.details.transportConfirmation.pickupTime}
                    <br />
                    {request.details.transportConfirmation.provider}
                    {request.details.transportConfirmation.driver &&
                      ` · ${request.details.transportConfirmation.driver}`}
                    {request.details.transportConfirmation.vehicle &&
                      ` · ${request.details.transportConfirmation.vehicle}`}
                  </p>
                )}
              <p className="caption">
                {t("Reference", "Referencia")}: {request.id}
              </p>
              {request.status === "confirmed" &&
                request.details.confirmationReference && (
                  <p>
                    {t(
                      "House confirmation reference",
                      "Referencia de confirmación de la casa",
                    )}
                    : {request.details.confirmationReference}
                  </p>
                )}
              <a href={`/${lang}/account/requests/`}>
                {t(
                  "Open the request and replies",
                  "Abrir la solicitud y sus respuestas",
                )}
              </a>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
