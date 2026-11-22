import { useEffect, useState } from "react";
import { api, message } from "../lib/client";
import {
  contentSchema,
  experienceCategories,
  experienceLabels,
  type Content,
} from "../lib/schema";
import { localDay } from "../lib/travel";
type Kind = "editions" | "experiences" | "offers";
const pair = () => ({ en: "", es: "" });
export default function CatalogueEditor({ lang }: { lang: string }) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [content, setContent] = useState<Content>(),
    [version, setVersion] = useState(0),
    [kind, setKind] = useState<Kind>("editions"),
    [index, setIndex] = useState(-1),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [status, setStatus] = useState("");
  const load = async () => {
    const d = await api("staff/editorial");
    setContent(contentSchema.parse(d.content));
    setVersion(d.version);
    setDirty(false);
  };
  useEffect(() => {
    load().catch((e) => setStatus(message(e, lang)));
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const item = content?.[kind][index] as any;
  const change = (key: string, value: any) => {
    if (!content || !item) return;
    const next = structuredClone(content),
      target = (next[kind] as any[])[index];
    const [a, b] = key.split(".");
    if (b) target[a][b] = value;
    else target[a] = value;
    setContent(next);
    setDirty(true);
  };
  const add = (type: Kind) => {
    if (!content) return;
    const next = structuredClone(content),
      today = localDay(),
      base = {
        id: "new-" + Date.now().toString(36),
        status: "draft",
        title: pair(),
        intro: pair(),
        image: "/assets/hero.jpg",
        imageCredit: "",
        imageAlt: pair(),
      };
    const created =
      type === "editions"
        ? {
            ...base,
            number: "",
            date: today,
            period: pair(),
            theme: pair(),
            articleIds: [],
          }
        : type === "experiences"
          ? {
              ...base,
              body: pair(),
              category: "diving",
              context: "bay",
              provider: pair(),
              location: pair(),
              duration: pair(),
              languages: pair(),
              level: pair(),
              practical: pair(),
              conditions: pair(),
              cancellation: pair(),
              availability: "on_request",
              inclusions: pair(),
              source: "https://www.lacasaquecanta.com/",
              interests: [],
            }
          : {
              ...base,
              body: pair(),
              bookingStart: undefined,
              bookingEnd: undefined,
              stayStart: "",
              stayEnd: "",
              conditions: pair(),
              exclusions: pair(),
              currency: undefined,
              membersOnly: false,
              tiers: [],
              relatedIds: [],
            };
    (next[type] as any[]).push(created);
    setContent(next);
    setKind(type);
    setIndex(next[type].length - 1);
    setDirty(true);
  };
  const field = (label: string, key: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={item?.[key] ?? ""}
        onChange={(e) =>
          change(
            key,
            type === "number"
              ? e.target.value === ""
                ? undefined
                : Number(e.target.value)
              : [
                    "start",
                    "end",
                    "verifiedAt",
                    "bookingUrl",
                    "bookingStart",
                    "bookingEnd",
                    "currency",
                    "sourceUrl",
                    "sourceUrlEs",
                    "sourceVerifiedAt",
                  ].includes(key) && !e.target.value
                ? undefined
                : e.target.value,
          )
        }
      />
    </label>
  );
  const bilingual = (key: string, label: string, large = false) => (
    <fieldset key={key}>
      <legend>{label}</legend>
      {(["en", "es"] as const).map((locale) => (
        <label key={locale}>
          {locale === "en" ? "English" : "Español"}
          {large ? (
            <textarea
              aria-label={`${label} · ${locale}`}
              rows={5}
              value={item?.[key]?.[locale] || ""}
              onChange={(e) => change(`${key}.${locale}`, e.target.value)}
            />
          ) : (
            <input
              aria-label={`${label} · ${locale}`}
              value={item?.[key]?.[locale] || ""}
              onChange={(e) => change(`${key}.${locale}`, e.target.value)}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
  return (
    <div>
      <div className="button-row">
        <button
          className="pill dark"
          disabled={busy || !dirty}
          onClick={async () => {
            if (!content) return;
            setBusy(true);
            try {
              const validation = contentSchema.safeParse(content);
              if (!validation.success) {
                setStatus(
                  validation.error.issues
                    .map((i) => i.path.join(".") + ": " + i.message)
                    .join("\n"),
                );
                return;
              }
              const r = await api("staff/editorial", "PUT", {
                version,
                content: validation.data,
              });
              setVersion(r.version);
              setDirty(false);
              setStatus(
                t(
                  "Catalogue saved. Demo changes remain isolated.",
                  "Catálogo guardado. Los cambios de demostración permanecen aislados.",
                ),
              );
            } catch (e) {
              setStatus(message(e, lang));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("Save catalogue", "Guardar catálogo")}
        </button>
        <button
          className="text-link"
          onClick={() => {
            if (
              !dirty ||
              confirm(
                t(
                  "Discard unsaved changes?",
                  "¿Descartar cambios sin guardar?",
                ),
              )
            )
              void load();
          }}
        >
          {t("Reload", "Recargar")}
        </button>
        <button
          className="text-link"
          onClick={() => {
            const u = URL.createObjectURL(
              new Blob([JSON.stringify(content, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = u;
            a.download = "sanctuario-catalogue.json";
            a.click();
            URL.revokeObjectURL(u);
          }}
        >
          {t("Export backup", "Exportar copia")}
        </button>
        <span>
          {dirty
            ? t("Unsaved changes", "Cambios sin guardar")
            : t("Saved", "Guardado")}
        </span>
      </div>
      <div className="catalogue-editor">
        <aside>
          {(
            [
              ["editions", t("Issues", "Números")],
              ["experiences", t("Experiences", "Experiencias")],
              ["offers", t("Offers", "Ofertas")],
            ] as const
          ).map(([key, label]) => (
            <section key={key}>
              <h3>{label}</h3>
              <button className="pill" onClick={() => add(key)}>
                {t("New", "Nuevo")} · {label}
              </button>
              {content?.[key].map((e, i) => (
                <button
                  key={e.id + i}
                  aria-pressed={kind === key && index === i}
                  onClick={() => {
                    setKind(key);
                    setIndex(i);
                  }}
                >
                  {e.title[lang as "en" | "es"] || e.id}
                  <small> · {e.status}</small>
                </button>
              ))}
            </section>
          ))}
        </aside>
        {item ? (
          <form className="v2-form" onSubmit={(e) => e.preventDefault()}>
            {field(t("URL identifier", "Identificador URL"), "id")}
            <label>
              {t("Publication status", "Estado de publicación")}
              <select
                value={item.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {[
                  ["draft", t("Draft", "Borrador")],
                  ["sample", t("Editorial sample", "Muestra editorial")],
                  ["published", t("Published", "Publicado")],
                ].map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {field(
              t(
                "Photograph URL or media path",
                "URL de fotografía o ruta de medios",
              ),
              "image",
            )}
            <label>
              {t(
                "Upload approved photograph (up to 3 MB)",
                "Subir fotografía autorizada (hasta 3 MB)",
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const r = await fetch("/api/media-upload", {
                      method: "POST",
                      headers: { "Content-Type": f.type },
                      body: f,
                    });
                    if (!r.ok) throw Error();
                    change("image", (await r.json()).path);
                  } catch (err) {
                    setStatus(message(err, lang));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {field(
              t("Photograph credit", "Crédito de fotografía"),
              "imageCredit",
            )}
            {bilingual(
              "imageAlt",
              t("Photograph descriptions", "Descripciones de fotografía"),
            )}
            {bilingual("title", t("Title", "Título"))}
            {bilingual("intro", t("Introduction", "Introducción"), true)}
            {kind === "editions" && (
              <>
                {field(t("Issue number", "Número de edición"), "number")}
                {field(
                  t("Publication date", "Fecha de publicación"),
                  "date",
                  "date",
                )}
                {bilingual("period", t("Period", "Periodo"))}
                {bilingual("theme", t("Theme", "Tema"))}
                <fieldset>
                  <legend>{t("Table of contents", "Índice")}</legend>
                  {content?.articles.map((a) => (
                    <label className="check" key={a.id}>
                      <input
                        type="checkbox"
                        checked={item.articleIds.includes(a.id)}
                        onChange={(e) =>
                          change(
                            "articleIds",
                            e.target.checked
                              ? [...item.articleIds, a.id]
                              : item.articleIds.filter(
                                  (v: string) => v !== a.id,
                                ),
                          )
                        }
                      />
                      {a.locales[lang as "en" | "es"].title || a.id}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            {kind !== "editions" &&
              bilingual(
                "body",
                t("Body · Markdown", "Contenido · Markdown"),
                true,
              )}
            {kind === "experiences" && (
              <>
                <label>
                  {t("Category", "Categoría")}
                  <select
                    value={item.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    {experienceCategories.map((c) => (
                      <option value={c} key={c}>
                        {experienceLabels[c][lang as "en" | "es"]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Where", "Dónde")}
                  <select
                    value={item.context}
                    onChange={(e) => change("context", e.target.value)}
                  >
                    <option value="hotel">{t("Hotel", "Hotel")}</option>
                    <option value="bay">{t("Bay", "Bahía")}</option>
                  </select>
                </label>
                <label>
                  {t("Availability", "Disponibilidad")}
                  <select
                    value={item.availability}
                    onChange={(e) => change("availability", e.target.value)}
                  >
                    <option value="on_request">
                      {t("On request", "Por consultar")}
                    </option>
                    <option value="confirmed">
                      {t(
                        "Provider and date confirmed",
                        "Prestador y fecha confirmados",
                      )}
                    </option>
                    <option value="unavailable">
                      {t("Unavailable", "No disponible")}
                    </option>
                  </select>
                </label>
                {[
                  ["provider", t("Provider", "Prestador")],
                  ["location", t("Location", "Lugar")],
                  ["duration", t("Duration", "Duración")],
                  ["languages", t("Languages", "Idiomas")],
                  ["level", t("Level", "Nivel")],
                  ["practical", t("Practical details", "Información práctica")],
                  ["inclusions", t("Inclusions", "Incluye")],
                  [
                    "conditions",
                    t("Booking conditions", "Condiciones de reserva"),
                  ],
                  ["cancellation", t("Cancellation", "Cancelación")],
                ].map(([key, label]) => bilingual(key, label, true))}
                {field(
                  t(
                    "First available date (optional)",
                    "Primera fecha disponible (opcional)",
                  ),
                  "start",
                  "date",
                )}
                {field(
                  t(
                    "Last available date (optional)",
                    "Última fecha disponible (opcional)",
                  ),
                  "end",
                  "date",
                )}
                {field(t("Source (HTTPS)", "Fuente (HTTPS)"), "source", "url")}
                {field(
                  t("Source verified on", "Fuente verificada el"),
                  "verifiedAt",
                  "date",
                )}
                <label>
                  {t(
                    "Declared interests (comma-separated IDs)",
                    "Intereses declarados (identificadores separados por comas)",
                  )}
                  <input
                    value={item.interests.join(", ")}
                    onChange={(e) =>
                      change(
                        "interests",
                        e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                  <small>
                    gastronomy, sea, diving, fishing, yoga, culture, romance,
                    wellbeing
                  </small>
                </label>
              </>
            )}
            {kind === "offers" && (
              <>
                {[
                  [
                    "bookingStart",
                    t(
                      "Booking opens (if published)",
                      "Inicio de reservas (si está publicado)",
                    ),
                  ],
                  [
                    "bookingEnd",
                    t(
                      "Booking closes (if published)",
                      "Fin de reservas (si está publicado)",
                    ),
                  ],
                  ["stayStart", t("First stay date", "Inicio de estancias")],
                  ["stayEnd", t("Last stay date", "Fin de estancias")],
                ].map(([key, label]) => field(label, key, "date"))}
                {bilingual("conditions", t("Conditions", "Condiciones"), true)}
                {bilingual("exclusions", t("Exclusions", "Exclusiones"), true)}
                {field(
                  t("Official source (English)", "Fuente oficial (inglés)"),
                  "sourceUrl",
                  "url",
                )}
                {field(
                  t("Official source (Spanish)", "Fuente oficial (español)"),
                  "sourceUrlEs",
                  "url",
                )}
                {field(
                  t("Source checked on", "Fuente consultada el"),
                  "sourceVerifiedAt",
                  "date",
                )}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={item.membersOnly}
                    onChange={(e) => change("membersOnly", e.target.checked)}
                  />
                  {t("Members only", "Solo miembros")}
                </label>
                <fieldset>
                  <legend>
                    {t(
                      "Required tiers (empty means all)",
                      "Niveles requeridos (vacío significa todos)",
                    )}
                  </legend>
                  {["Gold", "Platinum", "Black"].map((tier) => (
                    <label className="check" key={tier}>
                      <input
                        type="checkbox"
                        checked={item.tiers.includes(tier)}
                        onChange={(e) =>
                          change(
                            "tiers",
                            e.target.checked
                              ? [...item.tiers, tier]
                              : item.tiers.filter((v: string) => v !== tier),
                          )
                        }
                      />
                      {tier}
                    </label>
                  ))}
                </fieldset>
                {field(
                  t(
                    "Verified booking link (optional)",
                    "Enlace de reserva verificado (opcional)",
                  ),
                  "bookingUrl",
                  "url",
                )}
              </>
            )}
            {kind !== "editions" && (
              <>
                {field(
                  t(
                    "Price (leave empty if unknown)",
                    "Precio (vacío si no se conoce)",
                  ),
                  "price",
                  "number",
                )}
                {field(t("Currency", "Divisa"), "currency")}
              </>
            )}
            <p className="caption">
              {t(
                "Publish only approved copy, photographs, availability and commercial conditions. Saving a draft does not activate an offer.",
                "Publica solo textos, fotografías, disponibilidad y condiciones comerciales aprobadas. Guardar un borrador no activa una oferta.",
              )}
            </p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                if (
                  !content ||
                  !confirm(t("Delete this item?", "¿Eliminar este elemento?"))
                )
                  return;
                const next = structuredClone(content);
                next[kind].splice(index, 1);
                setContent(next);
                setIndex(-1);
                setDirty(true);
              }}
            >
              {t("Delete item", "Eliminar elemento")}
            </button>
          </form>
        ) : (
          <p>
            {t(
              "Choose an issue, an experience or an offer.",
              "Elige un número, una experiencia o una oferta.",
            )}
          </p>
        )}
      </div>
      <p className="form-status" role="status">
        {status}
      </p>
    </div>
  );
}
