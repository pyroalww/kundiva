import type { LoginPayload } from '@kundiva/shared';

import { apiClient } from './client';
import type { AuthUser } from '../types';

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
};

export const completeProfile = async (payload: {
  firstName: string;
  lastName: string;
  email?: string;
  studentNumber?: string;
  subjects?: string[];
  educationLevels?: string[];
}): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/complete-profile', payload);
  return data;
};
