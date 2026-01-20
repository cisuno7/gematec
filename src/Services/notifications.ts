import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import apiClient from "../Context/ApiClient";

const FCM_TOKEN_KEY = "fcm_token";

export type DeviceRegistrationPayload = {
  token: string;
  platform: "android" | "ios";
};

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    console.warn("[notifications] Falha ao solicitar permissão:", error);
    return false;
  }
}

export async function getStoredFcmToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  } catch (error) {
    console.warn("[notifications] Falha ao ler FCM token:", error);
    return null;
  }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    if (token) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    }
    return token || null;
  } catch (error) {
    console.warn("[notifications] Falha ao obter FCM token:", error);
    return null;
  }
}

export async function ensureFcmToken(): Promise<string | null> {
  const stored = await getStoredFcmToken();
  if (stored) return stored;

  const granted = await requestNotificationPermission();
  if (!granted && Platform.OS === "ios") return null;

  return await getFcmToken();
}

export async function registerDevice(fcmToken: string) {
  const payload: DeviceRegistrationPayload = {
    token: fcmToken,
    platform: Platform.OS === "ios" ? "ios" : "android",
  };
  return apiClient.post("/me/devices", payload);
}

export async function fetchDevices() {
  return apiClient.get("/me/devices");
}
