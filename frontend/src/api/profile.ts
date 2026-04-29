import { apiClient } from './client';

export type UserProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  bio: string | null;
  totalPoints: number;
  createdAt: string;
  isFollowing: boolean;
  correctSolutions: number;
  _count: {
    questions: number;
    solutions: number;
    answers: number;
    posts: number;
    followers: number;
    following: number;
  };
};

export type UserPost = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
};

export const fetchProfile = async (username: string) => {
  const { data } = await apiClient.get<UserProfile>(`/profiles/${username}`);
  return data;
};

export const fetchProfileQuestions = async (username: string) => {
  const { data } = await apiClient.get(`/profiles/${username}/questions`);
  return data;
};

export const fetchProfileSolutions = async (username: string) => {
  const { data } = await apiClient.get(`/profiles/${username}/solutions`);
  return data;
};

export const fetchProfilePosts = async (username: string) => {
  const { data } = await apiClient.get<UserPost[]>(`/profiles/${username}/posts`);
  return data;
};

export const fetchFollowers = async (username: string) => {
  const { data } = await apiClient.get(`/profiles/${username}/followers`);
  return data;
};

export const fetchFollowing = async (username: string) => {
  const { data } = await apiClient.get(`/profiles/${username}/following`);
  return data;
};

export const updateBio = async (bio: string) => {
  const { data } = await apiClient.patch('/profiles/me/bio', { bio });
  return data;
};

export const createPost = async (title: string, content: string) => {
  const { data } = await apiClient.post<UserPost>('/profiles/me/posts', { title, content });
  return data;
};

export const updatePost = async (postId: string, title: string, content: string) => {
  const { data } = await apiClient.patch<UserPost>(`/profiles/me/posts/${postId}`, { title, content });
  return data;
};

export const deletePost = async (postId: string) => {
  await apiClient.delete(`/profiles/me/posts/${postId}`);
};

export const followUser = async (username: string) => {
  await apiClient.post(`/profiles/${username}/follow`);
};

export const unfollowUser = async (username: string) => {
  await apiClient.delete(`/profiles/${username}/follow`);
};

// Registration request (public, no auth)
export const submitRegistrationRequest = async (formData: FormData) => {
  const { data } = await apiClient.post('/public/register-request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};
