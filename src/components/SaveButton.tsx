import { useState } from "react";
import { api, message } from "../lib/client";
export default function SaveButton({
  kind,
  itemId,
  lang,
}: {
  kind: string;
  itemId: string;
  lang: string;
}) {
  const [result, setResult] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (en: string, es: string) => (lang === "en" ? en : es);
  return (
    <div>
      <button
        className="pill"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("notebook", "POST", { kind, itemId });
            setResult(
              t(
                "Saved in your synced notebook.",
                "Guardado en tu cuaderno sincronizado.",
              ),
            );
          } catch (e) {
            if ((e as any).status === 401) {
              const key =
                kind === "article"
                  ? "sanctuario-saved"
                  : kind === "event"
                    ? "sanctuario-events"
                    : kind === "offer"
                      ? "sanctuario-offers"
                      : "sanctuario-experiences";
              try {
                const old = JSON.parse(localStorage.getItem(key) || "[]");
                localStorage.setItem(
                  key,
                  JSON.stringify([...new Set([...old, itemId])]),
                );
                setResult(
                  t(
                    "Saved on this device. Sign in to import and sync your collection.",
                    "Guardado en este dispositivo. Inicia sesión para importar y sincronizar tu colección.",
                  ),
                );
              } catch {
                setResult(
                  t(
                    "Browser storage is unavailable. Sign in to save.",
                    "El almacenamiento no está disponible. Inicia sesión para guardar.",
                  ),
                );
              }
            } else setResult(message(e, lang));
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("Keep for later", "Guardar para después")}
      </button>
      <p role="status" className="caption">
        {result}
      </p>
    </div>
  );
}
