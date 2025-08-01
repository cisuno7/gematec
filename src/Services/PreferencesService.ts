import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDynamicApiUrl } from "../config/apiConfig";

export interface UserPreferences {
    language: string;
}

export default class PreferencesService {
    static async getPreferences(accessToken: string): Promise<UserPreferences> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const response = await apiClient.get(`${dynamicBaseUrl}/me/preferences`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }

    static async updatePreferences(accessToken: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const accountName = await AsyncStorage.getItem("account") || "default";
        const dynamicBaseUrl = await setDynamicApiUrl(accountName);
        const response = await apiClient.patch(`${dynamicBaseUrl}/me/preferences`, preferences, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }
}