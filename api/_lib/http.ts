import type { VercelRequest, VercelResponse } from "@vercel/node";

export const allowMethod = (
  request: VercelRequest,
  response: VercelResponse,
  method: "POST",
): boolean => {
  if (request.method === method) return true;

  response.setHeader("Allow", method);
  response.status(405).json({ ok: false, error: "MethodNotAllowed" });
  return false;
};

export const readJsonBody = <TBody>(request: VercelRequest): TBody | null => {
  if (!request.body) return null;
  if (typeof request.body === "object") return request.body as TBody;

  try {
    return JSON.parse(String(request.body)) as TBody;
  } catch {
    return null;
  }
};

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
