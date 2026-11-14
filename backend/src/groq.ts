export class GroqError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

// Never propagate provider response bodies, request headers or credentials to logs/errors.
export async function generateGroqAnswer(
  apiKey: string,
  model: string,
  systemInstruction: string,
  context: string,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<string> {
  const signal = AbortSignal.timeout(options.timeoutMs ?? 25000);
  try {
    const response = await (options.fetch ?? fetch)(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_completion_tokens: 500,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: context },
          ],
        }),
      },
    );
    if (response.status === 401 || response.status === 403) {
      throw new GroqError("AI_AUTH_ERROR", 503, "Groq rechazó la credencial o el acceso. Revisa la configuración segura del backend.");
    }
    if (response.status === 429) {
      const seconds = Number(response.headers.get("retry-after"));
      const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.ceil(seconds), 3600) : 60;
      throw new GroqError("AI_RATE_LIMITED", 503, "Groq alcanzó su límite de solicitudes o cuota. Intenta más tarde.", retryAfter);
    }
    if (response.status === 404) {
      throw new GroqError("AI_MODEL_UNAVAILABLE", 503, "El modelo Groq configurado no está disponible para esta cuenta.");
    }
    if (!response.ok) {
      throw new GroqError("AI_PROVIDER_ERROR", 502, "Groq no pudo procesar el análisis. Intenta más tarde o revisa el modelo configurado.");
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new GroqError("AI_EMPTY_RESPONSE", 502, "Groq no devolvió una respuesta de texto.");
    }
    return content.trim();
  } catch (error) {
    if (error instanceof GroqError) throw error;
    if (signal.aborted) {
      throw new GroqError("AI_TIMEOUT", 504, "Groq superó el tiempo de espera. Intenta nuevamente.");
    }
    throw new GroqError("AI_CONNECTION_ERROR", 502, "No se pudo obtener una respuesta válida de Groq.");
  }
}
