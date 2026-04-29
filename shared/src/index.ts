import { z } from 'zod';

const nonEmptyString = (label: string) => z.string().trim().min(1, `${label} alanı boş bırakılamaz.`);

const userRoleSchema = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);
const questionStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'ANSWERED', 'FLAGGED']);
const answerSourceSchema = z.enum(['AI', 'TEACHER', 'FOLLOW_UP']);

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
  firstName: nonEmptyString('Ad'),
  lastName: nonEmptyString('Soyad'),
  role: userRoleSchema,
  studentNumber: z.string().trim().optional(),
  subjects: z.array(z.string().trim().min(1)).optional(),
  educationLevels: z.array(z.string().trim().min(1)).optional()
});

/** Admin creates account with username+password, profile is completed on first login */
const createAccountSchema = z.object({
  username: nonEmptyString('Kullanıcı adı'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
  role: userRoleSchema
});

const completeProfileSchema = z.object({
  firstName: nonEmptyString('Ad'),
  lastName: nonEmptyString('Soyad'),
  email: z.string().trim().email().optional(),
  studentNumber: z.string().trim().optional(),
  subjects: z.array(z.string().trim().min(1)).optional(),
  educationLevels: z.array(z.string().trim().min(1)).optional()
});

const loginSchema = z.object({
  identifier: nonEmptyString('Kullanıcı adı veya e-posta'),
  password: nonEmptyString('Şifre')
});

const solverTypeSchema = z.enum(['AI', 'TEACHER']);

const createQuestionSchema = z.object({
  firstName: nonEmptyString('Ad'),
  lastName: nonEmptyString('Soyad'),
  studentNumber: nonEmptyString('Öğrenci numarası'),
  course: nonEmptyString('Ders'),
  subjectArea: nonEmptyString('Alan'),
  subjectName: nonEmptyString('Konu başlığı'),
  category: nonEmptyString('Kategori'),
  educationLevel: nonEmptyString('Eğitim düzeyi'),
  title: z.string().trim().optional(),
  questionText: z.string().trim().optional(),
  solverType: solverTypeSchema.optional().default('TEACHER'),
  useKundivaAi: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional().default(false)
});

const followUpSchema = z.object({
  questionId: z.string().trim().min(1).optional(),
  content: nonEmptyString('Takip sorusu'),
  solverType: solverTypeSchema
});

const teacherAnswerSchema = z.object({
  content: nonEmptyString('Yanıt')
});

const practiceQuestionSchema = z.object({
  prompt: nonEmptyString('Soru metni'),
  options: z.array(z.string().trim().min(1)).min(2),
  correctIndex: z.number().int(),
  explanation: nonEmptyString('Açıklama')
});

const createCommentSchema = z.object({
  content: nonEmptyString('Yorum'),
  parentCommentId: z.string().trim().optional()
});

const friendRequestSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi giriniz.')
});

const friendResponseSchema = z.object({
  friendshipId: z.string().trim(),
  action: z.enum(['ACCEPT', 'DECLINE'])
});

const sendMessageSchema = z.object({
  receiverId: z.string().trim(),
  content: nonEmptyString('Mesaj')
});

const submitSolutionSchema = z.object({
  content: nonEmptyString('Çözüm')
});

const markSolutionSchema = z.object({
  isCorrect: z.boolean()
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type SolverType = z.infer<typeof solverTypeSchema>;
export type QuestionStatus = z.infer<typeof questionStatusSchema>;
export type AnswerSource = z.infer<typeof answerSourceSchema>;
export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type CreateQuestionPayload = z.infer<typeof createQuestionSchema>;
export type FollowUpPayload = z.infer<typeof followUpSchema>;
export type TeacherAnswerPayload = z.infer<typeof teacherAnswerSchema>;
export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;
export type CreateCommentPayload = z.infer<typeof createCommentSchema>;
export type FriendRequestPayload = z.infer<typeof friendRequestSchema>;
export type FriendResponsePayload = z.infer<typeof friendResponseSchema>;
export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
export type CreateAccountPayload = z.infer<typeof createAccountSchema>;
export type CompleteProfilePayload = z.infer<typeof completeProfileSchema>;
export type SubmitSolutionPayload = z.infer<typeof submitSolutionSchema>;
export type MarkSolutionPayload = z.infer<typeof markSolutionSchema>;

export {
  userRoleSchema,
  questionStatusSchema,
  answerSourceSchema,
  registerSchema,
  loginSchema,
  solverTypeSchema,
  createQuestionSchema,
  followUpSchema,
  teacherAnswerSchema,
  practiceQuestionSchema,
  createCommentSchema,
  friendRequestSchema,
  friendResponseSchema,
  sendMessageSchema,
  createAccountSchema,
  completeProfileSchema,
  submitSolutionSchema,
  markSolutionSchema
};
