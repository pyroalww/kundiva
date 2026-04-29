import type {
  CreateCommentPayload,
  CreateQuestionPayload,
  FollowUpPayload,
  PracticeQuestion,
  TeacherAnswerPayload
} from '@kundiva/shared';

import { apiClient } from './client';
import type { Comment, LeaderboardEntry, QuestionDetail, QuestionFilters, QuestionListItem, StudentSolution } from '../types';

export const fetchPublicQuestions = async (params?: {
  query?: string;
  skip?: number;
  take?: number;
  filters?: QuestionFilters;
}): Promise<{ items: QuestionListItem[]; total: number }> => {
  const searchParams: Record<string, string | number> = {};

  if (params?.query) {
    searchParams.q = params.query;
  }

  if (typeof params?.skip === 'number') {
    searchParams.skip = params.skip;
  }

  if (typeof params?.take === 'number') {
    searchParams.take = params.take;
  }

  if (params?.filters) {
    const { course, subjectArea, subjectName, category, educationLevel } = params.filters;
    if (course) searchParams.course = course;
    if (subjectArea) searchParams.subjectArea = subjectArea;
    if (subjectName) searchParams.subjectName = subjectName;
    if (category) searchParams.category = category;
    if (educationLevel) searchParams.educationLevel = educationLevel;
  }

  const { data } = await apiClient.get<{ items: QuestionListItem[]; total: number }>(
    '/public/questions',
    {
      params: searchParams
    }
  );

  return data;
};

export const fetchQuestionLibrary = async (params?: {
  query?: string;
  skip?: number;
  take?: number;
  filters?: QuestionFilters;
  status?: string;
}): Promise<{ items: QuestionListItem[]; total: number }> => {
  const searchParams: Record<string, string | number> = {};

  if (params?.query) searchParams.q = params.query;
  if (typeof params?.skip === 'number') searchParams.skip = params.skip;
  if (typeof params?.take === 'number') searchParams.take = params.take;
  if (params?.status) searchParams.status = params.status;

  if (params?.filters) {
    const { course, subjectArea, subjectName, category, educationLevel } = params.filters;
    if (course) searchParams.course = course;
    if (subjectArea) searchParams.subjectArea = subjectArea;
    if (subjectName) searchParams.subjectName = subjectName;
    if (category) searchParams.category = category;
    if (educationLevel) searchParams.educationLevel = educationLevel;
  }

  const { data } = await apiClient.get<{ items: QuestionListItem[]; total: number }>(
    '/questions/library',
    { params: searchParams }
  );

  return data;
};

export const fetchQuestionDetail = async (id: string): Promise<QuestionDetail> => {
  const { data } = await apiClient.get<QuestionDetail>(`/public/questions/${id}`);
  return data;
};

export const createQuestion = async ({
  payload,
  file
}: {
  payload: CreateQuestionPayload;
  file?: File | null;
}): Promise<QuestionDetail> => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  if (file) {
    formData.append('questionImage', file);
  }

  const { data } = await apiClient.post<QuestionDetail>('/questions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const fetchStudentQuestions = async (): Promise<QuestionDetail[]> => {
  const { data } = await apiClient.get<QuestionDetail[]>('/questions/me');
  return data;
};

export const submitFollowUp = async ({
  questionId,
  payload
}: {
  questionId: string;
  payload: FollowUpPayload;
}): Promise<QuestionDetail> => {
  const { data } = await apiClient.post<QuestionDetail>(`/questions/${questionId}/follow-ups`, payload);
  return data;
};

export const fetchTeacherQueue = async (): Promise<QuestionDetail[]> => {
  const { data } = await apiClient.get<QuestionDetail[]>('/teacher/questions');
  return data;
};

export const submitTeacherAnswer = async ({
  questionId,
  payload,
  files
}: {
  questionId: string;
  payload: TeacherAnswerPayload;
  files?: File[];
}): Promise<QuestionDetail> => {
  const formData = new FormData();
  formData.append('content', payload.content);
  files?.forEach((file) => {
    formData.append('attachments', file);
  });

  const { data } = await apiClient.post<QuestionDetail>(
    `/teacher/questions/${questionId}/answer`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return data;
};

export const generatePracticeQuestion = async ({
  questionId
}: {
  questionId: string;
}): Promise<PracticeQuestion> => {
  const { data } = await apiClient.post<PracticeQuestion>(`/questions/${questionId}/practice`);
  return data;
};

export const fetchCommentsForAnswer = async (answerId: string): Promise<Comment[]> => {
  const { data } = await apiClient.get<Comment[]>(`/answers/${answerId}/comments`);
  return data;
};

export const postComment = async ({
  answerId,
  payload
}: {
  answerId: string;
  payload: CreateCommentPayload;
}): Promise<Comment> => {
  const { data } = await apiClient.post<Comment>(`/answers/${answerId}/comments`, payload);
  return data;
};

export const submitSolution = async ({
  questionId,
  content
}: {
  questionId: string;
  content: string;
}): Promise<StudentSolution> => {
  const { data } = await apiClient.post<StudentSolution>(`/questions/${questionId}/solutions`, { content });
  return data;
};

export const fetchSolutions = async (questionId: string): Promise<StudentSolution[]> => {
  const { data } = await apiClient.get<StudentSolution[]>(`/questions/${questionId}/solutions`);
  return data;
};

export const markSolution = async ({
  questionId,
  solutionId,
  isCorrect
}: {
  questionId: string;
  solutionId: string;
  isCorrect: boolean;
}): Promise<StudentSolution> => {
  const { data } = await apiClient.patch<StudentSolution>(
    `/questions/${questionId}/solutions/${solutionId}`,
    { isCorrect }
  );
  return data;
};

export const fetchLeaderboard = async (period: 'daily' | 'weekly' | 'monthly'): Promise<LeaderboardEntry[]> => {
  const { data } = await apiClient.get<LeaderboardEntry[]>('/questions/leaderboard', {
    params: { period }
  });
  return data;
};
