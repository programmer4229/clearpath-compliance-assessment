// Password hashing for the `users` table.
//
// Deliberately uses Node's built-in crypto.scrypt rather than bcrypt/argon2
// — those ship as native (prebuilt-binary) modules, and this sandbox's
// npm install has previously failed to fetch native binaries (see the
// Prisma engine download failure earlier in this project's history).
// scrypt is a well-regarded KDF and is part of Node core, so there's
// nothing to download and nothing that can fail to build.
import "server-only";
import crypto from "node:crypto";

const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Stored as "<salt-hex>:<hash-hex>" in users.password_hash — a random salt
// per password, no external format/library needed to parse it back.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const storedBuf = Buffer.from(hashHex, "hex");
  const derivedKey = await scryptAsync(password, salt);
  // Buffers must be equal length for timingSafeEqual, and a corrupt/foreign
  // hash format shouldn't throw — just fail the check.
  if (storedBuf.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuf, derivedKey);
}
