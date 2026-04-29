import axios from 'axios';

let authToken: string | null = null;

export const configureClientAuth = (token: string | null) => {
  authToken = token;
};

export const apiClient = axios.create({
  baseURL: '/api'
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
