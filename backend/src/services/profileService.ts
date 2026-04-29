import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

export const profileService = {
  getProfile: async (username: string, viewerId?: string) => {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        bio: true,
        totalPoints: true,
        createdAt: true,
        _count: {
          select: {
            questions: true,
            solutions: true,
            answers: true,
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } }
      });
      isFollowing = !!follow;
    }

    const correctSolutions = await prisma.studentSolution.count({
      where: { authorId: user.id, isCorrect: true }
    });

    return { ...user, isFollowing, correctSolutions };
  },

  getProfileQuestions: async (username: string, take = 20, skip = 0) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    return prisma.question.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      select: {
        id: true, title: true, subjectName: true, course: true,
        educationLevel: true, status: true, createdAt: true,
        useKundivaAi: true,
        _count: { select: { answers: true, solutions: true } }
      }
    });
  },

  getProfileSolutions: async (username: string, take = 20, skip = 0) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    return prisma.studentSolution.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: {
        question: { select: { id: true, title: true, subjectName: true } }
      }
    });
  },

  getPosts: async (username: string, take = 20, skip = 0) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    return prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: { author: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
  },

  createPost: async (userId: string, title: string, content: string) => {
    return prisma.post.create({
      data: { authorId: userId, title, content },
      include: { author: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
  },

  updatePost: async (userId: string, postId: string, title: string, content: string) => {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new ApiError(404, 'Gönderi bulunamadı.');
    if (post.authorId !== userId) throw new ApiError(403, 'Bu gönderiyi düzenleme yetkiniz yok.');

    return prisma.post.update({
      where: { id: postId },
      data: { title, content },
      include: { author: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
  },

  deletePost: async (userId: string, postId: string, isAdmin = false) => {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new ApiError(404, 'Gönderi bulunamadı.');
    if (post.authorId !== userId && !isAdmin) throw new ApiError(403, 'Bu gönderiyi silme yetkiniz yok.');
    return prisma.post.delete({ where: { id: postId } });
  },

  updateBio: async (userId: string, bio: string) => {
    return prisma.user.update({
      where: { id: userId },
      data: { bio },
      select: { id: true, bio: true }
    });
  },

  follow: async (followerId: string, followingUsername: string) => {
    const target = await prisma.user.findUnique({ where: { username: followingUsername } });
    if (!target) throw new ApiError(404, 'Kullanıcı bulunamadı.');
    if (target.id === followerId) throw new ApiError(400, 'Kendinizi takip edemezsiniz.');

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } }
    });
    if (existing) throw new ApiError(400, 'Zaten takip ediyorsunuz.');

    return prisma.follow.create({ data: { followerId, followingId: target.id } });
  },

  unfollow: async (followerId: string, followingUsername: string) => {
    const target = await prisma.user.findUnique({ where: { username: followingUsername } });
    if (!target) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } }
    });
    if (!existing) throw new ApiError(400, 'Takip etmiyorsunuz.');

    return prisma.follow.delete({ where: { id: existing.id } });
  },

  getFollowers: async (username: string, take = 50, skip = 0) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    const follows = await prisma.follow.findMany({
      where: { followingId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: { follower: { select: { id: true, username: true, firstName: true, lastName: true, role: true, totalPoints: true } } }
    });
    return follows.map(f => f.follower);
  },

  getFollowing: async (username: string, take = 50, skip = 0) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı.');

    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      orderBy: { createdAt: 'desc' },
      take, skip,
      include: { following: { select: { id: true, username: true, firstName: true, lastName: true, role: true, totalPoints: true } } }
    });
    return follows.map(f => f.following);
  }
};
