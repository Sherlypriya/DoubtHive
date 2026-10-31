import axiosClient from './axiosClient';

export const getQuestions = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  return axiosClient.get('/questions', { params });
};

export const getQuestionById = (id) => axiosClient.get(`/questions/${id}`);

export const getQuestionStats = () => axiosClient.get('/questions/stats');

export const createQuestion = (data) => axiosClient.post('/questions', data);

export const updateQuestion = (id, data) => axiosClient.patch(`/questions/${id}`, data);

export const deleteQuestion = (id) => axiosClient.delete(`/questions/${id}`);

export const getSimilarQuestions = (title) =>
  axiosClient.get('/questions/similar', { params: { title } });

export const toggleBookmark = (id) => axiosClient.post(`/questions/${id}/bookmark`);

export const getSavedQuestions = () => axiosClient.get('/questions/saved');

export const recordView = (id) => axiosClient.post(`/questions/${id}/view`);

