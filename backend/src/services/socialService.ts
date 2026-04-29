import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

const FRIEND_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED'
} as const;

const sanitize = (value: string) => value.trim();

export const socialService = {
  sendFriendRequest: async (params: { requesterId: string; email: string }) => {
    const email = sanitize(params.email).toLowerCase();
    const target = await prisma.user.findUnique({ where: { email } });

    if (!target) {
      throw new ApiError(404, 'Kullanıcı bulunamadı.');
    }

    if (target.id === params.requesterId) {
      throw new ApiError(400, 'Kendinize arkadaşlık isteği gönderemezsiniz.');
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: params.requesterId,
            addresseeId: target.id
          },
          {
            requesterId: target.id,
            addresseeId: params.requesterId
          }
        ]
      }
    });

    if (existing) {
      if (existing.status === FRIEND_STATUS.ACCEPTED) {
        throw new ApiError(400, 'Zaten arkadaşsınız.');
      }

      if (
        existing.status === FRIEND_STATUS.PENDING &&
        existing.addresseeId === params.requesterId
      ) {
        // Otomatik kabul
        return prisma.friendship.update({
          where: { id: existing.id },
          data: { status: FRIEND_STATUS.ACCEPTED }
        });
      }

      throw new ApiError(400, 'Bekleyen bir arkadaşlık isteğiniz zaten var.');
    }

    return prisma.friendship.create({
      data: {
        requesterId: params.requesterId,
        addresseeId: target.id,
        status: FRIEND_STATUS.PENDING
      }
    });
  },

  respondToRequest: async (params: {
    friendshipId: string;
    userId: string;
    action: 'ACCEPT' | 'DECLINE';
  }) => {
    const friendship = await prisma.friendship.findUnique({
      where: { id: params.friendshipId }
    });

    if (!friendship || friendship.addresseeId !== params.userId) {
      throw new ApiError(404, 'Arkadaşlık isteği bulunamadı.');
    }

    if (friendship.status !== FRIEND_STATUS.PENDING) {
      throw new ApiError(400, 'Arkadaşlık isteği zaten yanıtlanmış.');
    }

    const status = params.action === 'ACCEPT' ? FRIEND_STATUS.ACCEPTED : FRIEND_STATUS.DECLINED;

    return prisma.friendship.update({
      where: { id: friendship.id },
      data: { status }
    });
  },

  listFriends: async (userId: string) => {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: FRIEND_STATUS.ACCEPTED,
        OR: [
          { requesterId: userId },
          { addresseeId: userId }
        ]
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        },
        addressee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      }
    });

    return friendships.map((friendship) => {
      const rawFriend =
        friendship.requesterId === userId ? friendship.addressee : friendship.requester;
      return {
        friendshipId: friendship.id,
        friend: {
          id: rawFriend.id,
          firstName: rawFriend.firstName,
          lastName: rawFriend.lastName,
          email: rawFriend.email,
          username: rawFriend.username
        }
      };
    });
  },

  listPendingRequests: async (userId: string) => {
    return prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: FRIEND_STATUS.PENDING
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  },

  listOutgoingRequests: async (userId: string) => {
    return prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: FRIEND_STATUS.PENDING
      },
      include: {
        addressee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  },

  areFriends: async (userA: string, userB: string) => {
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: FRIEND_STATUS.ACCEPTED,
        OR: [
          { requesterId: userA, addresseeId: userB },
          { requesterId: userB, addresseeId: userA }
        ]
      }
    });
    return Boolean(friendship);
  }
};
