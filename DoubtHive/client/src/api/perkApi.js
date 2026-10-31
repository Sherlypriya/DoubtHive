import axiosClient from './axiosClient';

// ── Public perk browsing ────────────────────────────────────────────────────
export const getPerks = () => axiosClient.get('/perks');
export const getPerkById = (id) => axiosClient.get(`/perks/${id}`);

// ── Authenticated ────────────────────────────────────────────────────────────
export const redeemPerk = (id) => axiosClient.post(`/perks/${id}/redeem`);
export const getMyRedemptions = () => axiosClient.get('/perks/my-redemptions');

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminGetAllPerks = () => axiosClient.get('/perks/admin/all');
export const adminCreatePerk = (data) => axiosClient.post('/perks/admin', data);
export const adminUpdatePerk = (id, data) => axiosClient.patch(`/perks/admin/${id}`, data);
export const adminDeletePerk = (id) => axiosClient.delete(`/perks/admin/${id}`);
export const adminGetRedemptions = (params = {}) =>
  axiosClient.get('/perks/admin/redemptions', { params });
export const adminUpdateRedemption = (id, status) =>
  axiosClient.patch(`/perks/admin/redemptions/${id}`, { status });
