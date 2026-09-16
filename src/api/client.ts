// import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
// import { BASE_URL, ENDPOINTS } from './endpoints'
// import { tokenStore } from '../storage/secureStore'

// export const api = axios.create({ baseURL: BASE_URL })

// api.interceptors.request.use(async (config) => {
//   const token = await tokenStore.getAccess()
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// let refreshPromise: Promise<string> | null = null

// async function refreshAccessToken(): Promise<string> {
//   const refresh = await tokenStore.getRefresh()
//   if (!refresh) throw new Error('No refresh token available')

//   const { data } = await axios.post(`${BASE_URL}${ENDPOINTS.auth.tokenRefresh}`, { refresh })
//   await tokenStore.setAccess(data.access)
//   return data.access
// }

// api.interceptors.response.use(
//   (response) => response,
//   async (error: AxiosError) => {
//     const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }

//     // No response at all (not a 401) usually means the device is
//     // offline -- let the offline queue in ../offline/syncEngine.ts
//     // handle that case rather than treating it as an auth failure.
//     if (!error.response) {
//       return Promise.reject(error)
//     }

//     if (error.response.status === 401 && !original._retried) {
//       original._retried = true
//       try {
//         if (!refreshPromise) {
//           refreshPromise = refreshAccessToken().finally(() => {
//             refreshPromise = null
//           })
//         }
//         const newAccess = await refreshPromise
//         original.headers.Authorization = `Bearer ${newAccess}`
//         return api(original)
//       } catch (refreshError) {
//         await tokenStore.clear()
//         return Promise.reject(refreshError)
//       }
//     }

//     return Promise.reject(error)
//   }
// )

// src/api/client.ts
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor - add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token')
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })
        await AsyncStorage.setItem('access_token', response.data.access)
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        await AsyncStorage.removeItem('access_token')
        await AsyncStorage.removeItem('refresh_token')
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api