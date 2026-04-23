import axios, { AxiosInstance } from 'axios';
import { useCallback } from 'react';

let apiInstance: AxiosInstance | undefined;

const getApiInstance = (): AxiosInstance => {
  if (!apiInstance) {
    apiInstance = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    apiInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          console.warn('Unauthorized access');
        }
        return Promise.reject(error);
      },
    );
  }
  return apiInstance;
};

export const useApi = (): AxiosInstance => {
  return useCallback(() => getApiInstance(), [])();
};
