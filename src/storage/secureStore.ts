import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'ecoret_access_token'
const REFRESH_KEY = 'ecoret_refresh_token'

// expo-secure-store wraps iOS Keychain / Android Keystore -- this is
// the right place for JWTs on-device, unlike localStorage on web.
export const tokenStore = {
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY)
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY)
  },
  async set(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access)
    await SecureStore.setItemAsync(REFRESH_KEY, refresh)
  },
  async setAccess(access: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access)
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
  },
}
