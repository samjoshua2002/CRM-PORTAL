import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Generic request function
const request = async (method, url, data = null, params = {}) => {
  try {
    const response = await api({ method, url, data, params });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error(`API Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};

// API functions for leads
export const createLead = (leadData) => request('post', '/leads', leadData);
export const getLeads = (params) => request('get', '/leads', null, params);
export const getLeadById = (id) => request('get', `/leads/${id}`);
export const updateLead = (id, updateData) => request('put', `/leads/${id}`, updateData);

// API functions for journeys
export const startJourney = (data) => request('post', '/touchpoints/start', data);

// API functions for useSWR hooks
export const fetcher = (url) => api.get(url).then(res => res.data.data);

export default api;
