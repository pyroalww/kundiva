# KUNDIVA Platform

KUNDIVA is a collaborative learning platform that connects students with volunteer teachers and an AI tutor powered by Gemini 2.5 Pro. Students can submit questions as text or images, select a solver, and receive structured answers that pass an ethics guardrail check. Teachers see a filtered queue of relevant questions, while public visitors can browse and search solved problems.

## Features
- Student question intake with role-aware authentication
- OCR pipeline for question images with AI-generated titles
- Dual solver workflow (volunteer teacher or AI tutor)
- Ethics validation loop for AI responses
- Follow-up conversation threads with waiting safeguards
- Teacher dashboard for answering assigned questions
- Public catalogue with search by title/content
- Yapay zekâ destekli benzer soru üretimi ve çoktan seçmeli mini quizler
- Modern, çok adımlı soru gönderme deneyimi ve animasyonlu arayüz
- Cevaplar altında yorumlar ve yanıtlar için etkileşimli sosyal katman
- İki yönlü arkadaşlık sistemi ve güvenli özel mesajlaşma (öğrenci-öğrenci / öğretmen-öğretmen / roleler arası)
- Admin paneli ile kullanıcılar, sorular, yorumlar, mesajlar ve arkadaşlıkların yönetimi

## Tech Stack
- **Backend:** Node.js, Express, Prisma (SQLite), Multer, Tesseract.js, @google/generative-ai
- **Frontend:** React (Vite), React Router, React Hook Form
- **Shared:** Zod schemas and shared types consumed by both client and server

## Prerequisites
- Node.js 18+
- pnpm 9+

## Initial Setup
1. Install dependencies for all workspaces:
   ```bash
   pnpm install
   ```
2. Create a Prisma SQLite database and generate the client:
   ```bash
   cd backend
   cp .env.example .env
   pnpm prisma:generate
   pnpm prisma:migrate --name init
   cd ..
   ```
3. Configure Gemini access:
   ```bash
   cd backend/config
   cp gemini.example.json gemini.json
   # edit gemini.json and add your Gemini API key
   cd ../..
   ```
   Alternatively set `GEMINI_API_KEY` in `backend/.env`.
4. Build the shared package (required for the frontend bundle):
   ```bash
   pnpm --filter @kundiva/shared build
   ```

## Running the App (development)
Open two terminals or use the root script:
```bash
pnpm dev
```
This launches:
- Backend API on `http://localhost:4000`
- Frontend web app on `http://localhost:5173`

Uploads are saved to `backend/uploads` and served under `/uploads/*`.

## Environment Variables
- `DATABASE_URL` – Prisma connection string (default SQLite file)
- `JWT_SECRET` – secret used to sign auth tokens
- `PORT` – backend port (default 4000)
- `GEMINI_API_KEY` – Gemini key (if not supplied via `config/gemini.json`)

## Key Workflows
- **Student submission:** metadata + text/image uploaded to `/api/questions`; OCR and AI title generation run automatically when needed.
- **AI solver:** metadata + extracted text routed to Gemini; structured JSON answer stored only if ethics check returns `true`.
- **Teacher solver:** question queued for matching teachers via `/api/teacher/questions`; submissions update status and archive responses.
- **Follow-ups:** students can loop additional questions through either solver, appending threaded answers.

## Testing the Platform
1. Register a student account and submit a question (try both text and image).
2. Register a teacher with matching subjects to observe queue assignment.
3. Submit follow-up questions to confirm AI/teacher loops.
4. Browse the home page without logging in to verify public search access.

## Next Steps / Enhancements
- Email notifications for teacher assignments and AI completions
- Admin moderation interface for flagged ethics cases
- Expanded analytics and activity logs
- File storage provider (S3, GCS) for production deployments

---
Need help or want adjustments? Let me know!
