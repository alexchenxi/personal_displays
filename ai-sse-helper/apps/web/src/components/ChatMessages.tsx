"use client";

import { useTranslations } from "next-intl";
import type { Message } from "ai";

export function ChatMessages({ messages }: { messages: Message[] }) {
  const t = useTranslations("chat");

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-lg">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="mb-1 text-xs font-semibold opacity-70">
              {m.role === "user" ? t("you") : t("ai")}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {m.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}