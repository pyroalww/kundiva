export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  username?: string | null;
  studentNumber?: string | null;
  subjects?: string[];
  educationLevels?: string[];
  profileCompleted?: boolean;
  aiCredits?: number;
  totalPoints?: number;
};

export type QuestionListItem = {
  id: string;
  title: string;
  subjectName: string;
  subjectArea: string;
  course: string;
  category: string;
  educationLevel: string;
  createdAt: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'FLAGGED';
  useKundivaAi?: boolean;
  _count?: {
    answers: number;
    solutions: number;
  };
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type CommentAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
};

export type Comment = {
  id: string;
  content: string;
  author: CommentAuthor;
  createdAt: string;
  parentCommentId?: string | null;
  replies?: Comment[];
};

export type AnswerAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
};

export type QuestionDetail = {
  id: string;
  studentId: string;
  title: string;
  subjectName: string;
  subjectArea: string;
  course: string;
  category: string;
  educationLevel: string;
  description: string;
  status: QuestionListItem['status'];
  solverType: 'AI' | 'TEACHER';
  useKundivaAi?: boolean;
  createdAt: string;
  aiEthicsFlag?: boolean | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  answers: Array<{
    id: string;
    source: 'AI' | 'TEACHER' | 'FOLLOW_UP';
    content: string;
    createdAt: string;
    followUpOfId?: string | null;
    author?: AnswerAuthor | null;
    comments?: Comment[];
    attachments?: MediaAttachment[];
  }>;
  attachments?: Array<{
    id: string;
    mimeType: string;
    storagePath: string;
    originalName: string;
  }>;
  solutions?: StudentSolution[];
};

export type MediaAttachment = {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  storagePath: string;
  originalName: string;
  fileSize: number;
  durationMs?: number | null;
  createdAt?: string;
};

export type StudentSolution = {
  id: string;
  questionId: string;
  authorId: string;
  content: string;
  isCorrect: boolean | null;
  points: number;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    totalPoints: number;
  };
};

export type LeaderboardEntry = {
  userId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  periodPoints: number;
  correctSolutions: number;
};

export type QuestionFilters = {
  course?: string;
  subjectArea?: string;
  subjectName?: string;
  category?: string;
  educationLevel?: string;
};

export type FriendSummary = {
  friendshipId: string;
  friend: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    username?: string | null;
  };
};

export type FriendRequest = {
  id: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username?: string | null;
  };
  createdAt: string;
};

export type OutgoingRequest = {
  id: string;
  addressee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username?: string | null;
  };
  createdAt: string;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

export type SupportInfo = {
  info: {
    project: string;
    softwareTeam: string;
    description: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: 'USER' | 'BOT';
  content: string;
  createdAt: string;
};

export type SupportSession = {
  ticket: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: SupportMessage[];
};
