import { useState } from "react";
import { api, message } from "../lib/client";
export default function RuleEditor({
  lang,
  initial,
  onSaved,
}: {
  lang: string;
  initial: any;
  onSaved: () => void;
}) {
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  const [rules, setRules] = useState<any>(initial.rules),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key: string, value: any) => setRules({ ...rules, [key]: value });
  const change = (group: string, index: number, key: string, value: any) => {
    const next = structuredClone(rules);
    next[group][index][key] = value;
    setRules(next);
  };
  return (
    <form
      className="v2-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("staff/program", "PUT", {
            rules,
            version: initial.version,
          });
          setStatus(
            t(
              "Programme configuration saved.",
              "Configuración del programa guardada.",
            ),
          );
          onSaved();
        } catch (err) {
          setStatus(message(err, lang));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>
        {t("Rules approved by the house", "Reglas aprobadas por la casa")}
      </h2>
      <p>
        {t(
          "Enter the hotel’s real rules before activation. An empty configuration makes no promise to members.",
          "Introduce las reglas reales del hotel antes de activar. Una configuración vacía no promete beneficios.",
        )}
      </p>
      <label>
        {t("Programme name", "Nombre del programa")}
        <input
          value={rules.name}
          onChange={(e) => set("name", e.target.value)}
          required
          maxLength={100}
        />
      </label>
      <fieldset>
        <legend>{t("Tier criteria", "Criterios de los niveles")}</legend>
        {["Gold", "Platinum", "Black"].map((name) => {
          const i = rules.tiers.findIndex((r: any) => r.name === name),
            tier = rules.tiers[i];
          return (
            <section key={name}>
              <h3>{name}</h3>
              <label>
                {t(
                  "Minimum points under the real rule",
                  "Puntos mínimos según la regla real",
                )}
                <input
                  type="number"
                  min="0"
                  value={tier?.minimumPoints ?? ""}
                  onChange={(e) => {
                    const list = [...rules.tiers];
                    if (i < 0)
                      list.push({
                        name,
                        minimumPoints: Number(e.target.value),
                        criteria: "",
                      });
                    else
                      list[i] = {
                        ...tier,
                        minimumPoints: Number(e.target.value),
                      };
                    set("tiers", list);
                  }}
                />
              </label>
              <label>
                {t("Qualification criteria", "Criterios de calificación")}
                <textarea
                  value={tier?.criteria || ""}
                  onChange={(e) => {
                    const list = [...rules.tiers];
                    if (i < 0)
                      list.push({
                        name,
                        minimumPoints: 0,
                        criteria: e.target.value,
                      });
                    else list[i] = { ...tier, criteria: e.target.value };
                    set("tiers", list);
                  }}
                />
              </label>
            </section>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>{t("Eligible operations", "Operaciones elegibles")}</legend>
        {rules.operations.map((r: any, i: number) => (
          <section className="inset-panel" key={i}>
            <label>
              {t("Rule identifier", "Identificador de regla")}
              <input
                value={r.id}
                onChange={(e) => change("operations", i, "id", e.target.value)}
                required
              />
            </label>
            <label>
              {t("Description", "Descripción")}
              <input
                value={r.description}
                onChange={(e) =>
                  change("operations", i, "description", e.target.value)
                }
                required
              />
            </label>
            <div className="form-grid">
              <label>
                {t("Movement", "Movimiento")}
                <select
                  value={r.kind}
                  onChange={(e) =>
                    change("operations", i, "kind", e.target.value)
                  }
                >
                  <option value="earned">{t("Earn", "Ganar")}</option>
                  <option value="used">{t("Use", "Utilizar")}</option>
                </select>
              </label>
              <label>
                {t("Validated event", "Evento validado")}
                <select
                  value={r.trigger}
                  onChange={(e) =>
                    change("operations", i, "trigger", e.target.value)
                  }
                >
                  <option value="completed_stay">
                    {t(
                      "Completed stay imported by staff",
                      "Estancia finalizada importada por personal",
                    )}
                  </option>
                  <option value="verified_experience">
                    {t("Confirmed experience", "Experiencia confirmada")}
                  </option>
                  <option value="redemption">
                    {t(
                      "Verified redemption reference",
                      "Referencia de canje verificada",
                    )}
                  </option>
                </select>
              </label>
            </div>
            <label>
              {t(
                "Points per validated operation",
                "Puntos por operación validada",
              )}
              <input
                type="number"
                min="1"
                value={r.points || ""}
                onChange={(e) =>
                  change("operations", i, "points", Number(e.target.value))
                }
                required
              />
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                set(
                  "operations",
                  rules.operations.filter((_: any, n: number) => n !== i),
                )
              }
            >
              {t("Remove rule", "Eliminar regla")}
            </button>
          </section>
        ))}
        <button
          type="button"
          className="pill"
          onClick={() =>
            set("operations", [
              ...rules.operations,
              {
                id: "",
                description: "",
                kind: "earned",
                trigger: "completed_stay",
                points: 0,
              },
            ])
          }
        >
          {t("Add a rule", "Añadir regla")}
        </button>
      </fieldset>
      <fieldset>
        <legend>{t("Activated benefits", "Beneficios activados")}</legend>
        {rules.benefits.map((b: any, i: number) => (
          <section key={i}>
            <label>
              {t("Benefit identifier", "Identificador de beneficio")}
              <input
                value={b.id}
                onChange={(e) => change("benefits", i, "id", e.target.value)}
              />
            </label>
            <label>
              {t("Approved benefit", "Beneficio aprobado")}
              <input
                value={b.title}
                onChange={(e) => change("benefits", i, "title", e.target.value)}
              />
            </label>
            <label>
              {t("Tier", "Nivel")}
              <select
                value={b.tier}
                onChange={(e) => change("benefits", i, "tier", e.target.value)}
              >
                {["Gold", "Platinum", "Black"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={b.active}
                onChange={(e) =>
                  change("benefits", i, "active", e.target.checked)
                }
              />
              {t("Active", "Activo")}
            </label>
          </section>
        ))}
        <button
          type="button"
          className="pill"
          onClick={() =>
            set("benefits", [
              ...rules.benefits,
              { id: "", title: "", tier: "Gold", active: false },
            ])
          }
        >
          {t("Add an approved benefit", "Añadir beneficio aprobado")}
        </button>
      </fieldset>
      <label>
        {t(
          "Points validity in days (empty means no expiry)",
          "Vigencia de puntos en días (vacío significa sin caducidad)",
        )}
        <input
          type="number"
          min="1"
          value={rules.validityDays ?? ""}
          onChange={(e) =>
            set(
              "validityDays",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
        />
      </label>
      <label>
        {t(
          "Approved terms, validity and cancellation rules",
          "Condiciones aprobadas, vigencia y reglas de cancelación",
        )}
        <textarea
          required={rules.active}
          rows={5}
          value={rules.terms || ""}
          onChange={(e) => set("terms", e.target.value)}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={rules.active}
          onChange={(e) => set("active", e.target.checked)}
        />
        {t(
          "Activate the programme using these hotel-approved rules",
          "Activar el programa con estas reglas aprobadas por el hotel",
        )}
      </label>
      <button className="pill dark" disabled={busy}>
        {t("Save programme rules", "Guardar reglas del programa")}
      </button>
      <p className="form-status" role="status">
        {status}
      </p>
    </form>
  );
}
