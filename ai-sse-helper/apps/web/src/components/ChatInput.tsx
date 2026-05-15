"use client";

import { useTranslations } from "next-intl";
import type { FormEvent } from "react";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const t = useTranslations("chat");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 border-t border-border bg-background p-4"
    >
      <input
        value={input}
        onChange={handleInputChange}
        placeholder={t("placeholder")}
        disabled={isLoading}
        className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            {t("thinking")}
          </span>
        ) : (
          t("send")
        )}
      </button>
    </form>
  );
}