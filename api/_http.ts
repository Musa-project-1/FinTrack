import type { ApiRequest, ApiResponse } from '../src/types/finkas.d.ts';

export type JsonBody = Record<string, any>;

export function parseBody(req: ApiRequest): JsonBody {
  if (req.body && typeof req.body === 'object') return req.body as JsonBody;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function sendJson(res: ApiResponse, status: number, payload: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  if ('status' in res) return res.status(status).json(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
