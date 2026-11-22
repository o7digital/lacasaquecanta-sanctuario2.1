CREATE TABLE IF NOT EXISTS sc_actor (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 tenant_id text NOT NULL DEFAULT 'hotel', roles text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sc_profile (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 data jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sc_stay (
 id text PRIMARY KEY, tenant_id text NOT NULL, guest_id text NOT NULL REFERENCES "user"(id),
 property text NOT NULL, arrival date, departure date, status text NOT NULL CHECK(status IN ('project','confirmed','completed','cancelled')),
 reference text, source text NOT NULL, imported_at timestamptz, data jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,source,reference), CHECK(departure > arrival OR arrival IS NULL OR departure IS NULL)
);
CREATE INDEX IF NOT EXISTS sc_stay_guest ON sc_stay(tenant_id,guest_id);
CREATE TABLE IF NOT EXISTS sc_saved (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, kind text NOT NULL,
 item_id text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,kind,item_id)
);
CREATE TABLE IF NOT EXISTS sc_request (
 id text PRIMARY KEY, tenant_id text NOT NULL, guest_id text NOT NULL REFERENCES "user"(id), stay_id text REFERENCES sc_stay(id),
 kind text NOT NULL, item_id text, status text NOT NULL CHECK(status IN ('draft','sent','pending','confirmed','declined','cancelled')),
 details jsonb NOT NULL, contact_email text NOT NULL, surprise boolean NOT NULL DEFAULT false,
 idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(guest_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS sc_request_update (
 id text PRIMARY KEY, request_id text NOT NULL REFERENCES sc_request(id), actor_id text NOT NULL REFERENCES "user"(id),
 status text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sc_program (
 tenant_id text PRIMARY KEY, rules jsonb NOT NULL DEFAULT '{"name":"El Sanctuario Circle","active":false,"tiers":[],"operations":[],"benefits":[]}', version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sc_membership (
 user_id text PRIMARY KEY REFERENCES "user"(id), tenant_id text NOT NULL, member_number text NOT NULL UNIQUE,
 tier text CHECK(tier IN ('Gold','Platinum','Black')), active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sc_points (
 id text PRIMARY KEY, tenant_id text NOT NULL, user_id text NOT NULL REFERENCES sc_membership(user_id),
 event_key text NOT NULL, points integer NOT NULL CHECK(points <> 0), kind text NOT NULL CHECK(kind IN ('earned','used','reversed','expired')),
 reason text NOT NULL, stay_id text REFERENCES sc_stay(id), reverses text UNIQUE REFERENCES sc_points(id),
 actor_id text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,event_key)
);
CREATE OR REPLACE FUNCTION sc_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Append-only record'; END $$;
DROP TRIGGER IF EXISTS sc_points_immutable ON sc_points;
CREATE TRIGGER sc_points_immutable BEFORE UPDATE OR DELETE ON sc_points FOR EACH ROW EXECUTE FUNCTION sc_immutable_record();
CREATE TABLE IF NOT EXISTS sc_card_token (
 digest text PRIMARY KEY, user_id text NOT NULL REFERENCES sc_membership(user_id), expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS sc_audit (
 id bigserial PRIMARY KEY, tenant_id text NOT NULL, actor_id text NOT NULL, action text NOT NULL, entity_id text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS sc_audit_immutable ON sc_audit;
CREATE TRIGGER sc_audit_immutable BEFORE UPDATE OR DELETE ON sc_audit FOR EACH ROW EXECUTE FUNCTION sc_immutable_record();
CREATE TABLE IF NOT EXISTS sc_editorial (tenant_id text PRIMARY KEY, content jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sc_demo (digest text PRIMARY KEY, tenant_id text NOT NULL, guest_id text NOT NULL, staff_id text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS sc_rate_limit (id text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS sc_media (id text PRIMARY KEY, tenant_id text NOT NULL, content_type text NOT NULL, bytes bytea NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE sc_points ADD COLUMN IF NOT EXISTS expires_at timestamptz;
