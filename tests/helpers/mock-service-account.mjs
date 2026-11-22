import { generateKeyPairSync } from 'node:crypto';

export function mockServiceAccount() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
    client_email: 'fixture@example.invalid',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' })
  });
  return () => Response.json({ access_token: 'fixture-token', expires_in: 3600 });
}
