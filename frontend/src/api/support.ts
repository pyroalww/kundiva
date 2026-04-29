import { apiClient } from './client';
import type { SupportInfo, SupportMessage, SupportSession } from '../types';

export const fetchSupportInfo = async (): Promise<SupportInfo> => {
  const { data } = await apiClient.get<SupportInfo>('/support/faqs');
  return data;
};

export const fetchSupportSession = async (): Promise<SupportSession | null> => {
  const { data } = await apiClient.get<{ session: SupportSession | null }>('/support/session');
  return data.session;
};

export const sendSupportMessage = async (content: string): Promise<{
  ticketId: string;
  queuePosition: number;
  response: SupportMessage;
  messages: SupportMessage[];
}> => {
  const { data } = await apiClient.post<{
    ticketId: string;
    queuePosition: number;
    response: SupportMessage;
    messages: SupportMessage[];
  }>('/support/messages', {
    content
  });

  return data;
};
