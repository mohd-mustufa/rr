import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';

// Initialize with a default value, will be updated once we fetch the config
let API_URL = '';
let api = null;

// Fetch server configuration and initialize the API
const initAPI = async () => {
  try {
    // Use the current origin to get the config (for local development, we might need to adjust this)
    const configResponse = await axios.get('/api/config');
    const { serverIP, apiPort } = configResponse.data;
    
    // Use current origin for API URL to avoid CORS issues
    const currentOrigin = window.location.origin;
    API_URL = `${currentOrigin}/api`;
    
    // Create axios instance with auth token
    api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // Add timeout to avoid long waits on network issues
    });

    // Add auth token to requests if available
    api.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return true;
  } catch (error) {
    console.error('Failed to fetch server configuration, using default', error);
    
    // Fallback to using the current origin
    const currentOrigin = window.location.origin;
    API_URL = `${currentOrigin}/api`;
    
    // Create axios instance with auth token
    api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout
    });
    
    return false;
  }
};

// Helper function to ensure API is initialized before making requests
const ensureAPI = async () => {
  if (!api) {
    await initAPI();
  }
  return api;
};

// Helper function to add auth token to requests
const addAuthToken = (config = {}) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Auth endpoints
export const login = async (email, password) => {
  const apiInstance = await ensureAPI();
  return apiInstance.post('/auth/login', { email, password });
};

export const register = async (username, email, password) => {
  const apiInstance = await ensureAPI();
  return apiInstance.post('/auth/register', { username, email, password });
};

export const getProfile = async () => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.get('/auth/me', config);
};

// Title endpoints
export const createTitle = async (title, instructions) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.post('/titles', { title, instructions }, config);
};

export const getTitles = async () => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.get('/titles', config);
};

export const getTitle = async (id) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.get(`/titles/${id}`, config);
};

export const updateTitle = async (id, title, instructions) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.put(`/titles/${id}`, { title, instructions }, config);
};

export const deleteTitle = async (id) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.delete(`/titles/${id}`, config);
};

// Reference endpoints
export const uploadReference = async (titleId, imageData, isGlobal = false) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.post('/references', { titleId, imageData, isGlobal }, config);
};

export const getReferences = async (titleId) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.get(`/references/${titleId}`, config);
};

export const getGlobalReferences = async () => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.get('/references/global', config);
};

export const deleteReference = async (id) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({});
  return apiInstance.delete(`/references/${id}`, config);
};

// Painting endpoints (renamed from Thumbnail)
export const generateThumbnails = async (titleId, quantity = 5) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({
    timeout: 300000 // 5 minutes for generation
  });
  return apiInstance.post('/paintings/generate', { titleId, quantity }, config);
};

export const getThumbnails = async (titleId) => {
  const apiInstance = await ensureAPI();
  const config = addAuthToken({
    timeout: 300000 // 5 minutes for polling requests
  });
  return apiInstance.get(`/paintings/${titleId}`, config);
};

// Initialize API when this module is imported
initAPI();

export default async () => ensureAPI(); 