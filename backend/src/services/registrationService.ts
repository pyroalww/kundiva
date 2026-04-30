import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;

export const registrationService = {
  submitRequest: async (params: {
    desiredUsername: string;
    password: string;
    fullName: string;
    studentNumber: string;
    studentIdPath?: string;
  }) => {
    const username = params.desiredUsername.toLowerCase().trim();

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) throw new ApiError(409, 'Bu kullanıcı adı zaten kullanılıyor.');

    const existingRequest = await prisma.registrationRequest.findFirst({
      where: { desiredUsername: username, status: 'PENDING' }
    });
    if (existingRequest) throw new ApiError(409, 'Bu kullanıcı adı için zaten bir talep var.');

    if (params.password.length < 8) {
      throw new ApiError(400, 'Şifre en az 8 karakter olmalıdır.');
    }

    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);

    return prisma.registrationRequest.create({
      data: {
        desiredUsername: username,
        password: passwordHash,
        fullName: params.fullName.trim(),
        studentNumber: params.studentNumber.trim(),
        studentIdPath: params.studentIdPath ?? null
      }
    });
  },

  listRequests: async (status?: string) => {
    const where = status ? { status } : {};
    return prisma.registrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  },

  approveRequest: async (requestId: string) => {
    const request = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ApiError(404, 'Talep bulunamadı.');
    if (request.status !== 'PENDING') throw new ApiError(400, 'Bu talep zaten işlenmiş.');

    // Create the user account
    const nameParts = request.fullName.split(' ');
    const firstName = nameParts[0] || 'Yeni';
    const lastName = nameParts.slice(1).join(' ') || 'Kullanıcı';

    const user = await prisma.user.create({
      data: {
        email: `${request.desiredUsername}@kundiva.local`,
        username: request.desiredUsername,
        passwordHash: request.password,
        firstName,
        lastName,
        studentNumber: request.studentNumber ?? '',
        role: 'STUDENT',
        profileCompleted: false,
        aiCredits: 3
      }
    });

    await prisma.registrationRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' }
    });

    return user;
  },

  rejectRequest: async (requestId: string, note?: string) => {
    const request = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ApiError(404, 'Talep bulunamadı.');
    if (request.status !== 'PENDING') throw new ApiError(400, 'Bu talep zaten işlenmiş.');

    return prisma.registrationRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectionNote: note ?? null }
    });
  }
};
