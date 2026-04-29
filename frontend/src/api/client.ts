import axios from 'axios';

let authToken: string | null = null;

export const configureClientAuth = (token: string | null) => {
  authToken = token;
};

export const apiClient = axios.create({
  baseURL: 'https://kundiva-backend.onrender.com/api'
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
