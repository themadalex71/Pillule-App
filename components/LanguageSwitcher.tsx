"use client";

import { useI18n } from "@/components/I18nProvider";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`inline-flex items-center gap-2 ${compact ? "" : "rounded-xl border border-[#ece4f7] bg-white px-2 py-1.5"}`}>
      {!compact && <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8d82a8]">{t("common.language")}</span>}
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${locale === "fr" ? "bg-[#7a52c8] text-white" : "text-[#6f628f] hover:bg-[#f6f2ff]"}`}
      >
        {t("common.french")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${locale === "en" ? "bg-[#7a52c8] text-white" : "text-[#6f628f] hover:bg-[#f6f2ff]"}`}
      >
        {t("common.english")}
      </button>
    </div>
  );
}
