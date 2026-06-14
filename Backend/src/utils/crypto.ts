import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw || raw === 'replace-with-a-long-random-encryption-key') {
    throw new Error('ENCRYPTION_KEY is required before storing integration tokens');
  }

  return crypto.createHash('sha256').update(raw).digest();
};

export const encryptSecret = (plainText: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
};

export const decryptSecret = (encryptedValue: string | null | undefined) => {
  if (!encryptedValue) return null;

  const [version, ivValue, tagValue, encryptedText] = encryptedValue.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedText) {
    throw new Error('Unsupported encrypted secret format');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};
