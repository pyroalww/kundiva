import type { UserRole } from '@kundiva/shared';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

const SALT_ROUNDS = 12;

type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  studentNumber?: string;
  subjects?: string[];
  educationLevels?: string[];
};

type CreateAccountPayload = {
  username: string;
  password: string;
  role: UserRole;
};

type CompleteProfilePayload = {
  firstName: string;
  lastName: string;
  email?: string;
  studentNumber?: string;
  subjects?: string[];
  educationLevels?: string[];
};

type LoginPayload = {
  identifier: string;
  password: string;
};

const toJwt = (params: {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  profileCompleted?: boolean;
}) =>
  jwt.sign(
    {
      role: params.role,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      profileCompleted: params.profileCompleted ?? false
    },
    env.jwtSecret,
    {
      subject: params.id,
      expiresIn: '12h'
    }
  );

const sanitizeUser = (user: {
  passwordHash: string;
  subjects?: string | null;
  educationLevels?: string | null;
  username?: string | null;
  profileCompleted?: boolean;
  aiCredits?: number;
  totalPoints?: number;
  [key: string]: unknown;
}) => {
  const { passwordHash, subjects, educationLevels, username, profileCompleted, aiCredits, totalPoints, ...rest } = user;
  return {
    ...rest,
    username,
    profileCompleted: profileCompleted ?? false,
    aiCredits: aiCredits ?? 3,
    totalPoints: totalPoints ?? 0,
    subjects: subjects
      ? subjects
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      : [],
    educationLevels: educationLevels
      ? educationLevels
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      : []
  };
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const authService = {
  /** Admin creates an account with username + temporary password */
  createAccount: async (payload: CreateAccountPayload) => {
    const existing = await prisma.user.findUnique({
      where: { username: payload.username.toLowerCase().trim() }
    });

    if (existing) {
      throw new ApiError(409, 'Bu kullanıcı adı zaten kullanılıyor.');
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: `${payload.username.toLowerCase().trim()}@kundiva.local`,
        username: payload.username.toLowerCase().trim(),
        passwordHash,
        firstName: 'Yeni',
        lastName: 'Kullanıcı',
        role: payload.role,
        profileCompleted: false,
        aiCredits: 3
      }
    });

    return sanitizeUser(user);
  },

  createAccountsBulk: async (accounts: CreateAccountPayload[]) => {
    const results = [];
    const errors = [];

    for (const payload of accounts) {
      try {
        const username = payload.username.toLowerCase().trim();
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
          errors.push(`${username}: Zaten kullanılıyor.`);
          continue;
        }

        const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
        const user = await prisma.user.create({
          data: {
            email: `${username}@kundiva.local`,
            username,
            passwordHash,
            firstName: 'Yeni',
            lastName: 'Kullanıcı',
            role: payload.role,
            profileCompleted: false,
            aiCredits: 3
          }
        });
        results.push(sanitizeUser(user));
      } catch (err: any) {
        errors.push(`${payload.username}: ${err.message}`);
      }
    }

    return { results, errors };
  },

  /** Complete profile after first login */
  completeProfile: async (userId: string, payload: CompleteProfilePayload) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, 'Kullanıcı bulunamadı.');
    }

    if (user.profileCompleted) {
      throw new ApiError(400, 'Profil zaten tamamlanmış.');
    }

    const updateData: Record<string, unknown> = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      profileCompleted: true
    };

    if (payload.email) {
      const emailNorm = normalizeEmail(payload.email);
      const emailExists = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (emailExists && emailExists.id !== userId) {
        throw new ApiError(409, 'Bu e-posta adresi zaten kullanılıyor.');
      }
      updateData.email = emailNorm;
    }

    if (payload.studentNumber) {
      updateData.studentNumber = payload.studentNumber;
    }

    if (payload.subjects && payload.subjects.length > 0) {
      updateData.subjects = payload.subjects.map((s) => s.trim()).filter(Boolean).join(',');
    }

    if (payload.educationLevels && payload.educationLevels.length > 0) {
      updateData.educationLevels = payload.educationLevels.map((l) => l.trim()).filter(Boolean).join(',');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    const token = toJwt({
      id: updated.id,
      role: updated.role as UserRole,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      username: updated.username,
      profileCompleted: updated.profileCompleted
    });

    return {
      token,
      user: sanitizeUser(updated)
    };
  },

  register: async (payload: RegisterPayload) => {
    // Public registration is disabled — only admin can create accounts
    throw new ApiError(403, 'Kayıt işlemi yalnızca yöneticiler tarafından yapılabilir.');
  },

  login: async (payload: LoginPayload) => {
    const identifierRaw = payload.identifier.trim();
    const identifier = identifierRaw.toLowerCase();
    const user = identifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findUnique({ where: { username: identifier } });

    if (!user) {
      throw new ApiError(401, 'Kullanıcı adı veya şifre hatalı.');
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Kullanıcı adı veya şifre hatalı.');
    }

    const token = toJwt({
      id: user.id,
      role: user.role as UserRole,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      profileCompleted: user.profileCompleted
    });
    return {
      token,
      user: sanitizeUser(user)
    };
  }
};
