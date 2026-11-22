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
export const requestSchema = z
  .object({
    kind: z.enum(["experience", "wedding", "moment", "stay", "offer"]),
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
  })
  .strict()
  .refine(
    (v) => !v.surprise || Boolean(v.authorisedContact),
    "Choose the authorised contact for a surprise",
  );
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
