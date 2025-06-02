import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('DiarrheaTokenBearerInLocalStorageForSecureRequestsContactAdminHeKnowsHotToUseWeHaveManyTokensHereSoThisOneShouldBeUnique');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!config.url.includes('?') && !config.url.endsWith('/')) {
      config.url = `${config.url}/`;
    }
    console.log('Making request to:', config.url);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    console.log('Response from:', response.config.url, response.status);
    return response;
  },
  error => {
    console.error('Response error:', error);
    
    if (error.response) {
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
    } else if (error.request) {
      console.error('No response received');
    }
    
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('DiarrheaTokenBearerInLocalStorageForSecureRequestsContactAdminHeKnowsHotToUseWeHaveManyTokensHereSoThisOneShouldBeUnique');
      localStorage.removeItem('user');
    }
    
    return Promise.reject(error);
  }
);

export default api;