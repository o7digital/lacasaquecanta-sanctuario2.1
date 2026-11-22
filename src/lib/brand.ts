export const brandName = (lang: string) =>
  lang === "es" ? "El Santuario" : "Sanctuary";

// Existing editorial editions and membership rules can retain the former name.
export const localizeBrand = (text: string, lang: string) =>
  text.replace(
    /\b(?:El Sanctuario|El Santuario|Sanctuary)\b/g,
    brandName(lang),
  );
