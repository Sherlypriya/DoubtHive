import axiosClient from './axiosClient';

export const getNotifications = () => axiosClient.get('/notifications');
export const markNotificationRead = (id) => axiosClient.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => axiosClient.patch('/notifications/read-all');
