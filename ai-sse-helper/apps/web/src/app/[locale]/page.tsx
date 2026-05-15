"use client"

import { useCallback, useState } from "react"
import { useChat } from "ai/react"
import { useTranslations } from "next-intl"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput } from "@/components/ChatInput"
import { ErrorToast } from "@/components/ErrorToast"
import { logApiError, logClientError } from "@/lib/error-logger"

export default function ChatPage() {
  const t = useTranslations("chat")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleError = useCallback(
    (error: Error) => {
      logClientError("Chat API request failed", error)
      if (
        error.message?.includes("500") ||
        error.message?.includes("Internal")
      ) {
        setErrorMessage(t("error500"))
      } else if (
        error.message?.includes("fetch") ||
        error.message?.includes("network") ||
        error.message?.includes("NetworkError")
      ) {
        setErrorMessage(t("errorNetwork"))
      } else {
        setErrorMessage(JSON.parse(error.message).error || t("errorUnknown"))
      }
    },
    [t],
  )

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      onError: handleError,
      onResponse(response) {
        if (!response.ok) {
          response
            .clone()
            .json()
            .then((body) => {
              logApiError(response.status, response.statusText, body)
            })
            .catch(() => {
              logApiError(response.status, response.statusText)
            })
        }
      },
    })

  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4">
      {errorMessage && (
        <ErrorToast message={errorMessage} onClose={clearError} />
      )}

      <div className="border-b border-border py-6 text-center">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ChatMessages messages={messages} />

      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
