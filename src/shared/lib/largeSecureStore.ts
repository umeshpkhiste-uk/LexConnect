import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store enforces a ~2048 byte value limit on Android, but Supabase
 * session payloads (access + refresh token + user metadata) routinely exceed that.
 * This is Supabase's documented pattern for Expo: the actual session blob lives in
 * AsyncStorage encrypted with AES-256-CTR, and only the small encryption key lives
 * in the OS keychain/keystore via SecureStore.
 */
export class LargeSecureStore {
  private async getEncryptionKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) {
      return aesjs.utils.hex.toBytes(existing);
    }
    const newKey = crypto.getRandomValues(new Uint8Array(32));
    await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(newKey));
    return newKey;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const encryptionKey = await this.getEncryptionKey(`${key}-key`);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encrypted));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this.getEncryptionKey(`${key}-key`);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}-key`);
  }
}
