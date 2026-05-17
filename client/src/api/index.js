// api/index.js — Centralised API layer
// All HTTP calls to our Express server go through here
// Why centralise? If the API URL ever changes, we change it in ONE place

import axios from 'axios';

// axios.create() makes a pre-configured axios instance
// baseURL: '/api' means all requests will be /api/customers, /api/campaigns etc.
const api = axios.create({
  baseURL: '/api',
});

// --- Customer API ---
export const getCustomers = (params) => api.get('/customers', { params });
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const importCustomers = (customers) => api.post('/customers/import', { customers });

// --- Campaign API ---
export const getCampaigns = () => api.get('/campaigns');
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post('/campaigns', data);
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);

// --- Jobs API ---
export const getJobs = (params) => api.get('/jobs', { params });
export const createJob = (data) => api.post('/jobs', data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);
export const getJobStats = () => api.get('/jobs/stats/summary');
export const getUpcomingStats = () => api.get('/jobs/stats/upcoming');
export const sendInvoice = (jobId) => api.post(`/jobs/${jobId}/invoice`);

// --- Scheduled Emails API ---
export const getScheduledEmails = () => api.get('/scheduled-emails');
export const createScheduledEmail = (data) => api.post('/scheduled-emails', data);
export const updateScheduledEmail = (id, data) => api.put(`/scheduled-emails/${id}`, data);
export const deleteScheduledEmail = (id) => api.delete(`/scheduled-emails/${id}`);

// --- Email API ---
export const sendCampaign = (campaignId) => api.post(`/emails/send/${campaignId}`);
export const sendTestEmail = (campaignId, to) => api.post(`/emails/test/${campaignId}`, { to });
export const getCampaignLogs = (campaignId) => api.get(`/emails/logs/${campaignId}`);
export const previewCampaign = (campaignId) => api.get(`/emails/preview/${campaignId}`);
