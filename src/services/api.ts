// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// export const { API_BASE_URL} = 'http://192.168.1.103:8000/api' } = {};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  confirm_password: string;
  role?: string;
}

export async function loginRequest(payload: LoginPayload) {
  const { data } = await api.post('/auth/login/', payload);
  return data; // { refresh, access, user }
}

export async function registerRequest(payload: RegisterPayload) {
  const { data } = await api.post('/auth/register/', payload);
  return data; // { message, user }
}

// Avoid multiSet — some AsyncStorage type setups don't expose it cleanly.
export async function saveAuthSession(access: string, refresh: string, user: any) {
  await AsyncStorage.setItem('access_token', access);
  await AsyncStorage.setItem('refresh_token', refresh);
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

export async function getStoredSession() {
  const [accessToken, userJson] = await Promise.all([
    AsyncStorage.getItem('access_token'),
    AsyncStorage.getItem('user'),
  ]);
  return {
    accessToken,
    user: userJson ? JSON.parse(userJson) : null,
  };
}

export async function clearAuthSession() {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  await AsyncStorage.removeItem('user');
}

export default api;