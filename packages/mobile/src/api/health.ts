import client from './client';

export const checkBackendHealth = async () => {
  try {
    const response = await client.get('/health');
    return { ok: true, data: response.data };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || 'Unknown error',
      url: client.defaults.baseURL,
    };
  };
};
