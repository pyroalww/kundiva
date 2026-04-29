import type { UserRole } from '@kundiva/shared';

import type { ScopedLogger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
        firstName: string;
        lastName: string;
        username?: string | null;
        shadowBanned?: boolean;
        profileCompleted?: boolean;
        aiCredits?: number;
        totalPoints?: number;
        studentNumber?: string | null;
      };
      requestId?: string;
      log?: ScopedLogger;
      clientIp?: string;
      userAgent?: string;
    }
  }
}

export { };
