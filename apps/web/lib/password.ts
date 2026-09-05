import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { createRequire } from "module";

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const PREFIX = "pbkdf2";
const require = createRequire(import.meta.url);

let bcryptModule: { compareSync: (password: string, hash: string) => boolean } | null | undefined;

function verifyLegacyBcrypt(password: string, storedHash: string) {
  if (!storedHash.startsWith("$2")) return false;

  try {
    bcryptModule ??= require("bcrypt") as typeof bcryptModule;
    return Boolean(bcryptModule?.compareSync(password, storedHash));
  } catch {
    return false;
  }
}

export function hashPassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");

  return `${PREFIX}:${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [prefix, iterations, salt, hash] = storedHash.split(":");
  if (prefix !== PREFIX || !iterations || !salt || !hash) {
    return verifyLegacyBcrypt(password, storedHash);
  }

  const expected = Buffer.from(hash, "hex");
  const actual = pbkdf2Sync(password, salt, Number(iterations), expected.length, DIGEST);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
