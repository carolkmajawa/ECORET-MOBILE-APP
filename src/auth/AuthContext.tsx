// src/auth/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_approved?: boolean;
  phone_number?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<any>;
  setPendingApprovalUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking auth...');
      const token = await AsyncStorage.getItem('access_token');
      
      if (token) {
        console.log('🔍 Token found:', token.substring(0, 20) + '...');
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/profile/');
        console.log('✅ Auth check response:', response.data);
        setUser(response.data);
      } else {
        console.log('🔍 No token found');
      }
    } catch (error: any) {
      console.error('❌ Auth check failed:', error?.response?.data || error.message);
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
      console.log('🔍 Auth check complete, isLoading:', false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('📤 Login attempt:', { email });
      const response = await api.post('/auth/login/', { email, password });
      console.log('✅ Login response:', response.data);
      
      const { access, refresh, user } = response.data;
      
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      setUser(user);
      console.log('✅ User set:', user);
    } catch (error: any) {
      console.error('❌ Login error:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await Promise.race([
        api.post('/auth/logout/'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout request timed out')), 5000)),
      ]);
    } catch (error) {
      console.error('Logout error (continuing with local logout):', error);
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const register = async (data: any) => {
    try {
      console.log('📤 Register called with data:', { ...data, password: '***', confirm_password: '***' });
      
      const registerData = {
        email: data.email?.trim()?.toLowerCase() || '',
        password: data.password || '',
        confirm_password: data.confirm_password || data.password || '',
        first_name: data.first_name?.trim() || '',
        last_name: data.last_name?.trim() || '',
        phone_number: data.phone_number?.trim() || '',
        role: data.role || 'chairman',
      };
      
      console.log('📤 Sending registration data:', { ...registerData, password: '***', confirm_password: '***' });
      
      const response = await api.post('/auth/register/', registerData);
      console.log('✅ Registration response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Registration error:', error?.response?.data);
      console.error('❌ Error status:', error?.response?.status);
      
      const err: any = new Error('Registration failed');
      if (error.response) {
        err.response = error.response;
      }
      throw err;
    }
  };

  const setPendingApprovalUser = (data: any) => {
    const pendingUser = data?.user ?? data ?? {};

    setUser({
      id: String(pendingUser.id ?? `pending-${pendingUser.email ?? Date.now()}`),
      email: pendingUser.email ?? '',
      first_name: pendingUser.first_name ?? '',
      last_name: pendingUser.last_name ?? '',
      full_name: pendingUser.full_name ?? `${pendingUser.first_name ?? ''} ${pendingUser.last_name ?? ''}`.trim(),
      role: 'admin',
      is_active: pendingUser.is_active ?? false,
      is_approved: false,
      phone_number: pendingUser.phone_number,
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, setPendingApprovalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}