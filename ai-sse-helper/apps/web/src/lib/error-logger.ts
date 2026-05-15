type ErrorLevel = "warn" | "error"

interface LogEntry {
  timestamp: string
  level: ErrorLevel
  message: string
  context?: Record<string, unknown>
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function createLogEntry(
  level: ErrorLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    context,
  }
}

export function logApiError(
  status: number,
  statusText: string,
  body?: unknown,
): void {
  const entry = createLogEntry("error", `API ${status}: ${statusText}`, {
    status,
    statusText,
    body,
    url: "/api/chat",
  })

  if (typeof window !== "undefined") {
    console.error(
      `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`,
      entry.context,
    )
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const logs = JSON.parse(
        localStorage.getItem("ai-sse-error-logs") || "[]",
      ) as LogEntry[]
      logs.push(entry)
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50)
      }
      localStorage.setItem("ai-sse-error-logs", JSON.stringify(logs))
    } catch {
      // localStorage may be unavailable or full
    }
  }
}

export function logClientError(message: string, error?: unknown): void {
  const entry = createLogEntry("error", message, {
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
  })

  console.error(
    `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`,
    entry.context,
  )
}

export function getErrorLogs(): LogEntry[] {
  if (typeof window === "undefined" || !window.localStorage) return []
  try {
    return JSON.parse(localStorage.getItem("ai-sse-error-logs") || "[]")
  } catch {
    return []
  }
}

export function clearErrorLogs(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("ai-sse-error-logs")
  }
}
