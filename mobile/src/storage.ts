import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Token storage: Keychain / Keystore on device, localStorage (via AsyncStorage) on web. */
const KEY = "ft.token";

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return await AsyncStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") return AsyncStorage.setItem(KEY, token);
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === "web") return await AsyncStorage.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // nothing stored
  }
}
