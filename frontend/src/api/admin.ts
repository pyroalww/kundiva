import { apiClient } from './client';

export const createAdminAccount = async (payload: {
  username: string;
  password: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}) => {
  const { data } = await apiClient.post('/admin/users/create', payload);
  return data;
};

export const createAdminAccountsBulk = async (accounts: Array<{
  username: string;
  password: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}>) => {
  const { data } = await apiClient.post('/admin/users/bulk-create', { accounts });
  return data as { results: any[]; errors: string[] };
};


export const fetchAdminOverview = async () => {
  const { data } = await apiClient.get('/admin/overview');
  return data as {
    users: { students: number; teachers: number; admins: number };
    questions: Record<string, number>;
    totalComments: number;
    totalMessages: number;
  };
};

export const fetchAdminUsers = async () => {
  const { data } = await apiClient.get('/admin/users');
  return data as Array<{
    id: string;
    email: string;
    username?: string | null;
    role: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    isBanned: boolean;
    shadowBanned: boolean;
    banReason?: string | null;
    banExpiresAt?: string | null;
    lastSeenAt?: string | null;
    lastSeenIp?: string | null;
    lastSeenUserAgent?: string | null;
  }>;
};

export const updateAdminUserRole = async (userId: string, role: string) => {
  const { data } = await apiClient.patch(`/admin/users/${userId}`, { role });
  return data;
};

export const deleteAdminUser = async (userId: string) => {
  await apiClient.delete(`/admin/users/${userId}`);
};

export const fetchAdminQuestions = async () => {
  const { data } = await apiClient.get('/admin/questions');
  return data;
};

export const deleteAdminQuestion = async (questionId: string) => {
  await apiClient.delete(`/admin/questions/${questionId}`);
};

export const fetchAdminComments = async () => {
  const { data } = await apiClient.get('/admin/comments');
  return data;
};

export const deleteAdminComment = async (commentId: string) => {
  await apiClient.delete(`/admin/comments/${commentId}`);
};

export const fetchAdminMessages = async () => {
  const { data } = await apiClient.get('/admin/messages');
  return data;
};

export const flagAdminMessage = async (messageId: string, isSpam: boolean) => {
  const { data } = await apiClient.patch(`/admin/messages/${messageId}`, { isSpam });
  return data;
};

export const fetchAdminFriendships = async () => {
  const { data } = await apiClient.get('/admin/friendships');
  return data;
};

export const fetchAdminSettings = async () => {
  const { data } = await apiClient.get<Record<string, string>>('/admin/settings');
  return data;
};

export const updateAdminSettings = async (updates: Array<{ key: string; value: string }>) => {
  const { data } = await apiClient.patch<Record<string, string>>('/admin/settings', { updates });
  return data;
};

export const fetchAdminUsageMetrics = async () => {
  const { data } = await apiClient.get<{
    totals: Record<string, number>;
    recent: Array<{ id: string; eventType: string; context: string | null; createdAt: string }>;
  }>('/admin/metrics/usage');
  return data;
};

export const fetchAdminApiKeys = async () => {
  const { data } = await apiClient.get<Array<{ id: string; provider: string; priority: number; isActive: boolean; failCount: number; lastUsedAt?: string | null }>>('/admin/api-keys');
  return data;
};

export const createAdminApiKey = async (payload: { provider: 'GEMINI' | 'IMAGEN'; key: string; priority?: number }) => {
  const { data } = await apiClient.post('/admin/api-keys', payload);
  return data;
};

export const updateAdminApiKey = async (
  keyId: string,
  payload: { priority?: number; isActive?: boolean }
) => {
  const { data } = await apiClient.patch(`/admin/api-keys/${keyId}`, payload);
  return data;
};

export const fetchSupportTickets = async () => {
  const { data } = await apiClient.get('/admin/support/tickets');
  return data as Array<{
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    _count: { messages: number };
    messages: Array<{ id: string; senderType: string; content: string; createdAt: string }>;
  }>;
};

export const generateImagenPreview = async (payload: { prompt: string; count?: number; model?: string }) => {
  const { data } = await apiClient.post<{
    model: string;
    images: Array<{ index: number; base64: string; mimeType: string; sizeBytes: number }>;
  }>('/admin/ai/imagen', payload);
  return data;
};

export const sanctionAdminUser = async (
  userId: string,
  payload: { mode: 'BAN' | 'SHADOW'; reason?: string; expiresAt?: string | null }
) => {
  const { data } = await apiClient.post(`/admin/users/${userId}/sanctions`, payload);
  return data;
};

export const liftAdminSanction = async (userId: string, mode: 'BAN' | 'SHADOW') => {
  const { data } = await apiClient.delete(`/admin/users/${userId}/sanctions`, {
    data: { mode }
  });
  return data;
};

export const fetchAdminAuditLogs = async () => {
  const { data } = await apiClient.get<
    Array<{
      id: string;
      userId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      method?: string | null;
      path: string;
      statusCode?: number | null;
      metadata?: string | null;
      createdAt: string;
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      } | null;
    }>
  >('/admin/security/audit');
  return data;
};

export const fetchAdminBannedIps = async () => {
  const { data } = await apiClient.get<
    Array<{
      id: string;
      ipAddress: string;
      reason?: string | null;
      createdAt: string;
      expiresAt?: string | null;
      createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }>
  >('/admin/security/ip-bans');
  return data;
};

export const createAdminBannedIp = async (payload: { ipAddress: string; reason?: string; expiresAt?: string | null }) => {
  const { data } = await apiClient.post('/admin/security/ip-bans', payload);
  return data;
};

export const deleteAdminBannedIp = async (id: string) => {
  await apiClient.delete(`/admin/security/ip-bans/${id}`);
};

// Question management
export const updateAdminQuestion = async (questionId: string, payload: { title?: string; description?: string; status?: string }) => {
  const { data } = await apiClient.patch(`/admin/questions/${questionId}`, payload);
  return data;
};

export const adminAiSolve = async (questionId: string) => {
  const { data } = await apiClient.post(`/admin/questions/${questionId}/ai-solve`);
  return data;
};

export const adminAddSolution = async (questionId: string, payload: { content: string; isCorrect?: boolean }) => {
  const { data } = await apiClient.post(`/admin/questions/${questionId}/solutions`, payload);
  return data;
};

export const adminMarkSolution = async (questionId: string, solutionId: string, isCorrect: boolean) => {
  const { data } = await apiClient.patch(`/admin/questions/${questionId}/solutions/${solutionId}`, { isCorrect });
  return data;
};

// Answer management
export const updateAdminAnswer = async (answerId: string, content: string) => {
  const { data } = await apiClient.patch(`/admin/answers/${answerId}`, { content });
  return data;
};

export const deleteAdminAnswer = async (answerId: string) => {
  await apiClient.delete(`/admin/answers/${answerId}`);
};

// Registration requests
export const fetchRegistrationRequests = async () => {
  const { data } = await apiClient.get('/admin/registration-requests');
  return data as Array<{
    id: string;
    desiredUsername: string;
    fullName: string;
    studentIdPath?: string | null;
    status: string;
    rejectionNote?: string | null;
    createdAt: string;
  }>;
};

export const approveRegistrationRequest = async (id: string) => {
  const { data } = await apiClient.post(`/admin/registration-requests/${id}/approve`);
  return data;
};

export const rejectRegistrationRequest = async (id: string, note?: string) => {
  const { data } = await apiClient.post(`/admin/registration-requests/${id}/reject`, { note });
  return data;
};
