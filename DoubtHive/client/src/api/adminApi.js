import axiosClient from './axiosClient';

// ── Stats and user list ──────────────────────────────────────────────────────
export const getAdminStats = () => axiosClient.get('/admin/stats');
export const getAdminUsers = (params = {}) => axiosClient.get('/admin/users', { params });
export const updateUserRole = (id, role) => axiosClient.patch(`/admin/users/${id}/role`, { role });

// ── Content moderation ───────────────────────────────────────────────────────
export const getAdminQuestions = (params = {}) =>
  axiosClient.get('/admin/questions', { params });
export const adminDeleteQuestion = (id) => axiosClient.delete(`/admin/questions/${id}`);
export const adminDeleteAnswer = (id) => axiosClient.delete(`/admin/answers/${id}`);
