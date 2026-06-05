import crypto from "crypto";

/**
 * Django PBKDF2 şifre hash doğrulaması.
 * Format: pbkdf2_sha256$iterations$salt$hash
 */
export function verifyDjangoPassword(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;

  const [algorithm, iterationsStr, salt, storedHash] = parts;
  if (algorithm !== "pbkdf2_sha256") return false;

  const iterations = parseInt(iterationsStr, 10);
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    32, // 256 bits
    "sha256"
  );

  const computedHash = derivedKey.toString("base64");
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(storedHash)
  );
}

/**
 * Yeni şifre hash oluşturma (Django uyumlu PBKDF2).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64").slice(0, 22);
  const iterations = 260000;
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const hash = derivedKey.toString("base64");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}
