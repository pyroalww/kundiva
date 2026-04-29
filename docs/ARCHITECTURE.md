# KUNDIVA Platform Architecture

## Overview
KUNDIVA is a two-sided learning support platform with workflows for students and volunteer teachers, plus an automated Gemini-powered assistant. The system is built as a TypeScript monorepo with a RESTful backend (`/backend`) and a React front-end (`/frontend`).

### Core Requirements Mapped
- **Student experience**: submit questions with metadata, upload text or image; choose solver (teacher vs AI); view answers and follow-up threads.
- **Teacher experience**: filtered queue of relevant questions, structured answer submission, conversation with student.
- **Public access**: browse/search published questions.
- **AI workflow**: Gemini 2.5 Pro handles answer generation and ethics validation; OCR converts uploaded images to text for archiving/discovery.
 - **AI workflow**: Gemini 2.5 Pro handles answer generation, ethics validation, and produces optional follow-up practice questions; OCR converts uploaded images to text for archiving/discovery.

## High-Level Components
- **Backend (Express + Prisma + SQLite)**  
  Handles authentication, role-based authorization, file storage, OCR, Gemini orchestration, and REST APIs for the frontend.
- **Frontend (React + Vite)**  
  Provides role-specific dashboards while sharing public browsing/search functionality.
- **Shared package (`/shared`)**  
  Type definitions and utility schemas shared across client/server.
- **Infrastructure / configuration**  
  `.env` (ignored) holds secrets; `config/gemini.example.json` defines Gemini defaults with instructions for supplying the API key.

## Data Model (Prisma)
- `User`: id, name, email (unique), hashed password, role (`STUDENT`/`TEACHER`), `studentId?`, `subjects?`, `educationLevels?`.
- `Question`: id, `studentId`, metadata fields, `solverType` (`AI`/`TEACHER`), `status` (`PENDING`, `IN_PROGRESS`, `ANSWERED`, `FLAGGED`), extracted text, `ocrText?`, `aiEthicsFlag`, `assignedTeacherId?`, timestamps.
- `QuestionAttachment`: references `Question`, stores file metadata and disk path.
- `Answer`: id, `questionId`, `authorId?` (null for AI), `source` (`AI`, `TEACHER`, `FOLLOW_UP`), `content`, `followUpOf?`, timestamps.
- `TeacherQueue`: join table linking questions to teachers for availability when `solverType=TEACHER`.
- Practice questions are generated on-demand — no persistence is required, requests flow directly through the AI service.
- `Comment`: threaded discussion tied to answers with parent/child relationship for replies.
- `Friendship`: bi-directional friendship graph with statuses (`PENDING`, `ACCEPTED`, `DECLINED`).
- `Message`: secure direct messages between friends with spam flags and indexing for conversation history.

## Request Lifecycle
1. **Student submission**  
   - Uploads metadata + file/text to `POST /api/questions`.  
   - Multer stores the image; OCR via `tesseract.js` extracts text.  
   - Title generated with Gemini if needed; archive text persisted for search.
2. **Solver routing**
   - `solverType=AI`: service composes structured prompt, calls Gemini for answer, then routes the answer to an ethics-check prompt. Outcomes:  
     - `True`: answer stored, question marked `ANSWERED`.  
     - `False`: question flagged for manual review.  
   - `solverType=TEACHER`: matching teachers pulled via subject + level tags; entries created in `TeacherQueue`.
   - After a question is answered, students can trigger a *practice question* flow that requests a multiple-choice exercise plus explanation from Gemini.
3. **Sosyal katman**
   - Öğrenciler ve öğretmenler e-posta ile arkadaşlık isteği gönderir; karşı taraf kabul ettiğinde özel mesajlaşma açılır.
   - Yorumlar cevapların altında threaded olarak tutulur; yanıtlar için hafif oran sınırlaması uygulanır.
   - Direkt mesajlar arkadaş ilişkisi onaylanmadan gönderilemez; aynı şekilde sınırlandırma ve spam bayrakları uygulanır.
3. **Teacher workflow**  
   - Teachers query `/api/teacher/questions` for matching open items.  
   - Answers posted to `/api/teacher/questions/:id/answers`.
4. **Follow-up Q/A**  
   - Students append follow-up questions; AI or teacher responses appended as additional `Answer` records.
5. **Public discovery**  
   - Public endpoints expose paginated lists and search by title/content (`/api/public/questions` + `/search`).  
   - SEO-friendly pages pre-rendered by frontend using archived text.

## Gemini Usage
- Library: `@google/generative-ai`.  
- Model: `gemini-2.5-pro`.  
- Prompts:
  - **Answer generation**: system instruction enforces uniform structure (Problem analysis, Step-by-step solution, Final answer). Inputs include metadata + question text + (optional) base64 image.
  - **Ethics validation**: second call with dedicated instruction returning `{"ethical": true|false, "reason": string}`. Backend accepts only if `ethical === true`.

## Security & Auth
- Passwords hashed with `bcrypt`.  
- JWT-based authentication: `Authorization: Bearer <token>`.  
- Middleware enforces roles per route.  
- File uploads restricted to images (png/jpeg).  
- Rate limiting stub (middleware ready for future enhancement).

## Frontend Highlights
- Routing via React Router.  
- Public pages: home (latest questions), question detail, search results.  
- Student portal: dashboard, ask-question wizard, follow-up threads.  
- Teacher portal: question queue, answer form, history.  
- Shared components for question cards, metadata badges, status chips.

## Dev Tooling
- `pnpm` workspaces to manage packages.  
- ESLint + Prettier configs shared.  
- Backend uses `ts-node-dev` for hot reload.  
- Frontend uses Vite dev server.

## Next Steps
- Implement email verification/notifications.  
- Add analytics + logging.  
- Enhance moderation/flagging workflow with manual review UI.
