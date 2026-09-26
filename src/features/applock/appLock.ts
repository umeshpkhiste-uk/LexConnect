import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { LockMethod, MAX_ATTEMPTS } from "./rules";

/**
 * App lock with a PIN or pattern, per user, on this device only. Only a
 * salted SHA-256 hash is kept, in the device keychain (SecureStore) — the PIN
 * or pattern itself is never stored or sent anywhere.
 */

type Stored = { method: LockMethod; salt: string; hash: string; failures: number; length?: number };

const keyFor = (userId: string) => `applock.${userId}`;
/** Last account that set a lock on this phone (for the login-page hint). */
const LAST_USER_KEY = "applock.lastUser";

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hash(secret: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${secret}`);
}

async function read(userId: string): Promise<Stored | null> {
  if (Platform.OS === "web") return null;
  const raw = await SecureStore.getItemAsync(keyFor(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

async function write(userId: string, value: Stored) {
  await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(value));
}

export async function getAppLockMethod(userId: string): Promise<LockMethod | null> {
  return (await read(userId))?.method ?? null;
}

/** Method plus PIN length (so the keypad can submit on the last digit). */
export async function getAppLockInfo(userId: string): Promise<{ method: LockMethod; pinLength?: number } | null> {
  const stored = await read(userId);
  return stored ? { method: stored.method, pinLength: stored.length } : null;
}

/** Sets (or replaces) the lock. `secret` is the PIN or encoded pattern. */
export async function setAppLock(userId: string, method: LockMethod, secret: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  await write(userId, {
    method,
    salt,
    hash: await hash(secret, salt),
    failures: 0,
    length: method === "pin" ? secret.length : undefined,
  });
  await SecureStore.setItemAsync(LAST_USER_KEY, userId);
}

/** Notes that this account uses an app lock on this phone. */
export async function rememberLockedAccount(userId: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(LAST_USER_KEY, userId);
}

/** The lock method of the last account that set one on this phone. */
export async function getLastLockedAccountMethod(): Promise<LockMethod | null> {
  if (Platform.OS === "web") return null;
  const userId = await SecureStore.getItemAsync(LAST_USER_KEY);
  return userId ? getAppLockMethod(userId) : null;
}

export async function clearAppLock(userId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(keyFor(userId));
  if ((await SecureStore.getItemAsync(LAST_USER_KEY)) === userId) await SecureStore.deleteItemAsync(LAST_USER_KEY);
}

export type VerifyResult = { ok: true } | { ok: false; attemptsLeft: number };

/** Checks a PIN/pattern; wrong tries are counted across app restarts. */
export async function verifyAppLock(userId: string, secret: string): Promise<VerifyResult> {
  const stored = await read(userId);
  if (!stored) return { ok: true };
  if ((await hash(secret, stored.salt)) === stored.hash) {
    if (stored.failures) await write(userId, { ...stored, failures: 0 });
    return { ok: true };
  }
  const failures = stored.failures + 1;
  await write(userId, { ...stored, failures });
  return { ok: false, attemptsLeft: Math.max(MAX_ATTEMPTS - failures, 0) };
}

/** Clears the failure count after another successful unlock (e.g. Face ID). */
export async function resetAppLockFailures(userId: string): Promise<void> {
  const stored = await read(userId);
  if (stored?.failures) await write(userId, { ...stored, failures: 0 });
}
