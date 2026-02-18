import axios, { AxiosInstance } from 'axios';

let client: AxiosInstance;

export function createApiClient(baseURL: string): AxiosInstance {
  client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
  return client;
}

export function setAuthToken(token: string | null) {
  if (!client) throw new Error('API client not initialized. Call createApiClient first.');
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export function getClient(): AxiosInstance {
  if (!client) throw new Error('API client not initialized. Call createApiClient first.');
  return client;
}
