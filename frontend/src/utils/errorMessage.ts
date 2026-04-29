import axios from 'axios';

type ApiErrorResponse = {
  message?: string;
  issues?: Array<{ field?: string; message?: string }>;
};

export const extractErrorMessage = (
  error: unknown,
  fallback = 'Beklenmeyen bir hata oluştu.'
): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.issues && data.issues.length > 0) {
      const issue = data.issues.find((item) => item.message) ?? data.issues[0];
      if (issue?.message) {
        return issue.message;
      }
    }
    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
