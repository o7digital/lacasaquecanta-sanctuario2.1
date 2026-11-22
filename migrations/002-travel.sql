CREATE TABLE IF NOT EXISTS sc_travel (
 stay_id text PRIMARY KEY REFERENCES sc_stay(id) ON DELETE CASCADE,
 tenant_id text NOT NULL,
 guest_id text NOT NULL REFERENCES "user"(id),
 itinerary jsonb NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sc_travel_guest ON sc_travel(tenant_id,guest_id);
