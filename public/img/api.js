import axios from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  team: () => api.get('/auth/team'),
  createInvite: () => api.post('/auth/invite'),
  acceptInvite: (data) => api.post('/auth/invite/accept', data),
};

export const clientsAPI = {
  list: (skip = 0, limit = 50, search = null) => {
    let url = `/clients?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return api.get(url);
  },
  filtered: (data) => api.post('/clients/filtered', data),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  balance: (phone) => api.get(`/clients/balance/${encodeURIComponent(phone)}`),
  tierStats: () => api.get('/clients/stats/tiers'),
  importFile: (file, updateExisting = false) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/clients/import?update_existing=${updateExisting}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importStatus: (taskId) => api.get(`/clients/import/status/${taskId}`),
};

export const transactionsAPI = {
  accrue: (data) => api.post('/transactions/accrue', data),
  deduct: (data) => api.post('/transactions/deduct', data),
  all: (skip = 0, limit = 50) => api.get(`/transactions/all?skip=${skip}&limit=${limit}`),
  history: (clientId, skip = 0, limit = 50) =>
    api.get(`/transactions/history/${clientId}?skip=${skip}&limit=${limit}`),
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  confirm: (orderId) => api.post('/orders/confirm', { order_id: orderId }),
  cancel: (orderId) => api.post('/orders/cancel', { order_id: orderId }),
  all: (skip = 0, limit = 50, search = null, filters = {}) => {
    let url = `/orders/all?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (filters.status) url += `&status=${filters.status}`;
    if (filters.place_ids) url += `&place_ids=${filters.place_ids}`;
    if (filters.date_from) url += `&date_from=${filters.date_from}`;
    if (filters.date_to) url += `&date_to=${filters.date_to}`;
    if (filters.min_total) url += `&min_total=${filters.min_total}`;
    if (filters.max_total) url += `&max_total=${filters.max_total}`;
    if (filters.client_type) url += `&client_type=${filters.client_type}`;
    if (filters.source) url += `&source=${filters.source}`;
    if (filters.rfm_segments) url += `&rfm_segments=${filters.rfm_segments}`;
    if (filters.sort_by) url += `&sort_by=${filters.sort_by}`;
    if (filters.sort_dir) url += `&sort_dir=${filters.sort_dir}`;
    return api.get(url);
  },
  get: (id) => api.get(`/orders/${id}`),
  byClient: (clientId) => api.get(`/orders/client/${clientId}`),
  importCSV: (formData, accrueBonuses = false, defaultStatus = 'confirmed') => api.post(`/orders/import?accrue_bonuses=${accrueBonuses}&default_status=${defaultStatus}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importStatus: (taskId) => api.get(`/orders/import/status/${taskId}`),
};

export default api;

// === Analytics ===
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  insights: () => api.get('/analytics/insights'),
  rfm: () => api.get('/analytics/rfm'),
  atRisk: (minBalance = 0, daysInactive = 30) =>
    api.get(`/analytics/at-risk?min_balance=${minBalance}&days_inactive=${daysInactive}`),
};

// === Communications ===
export const commsAPI = {
  generateText: (data) => api.post('/communications/generate-text', data),
  preview: (data) => api.post('/communications/preview', data),
  count: (segmentFilter, channel) => api.post(`/communications/count?channel=${channel}`, segmentFilter),
  createCampaign: (data) => api.post('/communications/campaigns', data),
  launchCampaign: (id) => api.post(`/communications/campaigns/${id}/launch`),
  cancelCampaign: (id) => api.post(`/communications/campaigns/${id}/cancel`),
  campaigns: (skip = 0, limit = 50) => api.get(`/communications/campaigns?skip=${skip}&limit=${limit}`),
  recommendations: () => api.get('/communications/recommendations'),
};

// === Loyalty ===
export const loyaltyAPI = {
  tiers: () => api.get('/loyalty/tiers'),
  createTier: (data) => api.post('/loyalty/tiers', data),
  updateTier: (id, data) => api.patch(`/loyalty/tiers/${id}`, data),
  deleteTier: (id) => api.delete(`/loyalty/tiers/${id}`),
  seedDefaults: () => api.post('/loyalty/tiers/seed'),
};

// === Integrations ===
export const integrationsAPI = {
  providers: () => api.get('/integrations/providers'),
  list: () => api.get('/integrations'),
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.patch(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
};

// === Promocodes ===
export const promocodesAPI = {
  list: (skip = 0, limit = 200, search, tab = 'active', dateFrom, dateTo, sortBy, sortDir) => {
    let url = `/promocodes?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (tab) url += `&tab=${tab}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    if (sortBy) url += `&sort_by=${sortBy}`;
    if (sortDir) url += `&sort_dir=${sortDir}`;
    return api.get(url);
  },
  create: (data) => api.post('/promocodes', data),
  update: (id, data) => api.patch(`/promocodes/${id}`, data),
  delete: (id) => api.delete(`/promocodes/${id}`),
  validate: (data) => api.post('/promocodes/validate', data),
  groups: () => api.get('/promocodes/groups'),
  createGroup: (data) => api.post('/promocodes/groups', data),
  updateGroup: (id, data) => api.put(`/promocodes/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/promocodes/groups/${id}`),
};

export const placesAPI = {
  list: () => api.get('/places'),
  create: (data) => api.post('/places', data),
  update: (id, data) => api.put(`/places/${id}`, data),
  delete: (id) => api.delete(`/places/${id}`),
};

export const emailTemplatesAPI = {
  list: () => api.get('/email-templates'),
  get: (id) => api.get(`/email-templates/${id}`),
  create: (data) => api.post('/email-templates', data),
  update: (id, data) => api.put(`/email-templates/${id}`, data),
  delete: (id) => api.delete(`/email-templates/${id}`),
};

export const savedSegmentsAPI = {
  list: () => api.get('/segments'),
  create: (data) => api.post('/segments', data),
  update: (id, data) => api.put(`/segments/${id}`, data),
  delete: (id) => api.delete(`/segments/${id}`),
};

export const chainsAPI = {
  list: () => api.get('/chains'),
  get: (id) => api.get(`/chains/${id}`),
  create: (data) => api.post('/chains', data),
  update: (id, data) => api.put(`/chains/${id}`, data),
  delete: (id) => api.delete(`/chains/${id}`),
  toggle: (id) => api.post(`/chains/${id}/toggle`),
  test: (id, phone) => api.post(`/chains/${id}/test`, { client_phone: phone }),
  tick: () => api.post('/chains/tick'),
  fireTrigger: (triggerType, phone) => api.post('/chains/fire-trigger', { trigger_type: triggerType, client_phone: phone }),
  recalcTiers: () => api.post('/chains/recalc-tiers'),
};

// === Pixel ===
export const pixelAPI = {
  events: (skip = 0, limit = 50, event_type = null, days = 30) => {
    let url = `/pixel/events?skip=${skip}&limit=${limit}&days=${days}`;
    if (event_type) url += `&event_type=${event_type}`;
    return api.get(url);
  },
  stats: (days = 30) => api.get(`/pixel/stats?days=${days}`),
  clientEvents: (clientId) => api.get(`/pixel/client/${clientId}`),
};

// === Account ===
export const accountAPI = {
  getPixelId: () => api.get('/auth/account'),
  update: (data) => api.patch('/auth/account', data),
};

// === Catalog ===
export const catalogAPI = {
  importYmlUrl: (url) => api.post(`/catalog/import/yml-url?url=${encodeURIComponent(url)}`),
  importYmlFile: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/catalog/import/yml-file', fd); },
  products: (skip = 0, limit = 50, category_id = null, search = null, available_only = false) => {
    let url = `/catalog/products?skip=${skip}&limit=${limit}&available_only=${available_only}`;
    if (category_id) url += `&category_id=${category_id}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return api.get(url);
  },
  categories: () => api.get('/catalog/categories'),
  stats: () => api.get('/catalog/stats'),
  deleteAll: () => api.delete('/catalog'),
};

// === Automations ===
export const automationsAPI = {
  triggers: () => api.get('/automations/triggers'),
  list: () => api.get('/automations'),
  create: (data) => api.post('/automations', data),
  update: (id, data) => api.patch(`/automations/${id}`, data),
  delete: (id) => api.delete(`/automations/${id}`),
  logs: (id, skip = 0, limit = 50) => api.get(`/automations/${id}/logs?skip=${skip}&limit=${limit}`),
  runNow: () => api.post('/automations/run-now'),
  clearLogs: (id) => api.delete(`/automations/${id}/logs`),
};

// === CRM ===
export const crmAPI = {
  types: () => api.get('/crm/types'),
  get: () => api.get('/crm/integration'),
  create: (data) => api.post('/crm/integration', data),
  update: (data) => api.patch('/crm/integration', data),
  delete: () => api.delete('/crm/integration'),
  stages: () => api.get('/crm/stages'),
  contactFields: () => api.get('/crm/contact-fields'),
  importClients: (limit = 0) => api.post('/crm/import/clients', { limit }),
  importOrders: (options = {}) => api.post('/crm/import/orders', { limit: 0, ...options }),
  taskStatus: (taskId) => api.get(`/crm/tasks/${taskId}`),
  cancelTask: (taskId) => api.post(`/crm/tasks/${taskId}/cancel`),
};