import { createHmac } from 'node:crypto';

// Sign exact JSON to exercise legacy and malformed claims that signSession never issues.
export function signRawSession(json) {
  const body = Buffer.from(json).toString('base64url');
  const signature = createHmac('sha256', process.env.FINKAS_SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}
