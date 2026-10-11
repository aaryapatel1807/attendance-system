/** 404 for unknown routes — keeps the { error } shape consistent. */
export function notFound(_req, res) {
  res.status(404).json({ error: "Not found" });
}

/**
 * Central error handler. Never leaks stack traces to the client:
 * known client errors carry `status`, everything else becomes a generic 500
 * (details go to the server log only).
 */
export function errorHandler(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Validation failed" });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate value for a unique field" });
  }
  if (err.status && err.message) {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: "Internal server error" });
}

/** Throw a client error: `throw httpError(400, "message")`. */
export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
