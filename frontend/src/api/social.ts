import type {
  FriendRequestPayload,
  FriendResponsePayload,
  SendMessagePayload
} from '@kundiva/shared';

import { apiClient } from './client';
import type {
  DirectMessage,
  FriendRequest,
  FriendSummary,
  OutgoingRequest
} from '../types';

export const sendFriendRequest = async (payload: FriendRequestPayload) => {
  await apiClient.post('/friends/request', payload);
};

export const respondFriendRequest = async (payload: FriendResponsePayload) => {
  const { data } = await apiClient.post('/friends/respond', payload);
  return data;
};

export const fetchFriends = async (): Promise<FriendSummary[]> => {
  const { data } = await apiClient.get<FriendSummary[]>('/friends');
  return data;
};

export const fetchPendingRequests = async (): Promise<{
  incoming: FriendRequest[];
  outgoing: OutgoingRequest[];
}> => {
  const { data } = await apiClient.get<{
    incoming: FriendRequest[];
    outgoing: OutgoingRequest[];
  }>('/friends/pending');
  return data;
};

export const fetchMessagePartners = async () => {
  const { data } = await apiClient.get<
    Array<{ id: string; firstName: string; lastName: string; username?: string | null }>
  >('/messages/partners');
  return data;
};

export const fetchConversation = async (partnerId: string): Promise<DirectMessage[]> => {
  const { data } = await apiClient.get<DirectMessage[]>(`/messages/${partnerId}`);
  return data;
};

export const sendMessage = async (payload: SendMessagePayload) => {
  const { data } = await apiClient.post<DirectMessage>(`/messages/${payload.receiverId}`, {
    content: payload.content
  });
  return data;
};
