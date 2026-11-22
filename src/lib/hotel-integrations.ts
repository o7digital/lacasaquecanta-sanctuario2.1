import { createHmac, timingSafeEqual } from "node:crypto";
import { ServiceError } from "./db";
export interface HotelReservation {
  guestEmail: string;
  reference: string;
  property: "La Casa Que Canta" | "El Ensueño" | "El Murmullo";
  arrival: string;
  departure: string;
  status: "confirmed" | "completed" | "cancelled";
  notes?: string;
}
export interface ReservationProvider {
  name: string;
  fetchStays(email: string): Promise<HotelReservation[]>;
}
// SynXis is a verified outgoing booking link, not an authenticated reservation API.
// Select a hotel provider here only after its identity and API contract are supplied.
export const reservationProvider: ReservationProvider = {
  name: "not_configured",
  async fetchStays() {
    throw new ServiceError("hotel_reservations_not_connected", 503);
  },
};
export interface CRMProvider {
  name: string;
  sendGuestRequest(requestId: string): Promise<{ externalId: string }>;
}
export const crmProvider: CRMProvider = {
  name: "not_configured",
  async sendGuestRequest() {
    throw new ServiceError("hotel_crm_not_connected", 503);
  },
};
export function verifyStaySignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const seconds = Number(timestamp);
  if (
    !Number.isFinite(seconds) ||
    Math.abs(now - seconds * 1000) > 300000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha256", secret)
      .update(timestamp + "." + body)
      .digest(),
  );
}
