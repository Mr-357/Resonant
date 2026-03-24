import axios from 'axios'

// Create axios instance with base URL
// In development: uses Vite proxy to http://localhost:8080
// In production: uses same domain as frontend
const apiClient = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? '/' : '/',
  timeout: 10000,
})

// Add request interceptor to include JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and user data on unauthorized
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  register: (username, email, password) =>
    apiClient.post('/api/auth/register', { username, email, password }),
  login: (username, password) =>
    apiClient.post('/api/auth/login', { username, password }),
}

// Server endpoints
export const serverAPI = {
  list: () => apiClient.get('/api/servers'),
  listAll: () => apiClient.get('/api/servers/all'),
  create: (name, description = '') =>
    apiClient.post('/api/servers', { name, description }),
  get: (serverId) => apiClient.get(`/api/servers/${serverId}`),
  update: (serverId, name, description) =>
    apiClient.put(`/api/servers/${serverId}`, { name, description }),
  delete: (serverId) => apiClient.delete(`/api/servers/${serverId}`),
  join: (serverId) => apiClient.post(`/api/servers/${serverId}/join`),
  leave: (serverId) => apiClient.post(`/api/servers/${serverId}/leave`),
  addMember: (serverId, userId) =>
    apiClient.post(`/api/servers/${serverId}/members`, { userId }),
  removeMember: (serverId, userId) =>
    apiClient.delete(`/api/servers/${serverId}/members/${userId}`),
  getMembers: (serverId) => apiClient.get(`/api/servers/${serverId}/members`),
}

// Channel endpoints
export const channelAPI = {
  list: (serverId) =>
    apiClient.get(`/api/servers/${serverId}/channels`),
  create: (serverId, name, description = '') =>
    apiClient.post(`/api/servers/${serverId}/channels`, { name, description }),
  get: (serverId, channelId) =>
    apiClient.get(`/api/servers/${serverId}/channels/${channelId}`),
  update: (serverId, channelId, name, description) =>
    apiClient.put(`/api/servers/${serverId}/channels/${channelId}`, {
      name,
      description,
    }),
  delete: (serverId, channelId) =>
    apiClient.delete(`/api/servers/${serverId}/channels/${channelId}`),
}

// Message endpoints
export const messageAPI = {
  list: (channelId, params = {}) =>
    apiClient.get(`/api/channels/${channelId}/messages`, { params }),
  create: (channelId, content) =>
    apiClient.post(`/api/channels/${channelId}/messages`, { content }),
  update: (channelId, messageId, content) =>
    apiClient.patch(`/api/channels/${channelId}/messages/${messageId}`, { content }),
  delete: (channelId, messageId) =>
    apiClient.delete(`/api/channels/${channelId}/messages/${messageId}`),
}

export default apiClient
