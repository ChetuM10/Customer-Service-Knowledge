import axios from 'axios';

// Single Axios instance pointing to our Express backend
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 1. Customer Management (/api/customers)
export const customerAPI = {
    getAll: () => api.get('/customers'),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
};

// 2. Support Request Management + ML (/api/support-requests)
export const ticketAPI = {
    getAll: () => api.get('/support-requests'),
    getById: (ticketId) => api.get(`/support-requests/${ticketId}`),
    create: (data) => api.post('/support-requests', data),
    update: (ticketId, data) => api.put(`/support-requests/${ticketId}`, data),
    delete: (ticketId) => api.delete(`/support-requests/${ticketId}`),
    generateResolution: (ticketId) => api.post(`/support-requests/${ticketId}/generate-resolution`),
};

// 3. Knowledge Category Management (/api/knowledge-categories)
export const categoryAPI = {
    getAll: () => api.get('/knowledge-categories'),
    getById: (categoryId) => api.get(`/knowledge-categories/${categoryId}`),
    create: (data) => api.post('/knowledge-categories', data),
    update: (categoryId, data) => api.put(`/knowledge-categories/${categoryId}`, data),
    deactivate: (categoryId) => api.delete(`/knowledge-categories/${categoryId}`),
};

// 4. Knowledge Articles & Versions (/api/knowledge-articles)
export const articleAPI = {
    getAll: () => api.get('/knowledge-articles'),
    getById: (articleId) => api.get(`/knowledge-articles/${articleId}`),
    create: (data) => api.post('/knowledge-articles', data),
    update: (articleId, data) => api.patch(`/knowledge-articles/${articleId}`, data),
    approve: (articleId, updatedBy) => api.patch(`/knowledge-articles/${articleId}/approve`, { updatedBy }),
    publish: (articleId, updatedBy) => api.patch(`/knowledge-articles/${articleId}/publish`, { updatedBy }),
    retire: (articleId, updatedBy) => api.patch(`/knowledge-articles/${articleId}/retire`, { updatedBy }),
    getVersions: (articleId) => api.get(`/knowledge-articles/${articleId}/versions`),
    getVersion: (articleId, versionNumber) =>
        api.get(`/knowledge-articles/${articleId}/versions/${versionNumber}`),
};

// 5. Resolution Management (/api/resolutions)
export const resolutionAPI = {
    create: (ticketId, data) => api.post(`/resolutions/${ticketId}`, data),
    getAll: () => api.get('/resolutions'),
    getByTicket: (ticketId) => api.get(`/resolutions/ticket/${ticketId}`),
    update: (resolutionId, data) => api.put(`/resolutions/${resolutionId}`, data),
};

// 6. Article Feedback Management (/api/article-feedback)
export const feedbackAPI = {
    create: (data) => api.post('/article-feedback', data),
    getAll: () => api.get('/article-feedback'),
    getByArticle: (articleId) => api.get(`/article-feedback/article/${articleId}`),
    getByTicket: (ticketId) => api.get(`/article-feedback/ticket/${ticketId}`),
    delete: (feedbackId) => api.delete(`/article-feedback/${feedbackId}`),
};

// 7. Knowledge Gap Management (/api/knowledge-gaps)
export const gapAPI = {
    create: (data) => api.post('/knowledge-gaps', data),
    getAll: () => api.get('/knowledge-gaps'),
    getById: (gapId) => api.get(`/knowledge-gaps/${gapId}`),
    update: (gapId, data) => api.put(`/knowledge-gaps/${gapId}`, data),
    delete: (gapId) => api.delete(`/knowledge-gaps/${gapId}`),
};

// 8. Knowledge Analytics (/api/analytics)
export const analyticsAPI = {
    getDashboard: () => api.get('/analytics/dashboard'),
};

// 9. Audit History (/api/audit-logs)
export const auditAPI = {
    getAll: () => api.get('/audit-logs'),
    getByTicket: (ticketId) => api.get(`/audit-logs/ticket/${ticketId}`),
    getByEntity: (entityType) => api.get(`/audit-logs/entity/${entityType}`),
    getById: (auditId) => api.get(`/audit-logs/${auditId}`),
};

export default api;