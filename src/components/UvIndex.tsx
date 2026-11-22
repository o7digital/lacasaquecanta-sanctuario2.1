import { uvCardMarkup, type UvForecast } from "../lib/uv";

export default function UvIndex({
  uv,
  lang,
  stale,
  loading,
}: {
  uv?: UvForecast | null;
  lang: string;
  stale?: boolean;
  loading?: boolean;
}) {
  // Markup contains only fixed labels and validated forecast numbers/timestamps.
  return (
    <div
      className="today-uv"
      dangerouslySetInnerHTML={{
        __html: uvCardMarkup(uv, lang, { stale, loading, id: "uv-explore" }),
      }}
    />
  );
}
