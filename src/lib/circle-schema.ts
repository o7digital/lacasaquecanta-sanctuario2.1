import { z } from "zod";
export const interests = [
  "gastronomy",
  "sea",
  "diving",
  "fishing",
  "yoga",
  "culture",
  "romance",
  "wellbeing",
] as const;
const text = z.string().trim().max(2000);
export const profileSchema = z
  .object({
    firstName: z.string().trim().max(100).default(""),
    lastName: z.string().trim().max(100).default(""),
    phone: z.string().max(40).default(""),
    language: z.enum(["en", "es"]),
    interests: z.array(z.enum(interests)).max(8),
    avoid: z.array(z.enum(interests)).max(8).default([]),
    avoidText: text.default(""),
    dietary: z
      .array(z.enum(["gluten-free", "vegetarian", "vegan", "other"]))
      .max(4),
    dietaryNotes: text.default(""),
    allergies: text.default(""),
    allergySharing: z
      .enum(["private", "concierge", "kitchen"])
      .default("private"),
    practical: text.default(""),
    celebrations: text.default(""),
    communications: z
      .object({
        email: z.boolean(),
        notifications: z.boolean(),
        topics: z
          .array(
            z.enum([
              "chef",
              "journal",
              "activities",
              "events",
              "offers",
              "weddings",
              "moments",
            ]),
          )
          .max(7),
      })
      .default({ email: false, notifications: false, topics: [] }),
  })
  .strict();
export const emptyProfile = () =>
  profileSchema.parse({ language: "en", interests: [], dietary: [] });
export const planSchema = z
  .object({
    property: z.enum(["La Casa Que Canta", "El Ensueño", "El Murmullo"]),
    arrival: z.iso.date().optional(),
    departure: z.iso.date().optional(),
    notes: text.default(""),
  })
  .refine(
    (v) => !v.arrival || !v.departure || v.departure > v.arrival,
    "Departure must follow arrival",
  );
const localTime = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a local time in HH:mm format");
export const flightSchema = z
  .object({
    airline: z.string().trim().max(120).default(""),
    number: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[a-z0-9 -]+$/i)
      .transform((v) => v.toUpperCase()),
    date: z.iso.date(),
    time: localTime,
    airport: z.string().trim().min(3).max(120),
    route: z.string().trim().max(160).default(""),
  })
  .strict();
export const travelItinerarySchema = z
  .object({
    arrival: flightSchema.optional(),
    departure: flightSchema.optional(),
  })
  .strict()
  .refine(
    (v) => !v.arrival || !v.departure || v.departure.date >= v.arrival.date,
    "Departure flight must not precede arrival",
  );
export const travelPlanSchema = z
  .object({
    stayId: z.uuid(),
    itinerary: travelItinerarySchema,
    version: z.number().int().min(0),
  })
  .strict();
export const transportSchema = z
  .object({
    direction: z.enum(["arrival", "departure", "other"]),
    pickup: z.string().trim().min(3).max(200),
    dropoff: z.string().trim().min(3).max(200),
    pickupDate: z.iso.date(),
    pickupTime: localTime,
    passengers: z.number().int().min(1).max(30),
    luggage: z.number().int().min(0).max(50),
    flightNumber: z.string().trim().max(20).default(""),
    notes: text.default(""),
  })
  .strict();
export const diningSchema = z
  .object({ setting: z.literal("beach"), localTime: localTime.optional() })
  .strict();
export const transportConfirmationSchema = z
  .object({
    provider: z.string().trim().min(2).max(200),
    pickupDate: z.iso.date(),
    pickupTime: localTime,
    driver: z.string().trim().max(200).default(""),
    vehicle: z.string().trim().max(200).default(""),
    price: z.number().min(0).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.price === undefined || Boolean(v.currency),
    "Currency is required with a confirmed price",
  );
export const requestSchema = z
  .object({
    kind: z.enum([
      "experience",
      "wedding",
      "moment",
      "stay",
      "offer",
      "transport",
    ]),
    itemId: z.string().max(100).optional(),
    stayId: z.uuid().optional(),
    date: z.iso.date().optional(),
    flexibility: text.default(""),
    people: z.number().int().min(1).max(500).optional(),
    occasion: z.string().max(150).default(""),
    accommodation: text.default(""),
    message: z.string().trim().min(3).max(5000),
    dietaryNotes: text.default(""),
    surprise: z.boolean().default(false),
    authorisedContact: z.email().max(254).optional(),
    saveDraft: z.boolean().default(false),
    idempotencyKey: z.uuid(),
    transport: transportSchema.optional(),
    dining: diningSchema.optional(),
  })
  .strict()
  .refine(
    (v) => !v.surprise || Boolean(v.authorisedContact),
    "Choose the authorised contact for a surprise",
  )
  .superRefine((v, ctx) => {
    if (v.kind === "transport") {
      if (!v.stayId)
        ctx.addIssue({
          code: "custom",
          path: ["stayId"],
          message: "Choose a stay for this transfer",
        });
      if (!v.transport)
        ctx.addIssue({
          code: "custom",
          path: ["transport"],
          message: "Transfer details are required",
        });
      if (
        v.transport &&
        (v.date !== v.transport.pickupDate ||
          v.people !== v.transport.passengers)
      )
        ctx.addIssue({
          code: "custom",
          path: ["transport"],
          message: "Request date and party size must match the transfer",
        });
    } else if (v.transport)
      ctx.addIssue({
        code: "custom",
        path: ["transport"],
        message: "Transport details belong to a transfer request",
      });
    const dinner =
      v.kind === "experience" && v.itemId === "romantic-beach-dinner";
    if (v.dining && !dinner)
      ctx.addIssue({
        code: "custom",
        path: ["dining"],
        message: "Dining details belong to the beach dinner experience",
      });
    if (dinner && !v.saveDraft && (!v.date || !v.people))
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Choose a dinner date and guest count",
      });
  });
export const requestTransitions: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["pending", "confirmed", "declined", "cancelled"],
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
};
export const programSchema = z
  .object({
    name: z.string().min(1).max(100),
    active: z.boolean(),
    tiers: z
      .array(
        z.object({
          name: z.enum(["Gold", "Platinum", "Black"]),
          minimumPoints: z.number().int().min(0),
          criteria: text,
        }),
      )
      .max(3),
    operations: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          kind: z.enum(["earned", "used"]),
          trigger: z.enum([
            "completed_stay",
            "verified_experience",
            "redemption",
          ]),
          points: z.number().int().min(1).max(100000),
          description: text,
        }),
      )
      .max(50),
    benefits: z
      .array(
        z.object({
          id: z.string().max(80),
          title: z.string().min(1).max(200),
          tier: z.enum(["Gold", "Platinum", "Black"]),
          active: z.boolean(),
        }),
      )
      .max(50),
    validityDays: z.number().int().min(1).optional(),
    terms: text.default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.active &&
      (v.tiers.length !== 3 ||
        new Set(v.tiers.map((t) => t.name)).size !== 3 ||
        !v.terms)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Activation requires three tier criteria and hotel-approved terms",
      });
    if (new Set(v.operations.map((o) => o.id)).size !== v.operations.length)
      ctx.addIssue({
        code: "custom",
        message: "Operation identifiers must be unique",
      });
  });
export const defaultProgram = () =>
  programSchema.parse({
    name: "El Sanctuario Circle",
    active: false,
    tiers: [],
    operations: [],
    benefits: [],
  });
export function offerEligibility(
  offer: {
    status: string;
    bookingStart: string;
    bookingEnd: string;
    stayStart: string;
    stayEnd: string;
    membersOnly: boolean;
    tiers: string[];
  },
  today: string,
  membership?: { active: boolean; tier: string | null },
  dates?: { arrival?: string; departure?: string },
) {
  if (offer.status !== "published") return "preview_only";
  if (today < offer.bookingStart) return "not_open";
  if (today > offer.bookingEnd) return "expired";
  if (offer.membersOnly && !membership?.active) return "members_only";
  if (
    offer.tiers.length &&
    (!membership?.active ||
      !membership.tier ||
      !offer.tiers.includes(membership.tier))
  )
    return "tier_required";
  if (
    (dates?.arrival &&
      (dates.arrival < offer.stayStart || dates.arrival > offer.stayEnd)) ||
    (dates?.departure && dates.departure > offer.stayEnd)
  )
    return "stay_dates";
  return "eligible";
}
