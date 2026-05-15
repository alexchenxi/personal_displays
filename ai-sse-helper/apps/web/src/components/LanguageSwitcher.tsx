"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useTransition } from "react";

const localeLabels: Record<string, string> = {
  en: "EN",
  zh: "中文",
  ar: "عربي",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="flex items-center gap-1">
      {Object.entries(localeLabels).map(([key, label]) => (
        <button
          key={key}
          onClick={() => switchLocale(key)}
          disabled={isPending}
          className={`rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
            locale === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}