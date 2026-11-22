import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  contentSchema,
  categories,
  categoryLabels,
  CONTENT_PATH,
  REPOSITORY,
  type Article,
  type JournalEvent,
  type Content,
  type Locale,
} from "../lib/schema";
import { localDay, plusDays } from "../lib/travel";
import { brandName } from "../lib/brand";

type Props = { branch: string; server?: boolean };
const emptyPair = () => ({ en: "", es: "" });
const encode = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const decode = (text: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
export default function Editor({ branch, server = false }: Props) {
  const [lang, setLang] = useState<Locale>("en");
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [inputToken, setInputToken] = useState("");
  const [token, setToken] = useState("");
  const [content, setContent] = useState<Content | null>(null);
  const [sha, setSha] = useState("");
  const [selected, setSelected] = useState<{
    kind: "articles" | "events";
    index: number;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const api = async (
    path: string,
    credential: string,
    options: RequestInit = {},
  ) => {
    if (server) {
      if (path === "") {
        const r = await fetch("/api/v2/staff", { cache: "no-store" });
        if (!r.ok)
          throw new Error(
            t("House-team access required.", "Se requiere acceso del equipo."),
          );
        const d = await r.json();
        return {
          permissions: {
            push: d.actor.roles.some((r: string) =>
              ["editor", "admin"].includes(r),
            ),
          },
        };
      }
      const body = options.body ? JSON.parse(String(options.body)) : undefined;
      const r = await fetch("/api/v2/staff/editorial", {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json" },
        body: body
          ? JSON.stringify({
              version: Number(body.sha),
              content: JSON.parse(decode(body.content)),
            })
          : undefined,
        cache: "no-store",
      });
      if (!r.ok)
        throw new Error(
          r.status === 409
            ? t(
                "Another editor saved changes. Export your work, then reload.",
                "Otro editor guardó cambios. Exporta tu trabajo y recarga.",
              )
            : t(
                "The edition could not be saved. Your changes are still here.",
                "No se pudo guardar la edición. Tus cambios siguen aquí.",
              ),
        );
      const d = await r.json();
      return options.method === "PUT"
        ? { content: { sha: String(d.version) } }
        : {
            sha: String(d.version),
            content: encode(JSON.stringify(d.content)),
          };
    }
    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}${path}`,
      {
        ...options,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${credential}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...options.headers,
        },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 409 || response.status === 422
          ? t(
              "The edition changed on GitHub. Export your work, then reload before saving.",
              "La edición cambió en GitHub. Exporta tu trabajo y recarga antes de guardar.",
            )
          : t(
              `GitHub refused the request (${response.status}). Check repository access and token permissions.`,
              `GitHub rechazó la solicitud (${response.status}). Comprueba los permisos del token y del repositorio.`,
            ),
      );
    return response.json();
  };
  const load = async (credential: string) => {
    const repo = await api("", credential);
    if (!repo.permissions?.push)
      throw new Error(
        t(
          "Write access to this repository is required.",
          "Se necesita acceso de escritura a este repositorio.",
        ),
      );
    const file = await api(
      `/contents/${CONTENT_PATH}?ref=${encodeURIComponent(branch)}`,
      credential,
    );
    const edition = contentSchema.parse(JSON.parse(decode(file.content)));
    setContent(edition);
    setSha(file.sha);
    setSelected(null);
    setDirty(false);
  };
  const connect = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await load(inputToken);
      setToken(inputToken);
      setInputToken("");
      setStatus(
        t(
          "Connected. Your token stays in this tab’s memory.",
          "Conectado. Tu token permanece en la memoria de esta pestaña.",
        ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (server)
      load("session")
        .then(() => setToken("session"))
        .catch((e) => setStatus(String(e)));
  }, [server]);
  const update = (field: string, value: unknown) => {
    if (!content || !selected) return;
    const next = structuredClone(content);
    const item = next[selected.kind][selected.index] as unknown as Record<
      string,
      any
    >;
    const keys = field.split(".");
    let cursor = item;
    keys.slice(0, -1).forEach((key) => (cursor = cursor[key]));
    cursor[keys.at(-1)!] = value;
    if (selected.kind === "articles") item.updatedAt = localDay();
    setContent(next);
    setDirty(true);
  };
  const add = (kind: "articles" | "events") => {
    if (!content) return;
    const next = structuredClone(content);
    if (kind === "articles")
      next.articles.push({
        id: "new-story-" + Date.now().toString(36),
        category: "hotel",
        status: "draft",
        featured: false,
        author: emptyPair(),
        date: localDay(),
        updatedAt: localDay(),
        image: {
          src: "/assets/hero.jpg",
          alt: emptyPair(),
          credit: "",
          source: "https://www.lacasaquecanta.com/",
        },
        source: "https://www.lacasaquecanta.com/",
        locales: {
          en: { title: "", intro: "", body: "" },
          es: { title: "", intro: "", body: "" },
        },
      });
    else
      next.events.push({
        id: "new-event-" + Date.now().toString(36),
        title: emptyPair(),
        description: emptyPair(),
        location: emptyPair(),
        start: localDay(),
        end: plusDays(localDay(), 1),
        status: "draft",
        category: "culture",
        context: "bay",
        source: "https://www.lacasaquecanta.com/",
        verifiedAt: localDay(),
      });
    setContent(next);
    setSelected({ kind, index: next[kind].length - 1 });
    setDirty(true);
    setPreview(false);
  };
  const save = async () => {
    if (!content) return;
    const validation = contentSchema.safeParse(content);
    if (!validation.success) {
      setStatus(
        validation.error.issues
          .map((issue) => issue.path.join(".") + ": " + issue.message)
          .join("\n"),
      );
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await api(`/contents/${CONTENT_PATH}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: "Update Sanctuary editorial edition",
          branch,
          sha,
          content: encode(JSON.stringify(validation.data, null, 2) + "\n"),
        }),
      });
      setSha(result.content.sha);
      setDirty(false);
      setStatus(
        server
          ? t(
              "Edition saved. Published content is available immediately. Demonstration edits stay in this sandbox.",
              "Edición guardada. El contenido publicado está disponible de inmediato. Los cambios de demostración permanecen en este espacio de prueba.",
            )
          : t(
              "Edition saved to GitHub. Public articles update within about one minute. Drafts remain outside the journal.",
              "Edición guardada en GitHub. Los artículos públicos se actualizan en aproximadamente un minuto. Los borradores quedan fuera de la revista.",
            ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file || !selected || selected.kind !== "articles") return;
    if (server) {
      setBusy(true);
      try {
        const response = await fetch("/api/media-upload", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok)
          throw new Error(
            t(
              "Upload failed. Use a JPG, PNG or WebP below 3 MB.",
              "Falló la subida. Usa JPG, PNG o WebP de menos de 3 MB.",
            ),
          );
        const data = await response.json();
        update("image.src", data.path);
        setStatus(
          t(
            "Photograph saved. Add its credit and descriptions.",
            "Fotografía guardada. Añade crédito y descripciones.",
          ),
        );
      } catch (e) {
        setStatus(String(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setStatus(
        t(
          "Choose a JPG, PNG or WebP image below 5 MB.",
          "Elige una imagen JPG, PNG o WebP de menos de 5 MB.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png =
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71;
      const webp =
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      if (!jpg && !png && !webp)
        throw new Error(
          t(
            "The file is not a supported image.",
            "El archivo no es una imagen admitida.",
          ),
        );
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const path = `public/media/editorial/${crypto.randomUUID()}.${jpg ? "jpg" : png ? "png" : "webp"}`;
      await api(`/contents/${path}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: "Add Sanctuary editorial photograph",
          branch,
          content: btoa(binary),
        }),
      });
      update(
        "image.src",
        `https://raw.githubusercontent.com/${REPOSITORY}/${branch}/${path}`,
      );
      setStatus(
        t(
          "Photograph uploaded. Add the credit, source and both descriptions, then save the edition.",
          "Fotografía subida. Añade crédito, fuente y ambas descripciones; luego guarda la edición.",
        ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const exportEdition = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName(lang).toLowerCase().replaceAll(" ", "-")}-edition.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const item =
    content && selected ? content[selected.kind][selected.index] : null;
  const article =
    selected?.kind === "articles" ? (item as Article | null) : null;
  const journalEvent =
    selected?.kind === "events" ? (item as JournalEvent | null) : null;
  const field = (label: string, path: string, value: string, type = "text") => (
    <label className="editor-field">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => update(path, e.target.value)}
        disabled={busy}
      />
    </label>
  );
  return (
    <div className="editor">
      <header className="editor-header">
        <a className="mini-title" href={`/${lang}/`}>
          {brandName(lang)}
        </a>
        <span>{t("Editorial studio", "Estudio editorial")}</span>
        <button onClick={() => setLang(lang === "en" ? "es" : "en")}>
          EN / ES
        </button>
        {token && (
          <button
            onClick={() => {
              if (
                dirty &&
                !window.confirm(
                  t(
                    "Discard unsaved changes?",
                    "¿Descartar cambios sin guardar?",
                  ),
                )
              )
                return;
              setToken("");
              setContent(null);
              setStatus("");
              setDirty(false);
            }}
          >
            {t("Sign out", "Cerrar sesión")}
          </button>
        )}
      </header>
      {!token ? (
        <main className="editor-login">
          <p className="eyebrow">
            {t("FOR THE HOTEL TEAM", "PARA EL EQUIPO DEL HOTEL")}
          </p>
          <h1>{t("Stories begin here.", "Las historias comienzan aquí.")}</h1>
          <p>
            {t(
              "Connect with a GitHub token that has Contents read/write access to this repository. Your GitHub account must have write access. The token is used only with GitHub and is never saved by this application.",
              "Conecta un token de GitHub con permiso de lectura y escritura de Contents en este repositorio. Tu cuenta debe tener acceso de escritura. El token solo se usa con GitHub y esta aplicación nunca lo guarda.",
            )}
          </p>
          <form onSubmit={connect}>
            <label className="editor-field">
              {t("GitHub access token", "Token de acceso de GitHub")}
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <button className="pill dark" disabled={busy}>
              {busy
                ? t("Connecting…", "Conectando…")
                : t("Connect editorial studio", "Conectar estudio editorial")}
            </button>
          </form>
          <p className="caption">
            {REPOSITORY} · {branch}
          </p>
          <a
            className="text-link"
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(
              "Create a fine-grained GitHub token",
              "Crear un token de GitHub con permisos específicos",
            )}
          </a>
        </main>
      ) : (
        <main className="editor-main">
          <aside className="editor-sidebar">
            <div className="editor-actions">
              <button
                className="pill dark"
                disabled={busy}
                onClick={() => add("articles")}
              >
                {t("New article", "Nuevo artículo")}
              </button>
              <button
                className="pill"
                disabled={busy}
                onClick={() => add("events")}
              >
                {t("New event", "Nuevo evento")}
              </button>
            </div>
            <h2>{t("Articles", "Artículos")}</h2>
            {content?.articles.map((a, index) => (
              <button
                className={
                  selected?.kind === "articles" && selected.index === index
                    ? "editor-row selected"
                    : "editor-row"
                }
                key={index}
                onClick={() => {
                  setSelected({ kind: "articles", index });
                  setPreview(false);
                }}
              >
                {a.locales[lang].title || a.id}
                <small>{a.status}</small>
              </button>
            ))}
            <h2>{t("Events", "Eventos")}</h2>
            {content?.events.map((e, index) => (
              <button
                className={
                  selected?.kind === "events" && selected.index === index
                    ? "editor-row selected"
                    : "editor-row"
                }
                key={index}
                onClick={() => {
                  setSelected({ kind: "events", index });
                  setPreview(false);
                }}
              >
                {e.title[lang] || e.id}
                <small>{e.status}</small>
              </button>
            ))}
          </aside>
          <section className="editor-content">
            <div className="editor-toolbar">
              <button
                className="pill dark"
                onClick={save}
                disabled={busy || !dirty}
              >
                {busy
                  ? t("Saving…", "Guardando…")
                  : t("Save edition", "Guardar edición")}
              </button>
              <button className="text-link" onClick={exportEdition}>
                {t("Export backup", "Exportar copia")}
              </button>
              <button
                className="text-link"
                disabled={busy}
                onClick={async () => {
                  if (
                    dirty &&
                    !window.confirm(
                      t(
                        "Discard unsaved changes and reload?",
                        "¿Descartar cambios sin guardar y recargar?",
                      ),
                    )
                  )
                    return;
                  try {
                    await load(token);
                  } catch (e) {
                    setStatus(String(e));
                  }
                }}
              >
                {t("Reload", "Recargar")}
              </button>
              <span className="caption">
                {dirty
                  ? t("Unsaved changes", "Cambios sin guardar")
                  : t("Edition saved", "Edición guardada")}
              </span>
            </div>
            {!item ? (
              <div className="editor-empty">
                <h1>
                  {t("A new chapter awaits.", "Te espera un nuevo capítulo.")}
                </h1>
                <p>
                  {t(
                    "Choose an article or event, or create a draft. All articles require English and Spanish versions.",
                    "Elige un artículo o evento, o crea un borrador. Todos los artículos requieren versiones en inglés y español.",
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="editor-actions">
                  <button
                    className="text-link"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview
                      ? t("Edit", "Editar")
                      : t("Preview", "Vista previa")}
                  </button>
                  <button
                    className="text-link"
                    onClick={() => {
                      if (
                        !content ||
                        !selected ||
                        !window.confirm(
                          t(
                            "Remove this item? Save the edition to apply.",
                            "¿Eliminar este elemento? Guarda la edición para aplicar el cambio.",
                          ),
                        )
                      )
                        return;
                      const next = structuredClone(content);
                      next[selected.kind].splice(selected.index, 1);
                      setContent(next);
                      setSelected(null);
                      setDirty(true);
                    }}
                  >
                    {t("Delete", "Eliminar")}
                  </button>
                </div>
                {preview ? (
                  <article className="reader-body editor-preview">
                    {article ? (
                      <>
                        <p className="sample-note">
                          {t("Preview only · ", "Vista previa · ")}
                          {article.status}
                        </p>
                        <img
                          src={article.image.src}
                          alt={article.image.alt[lang]}
                        />
                        <h1>{article.locales[lang].title}</h1>
                        <p className="reader-lead">
                          {article.locales[lang].intro}
                        </p>
                        <div
                          className="prose"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              marked.parse(article.locales[lang].body, {
                                async: false,
                              }) as string,
                            ),
                          }}
                        />
                      </>
                    ) : (
                      journalEvent && (
                        <>
                          <h1>{journalEvent.title[lang]}</h1>
                          <p>
                            {journalEvent.start} – {journalEvent.end} (
                            {t("exclusive end date", "fecha de fin exclusiva")})
                          </p>
                          <p>{journalEvent.description[lang]}</p>
                        </>
                      )
                    )}
                  </article>
                ) : (
                  <div className="editor-form">
                    {field(
                      t("URL identifier", "Identificador URL"),
                      "id",
                      item.id,
                    )}
                    <label className="editor-field">
                      {t("Publication status", "Estado de publicación")}
                      <select
                        value={item.status}
                        onChange={(e) => update("status", e.target.value)}
                      >
                        {(article
                          ? ["draft", "review", "sample", "published"]
                          : ["draft", "scheduled", "cancelled"]
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    {article && (
                      <>
                        <label className="editor-field">
                          {t("Category", "Categoría")}
                          <select
                            value={article.category}
                            onChange={(e) => update("category", e.target.value)}
                          >
                            {categories.map((value) => (
                              <option key={value} value={value}>
                                {categoryLabels[value][lang]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="editor-checkbox">
                          <input
                            type="checkbox"
                            checked={article.featured}
                            onChange={(e) =>
                              update("featured", e.target.checked)
                            }
                          />
                          {t(
                            "Feature in the journal",
                            "Destacar en la revista",
                          )}
                        </label>
                        {field(
                          t("Publication date", "Fecha de publicación"),
                          "date",
                          article.date,
                          "date",
                        )}
                        <label className="editor-field">
                          {t("Issue", "Número")}
                          <select
                            value={article.editionId || ""}
                            onChange={(e) =>
                              update("editionId", e.target.value || undefined)
                            }
                          >
                            <option value="">
                              {t("Not assigned", "Sin asignar")}
                            </option>
                            {content?.editions.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.number} · {e.title[lang]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {article.category === "recipe" && (
                          <fieldset>
                            <legend>
                              {t("Structured recipe", "Receta estructurada")}
                            </legend>
                            <label className="editor-checkbox">
                              <input
                                type="checkbox"
                                checked={Boolean(article.recipe)}
                                onChange={(e) =>
                                  update(
                                    "recipe",
                                    e.target.checked
                                      ? {
                                          servings: 1,
                                          ingredients: emptyPair(),
                                          steps: emptyPair(),
                                          validatedDietary: [],
                                        }
                                      : undefined,
                                  )
                                }
                              />
                              {t(
                                "Display ingredients, steps and servings",
                                "Mostrar ingredientes, pasos y porciones",
                              )}
                            </label>
                            {article.recipe && (
                              <>
                                <label className="editor-field">
                                  {t("Servings", "Porciones")}
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={article.recipe.servings}
                                    onChange={(e) =>
                                      update(
                                        "recipe.servings",
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </label>
                                {(["en", "es"] as const).map((locale) => (
                                  <div key={locale}>
                                    <label className="editor-field">
                                      {t(
                                        "Ingredients, one per line",
                                        "Ingredientes, uno por línea",
                                      )}{" "}
                                      · {locale}
                                      <textarea
                                        value={
                                          article.recipe!.ingredients[locale]
                                        }
                                        onChange={(e) =>
                                          update(
                                            `recipe.ingredients.${locale}`,
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="editor-field">
                                      {t(
                                        "Steps, one per line",
                                        "Pasos, uno por línea",
                                      )}{" "}
                                      · {locale}
                                      <textarea
                                        value={article.recipe!.steps[locale]}
                                        onChange={(e) =>
                                          update(
                                            `recipe.steps.${locale}`,
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                  </div>
                                ))}
                                <p className="caption">
                                  {t(
                                    "Only add dietary labels validated by the kitchen.",
                                    "Añade únicamente etiquetas alimentarias validadas por la cocina.",
                                  )}
                                </p>
                              </>
                            )}
                          </fieldset>
                        )}
                        {field(
                          t(
                            "Photograph URL or /media/ path",
                            "URL de fotografía o ruta /media/",
                          ),
                          "image.src",
                          article.image.src,
                        )}
                        <label className="editor-field">
                          {t("Upload photograph", "Subir fotografía")}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(e) => void upload(e.target.files?.[0])}
                          />
                        </label>
                        {field(
                          t("Photograph credit", "Crédito de fotografía"),
                          "image.credit",
                          article.image.credit,
                        )}
                        {field(
                          t(
                            "Photograph source (HTTPS)",
                            "Fuente de fotografía (HTTPS)",
                          ),
                          "image.source",
                          article.image.source,
                          "url",
                        )}
                        {(["en", "es"] as const).map((locale) => (
                          <fieldset key={locale}>
                            <legend>
                              {locale === "en" ? "English" : "Español"}
                            </legend>
                            {field(
                              t("Author", "Autor") + " · " + locale,
                              `author.${locale}`,
                              article.author[locale],
                            )}
                            {field(
                              t("Title", "Título") + " · " + locale,
                              `locales.${locale}.title`,
                              article.locales[locale].title,
                            )}
                            {field(
                              t("Introduction", "Introducción") +
                                " · " +
                                locale,
                              `locales.${locale}.intro`,
                              article.locales[locale].intro,
                            )}
                            {field(
                              t("Image description", "Descripción de imagen") +
                                " · " +
                                locale,
                              `image.alt.${locale}`,
                              article.image.alt[locale],
                            )}
                            <label className="editor-field">
                              {t(
                                "Article body · Markdown",
                                "Cuerpo del artículo · Markdown",
                              )}{" "}
                              · {locale}
                              <textarea
                                rows={16}
                                value={article.locales[locale].body}
                                onChange={(e) =>
                                  update(
                                    `locales.${locale}.body`,
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                          </fieldset>
                        ))}
                      </>
                    )}
                    {journalEvent && (
                      <>
                        <label className="editor-field">
                          {t("Hotel or bay", "Hotel o bahía")}
                          <select
                            value={journalEvent.context}
                            onChange={(e) => update("context", e.target.value)}
                          >
                            <option value="hotel">{t("Hotel", "Hotel")}</option>
                            <option value="bay">{t("Bay", "Bahía")}</option>
                          </select>
                        </label>
                        <label className="editor-field">
                          {t(
                            "Confirmed local start time (optional)",
                            "Hora local confirmada de inicio (opcional)",
                          )}
                          <input
                            type="time"
                            value={journalEvent.startTime || ""}
                            onChange={(e) =>
                              update("startTime", e.target.value || undefined)
                            }
                          />
                        </label>
                        <label className="editor-field">
                          {t(
                            "Confirmed local end time (optional)",
                            "Hora local confirmada de fin (opcional)",
                          )}
                          <input
                            type="time"
                            value={journalEvent.endTime || ""}
                            onChange={(e) =>
                              update("endTime", e.target.value || undefined)
                            }
                          />
                        </label>
                        <label className="editor-field">
                          {t("Category", "Categoría")}
                          <select
                            value={journalEvent.category}
                            onChange={(e) => update("category", e.target.value)}
                          >
                            {["music", "community", "culture"].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        {field(
                          t("First day", "Primer día"),
                          "start",
                          journalEvent.start,
                          "date",
                        )}
                        {field(
                          t(
                            "End date (day after the last day)",
                            "Fin (día posterior al último día)",
                          ),
                          "end",
                          journalEvent.end,
                          "date",
                        )}
                        {field(
                          t(
                            "Official source verified on",
                            "Fuente oficial verificada el",
                          ),
                          "verifiedAt",
                          journalEvent.verifiedAt,
                          "date",
                        )}
                        {(["en", "es"] as const).map((locale) => (
                          <fieldset key={locale}>
                            <legend>
                              {locale === "en" ? "English" : "Español"}
                            </legend>
                            {field(
                              t("Title", "Título") + " · " + locale,
                              `title.${locale}`,
                              journalEvent.title[locale],
                            )}
                            {field(
                              t("Location", "Lugar") + " · " + locale,
                              `location.${locale}`,
                              journalEvent.location[locale],
                            )}
                            <label className="editor-field">
                              {t("Description", "Descripción")} · {locale}
                              <textarea
                                rows={5}
                                value={journalEvent.description[locale]}
                                onChange={(e) =>
                                  update(
                                    `description.${locale}`,
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                          </fieldset>
                        ))}
                      </>
                    )}
                    {field(
                      t("Official source (HTTPS)", "Fuente oficial (HTTPS)"),
                      "source",
                      item.source,
                      "url",
                    )}
                    <p className="caption">
                      {server
                        ? t(
                            "Publish approved copy and photographs only. Drafts remain private to authorised editors. Demo edits stay isolated.",
                            "Publica solo textos y fotografías aprobados. Los borradores permanecen privados para los editores autorizados. Los cambios de demostración permanecen aislados.",
                          )
                        : t(
                            "Publish only hotel-approved copy and photographs. Drafts and samples are never added to the public sitemap. This GitHub repository is public; drafts are not confidential.",
                            "Publica solo textos y fotografías aprobados por el hotel. Los borradores y muestras no se añaden al sitemap público. Este repositorio es público; los borradores no son confidenciales.",
                          )}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      )}
      <p className="editor-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
