import { Link } from 'react-router-dom';

import type { QuestionListItem } from '../types';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Beklemede', className: 'PENDING' },
  IN_PROGRESS: { label: 'Çözülüyor', className: 'IN_PROGRESS' },
  ANSWERED: { label: 'Çözüldü', className: 'ANSWERED' },
  FLAGGED: { label: 'İnceleniyor', className: 'FLAGGED' }
};

export const QuestionCard: React.FC<{ question: QuestionListItem }> = ({ question }) => {
  const status = STATUS_MAP[question.status ?? 'PENDING'];

  return (
    <Link
      to={`/questions/${question.id}`}
      className="q-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="q-card-body">
        <div className="q-card-header">
          <h3 className="q-card-title">{question.title}</h3>
          {question.useKundivaAi && <span className="q-badge q-badge--ai">AI</span>}
        </div>
        <div className="q-card-meta">
          <span>{question.subjectName}</span>
          <span className="q-dot">·</span>
          <span>{question.course}</span>
          <span className="q-dot">·</span>
          <span>{question.educationLevel}</span>
        </div>
      </div>
      <div className="q-card-footer">
        <span className={`status-chip ${status.className}`}>{status.label}</span>
        <div className="q-card-counts">
          {(question._count?.answers ?? 0) > 0 && <span>💬 {question._count?.answers}</span>}
          {(question._count?.solutions ?? 0) > 0 && <span>📝 {question._count?.solutions}</span>}
        </div>
      </div>
    </Link>
  );
};
