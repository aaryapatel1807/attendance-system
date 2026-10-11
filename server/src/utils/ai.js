import { httpError } from "../middleware/errorHandler.js";

export function aiBase() {
  return (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");
}

export function aiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (process.env.AI_SERVICE_KEY) headers["X-AI-Key"] = process.env.AI_SERVICE_KEY;
  return headers;
}

/**
 * Forward a call to the FastAPI ai-service.
 * - Network failure / timeout / unreachable → 502 { error: "AI service unavailable" }
 * - AI-side error → same status with { error } when the AI provided one.
 */
export async function callAi(path, body) {
  let res;
  try {
    res = await fetch(`${aiBase()}${path}`, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw httpError(502, "AI service unavailable");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data && typeof data.error === "string" ? data.error : "AI service request failed";
    throw httpError(res.status >= 500 ? 502 : res.status, message);
  }
  return data;
}
