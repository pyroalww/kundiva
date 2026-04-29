import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { socialService } from './socialService';

const sanitize = (value: string) => value.trim();

export const messageService = {
  sendMessage: async (params: { senderId: string; receiverId: string; content: string }) => {
    if (params.senderId === params.receiverId) {
      throw new ApiError(400, 'Kendinize mesaj gönderemezsiniz.');
    }

    const content = sanitize(params.content);
    if (!content) {
      throw new ApiError(400, 'Mesaj içeriği boş olamaz.');
    }

    const isFriend = await socialService.areFriends(params.senderId, params.receiverId);
    if (!isFriend) {
      throw new ApiError(403, 'Mesaj gönderebilmek için karşılıklı arkadaş olmalısınız.');
    }

    return prisma.message.create({
      data: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        content
      }
    });
  },
  getConversation: async (params: { userId: string; partnerId: string; take?: number }) => {
    const isFriend = await socialService.areFriends(params.userId, params.partnerId);
    if (!isFriend) {
      throw new ApiError(403, 'Mesajları görüntüleyebilmek için arkadaş olmalısınız.');
    }

    const take = params.take ?? 100;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: params.userId, receiverId: params.partnerId },
          { senderId: params.partnerId, receiverId: params.userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take
    });

    return messages;
  },
  listPartners: async (userId: string) => {
    const friends = await socialService.listFriends(userId);
    return friends.map((item) => item.friend);
  }
};
