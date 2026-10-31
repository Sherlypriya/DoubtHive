import axiosClient from './axiosClient';

export const getUserProfile = (id) => axiosClient.get(`/users/${id}`);

// filters: { department, limit }
export const getLeaderboard = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  return axiosClient.get('/users/leaderboard', { params });
};
