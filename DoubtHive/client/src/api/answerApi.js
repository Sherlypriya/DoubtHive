import axiosClient from './axiosClient';

export const getAnswersForQuestion = (questionId) =>
  axiosClient.get(`/answers/question/${questionId}`);

// media = { files: File[], links: string[], removeIds?: string[] }
// With no media this is a plain JSON request (exactly as before); with media
// it becomes multipart/form-data. `onProgress(0-100)` reports upload progress,
// which matters for large lecture videos.
const send = (method, url, fields, media = {}, onProgress) => {
  const { files = [], links = [], removeIds = [] } = media;
  if (!files.length && !links.length && !removeIds.length) {
    return axiosClient[method](url, fields);
  }

  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  links.forEach((l) => form.append('videoLinks', l));
  removeIds.forEach((id) => form.append('removeAttachmentIds', id));
  files.forEach((f) => form.append('files', f));

  return axiosClient[method](url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => e.total && onProgress(Math.round((e.loaded / e.total) * 100))
      : undefined,
  });
};

export const createAnswer = (questionId, content, media, onProgress) =>
  send('post', '/answers', { questionId, content }, media, onProgress);

export const updateAnswer = (answerId, content, media, onProgress) =>
  send('patch', `/answers/${answerId}`, { content }, media, onProgress);

export const acceptAnswer = (answerId) => axiosClient.patch(`/answers/${answerId}/accept`);

export const deleteAnswer = (answerId) => axiosClient.delete(`/answers/${answerId}`);

// value: 1 to upvote, -1 to downvote. Voting the same way again removes the vote.
export const voteAnswer = (answerId, value) =>
  axiosClient.post(`/answers/${answerId}/vote`, { value });
