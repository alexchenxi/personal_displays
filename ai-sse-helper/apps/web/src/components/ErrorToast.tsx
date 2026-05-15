"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

interface ErrorToastProps {
  message: string
  onClose: () => void
  duration?: number
}

export function ErrorToast({
  message,
  onClose,
  duration = 8000,
}: ErrorToastProps) {
  const t = useTranslations("chat")
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const handleClose = () => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onClose()
    }, 300)
  }

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => handleClose(), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible && !exiting) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg transition-all duration-300 dark:border-red-800 dark:bg-red-950 sm:px-5 sm:py-4 ${
        visible && !exiting
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5 text-red-600 dark:text-red-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            {t("errorTitle")}
          </p>
          <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="shrink-0 rounded-lg p-1 text-red-500 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
          aria-label={t("errorClose")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {duration > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-red-200 dark:bg-red-800">
          <div
            className="h-full rounded-full bg-red-500 dark:bg-red-400"
            style={{
              animation: `errorToastShrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  )
}
