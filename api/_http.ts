import type { ApiRequest, ApiResponse } from '../src/types/finkas.d.ts';

export type JsonBody = Record<string, any>;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_BODY_DEPTH = 32;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sanitizeJsonValue(value: unknown, depth: number = 0): unknown {
  if (depth > MAX_BODY_DEPTH) {
    throw new Error('Payload JSON terlalu dalam.');
  }
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, depth + 1));
  }
  if (!isPlainObject(value)) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = sanitizeJsonValue(val, depth + 1);
  }
  return clean;
}

function readHeader(headers: ApiRequest['headers'] | undefined, name: string): string {
  if (!headers || typeof headers !== 'object') return '';
  let raw = headers[name];
  if (raw === undefined) {
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) {
        raw = v;
        break;
      }
    }
  }
  if (Array.isArray(raw)) raw = raw[0];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function parseBody(req: ApiRequest): JsonBody {
  let raw: unknown = req?.body;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!isPlainObject(raw)) return {};
  try {
    return sanitizeJsonValue(raw, 0) as JsonBody;
  } catch {
    return {};
  }
}

/**
 * Reject cross-origin browser requests and non-JSON simple form submissions.
 * Requests without browser Origin/Sec-Fetch-Site/Content-Type headers (such as
 * server-to-server callers and unit tests) are permitted.
 */
export function enforceSameOrigin(req: ApiRequest, res: ApiResponse): boolean {
  const headers = req?.headers;
  const contentType = readHeader(headers, 'content-type');
  if (contentType) {
    const mediaType = contentType.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
      sendJson(res, 415, { status: false, message: 'Content-Type harus application/json.' });
      return false;
    }
  }

  const fetchSite = readHeader(headers, 'sec-fetch-site').toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    sendJson(res, 403, { status: false, message: 'Permintaan lintas origin ditolak.' });
    return false;
  }

  const origin = readHeader(headers, 'origin');
  if (origin) {
    if (origin === 'null') {
      sendJson(res, 403, { status: false, message: 'Permintaan lintas origin ditolak.' });
      return false;
    }
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      sendJson(res, 403, { status: false, message: 'Permintaan lintas origin ditolak.' });
      return false;
    }
    const forwardedHost = readHeader(headers, 'x-forwarded-host').split(',')[0].trim();
    const host = (forwardedHost || readHeader(headers, 'host')).toLowerCase();
    if (!host || originUrl.host.toLowerCase() !== host) {
      sendJson(res, 403, { status: false, message: 'Permintaan lintas origin ditolak.' });
      return false;
    }
    const forwardedProto = readHeader(headers, 'x-forwarded-proto').split(',')[0].trim().toLowerCase();
    if ((forwardedProto === 'https' || forwardedProto === 'http') && originUrl.protocol !== `${forwardedProto}:`) {
      sendJson(res, 403, { status: false, message: 'Permintaan lintas origin ditolak.' });
      return false;
    }
  }

  return true;
}

export function sendJson(res: ApiResponse, status: number, payload: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  if ('status' in res) return res.status(status).json(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
