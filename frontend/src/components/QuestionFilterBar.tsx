import type { QuestionFilters } from '../types';
import {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  LEVEL_OPTIONS,
  COURSE_TO_BRANCH,
  COURSE_TO_CATEGORY,
  getTopicsForCourse
} from '../constants/questionCatalog';

type QuestionFilterBarProps = {
  value: QuestionFilters;
  onChange: (filters: QuestionFilters) => void;
  compact?: boolean;
};

const handleCourseChange = (course: string | undefined, current: QuestionFilters): QuestionFilters => {
  if (!course) {
    const { course: _removed, subjectArea: _sa, subjectName: _sn, category: _cat, ...rest } = current;
    return rest;
  }

  const inferredBranch = COURSE_TO_BRANCH[course];
  const inferredCategory = COURSE_TO_CATEGORY[course];
  const topics = getTopicsForCourse(course);

  return {
    ...current,
    course,
    subjectArea: inferredBranch ?? current.subjectArea,
    category: inferredCategory ?? current.category,
    subjectName: topics.length > 0 ? topics[0] : current.subjectName
  };
};

export const QuestionFilterBar: React.FC<QuestionFilterBarProps> = ({ value, onChange, compact }) => {
  const topics = getTopicsForCourse(value.course);

  const update = (next: QuestionFilters) => {
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, v]) => typeof v === 'string' && v.length > 0)
    ) as QuestionFilters;
    onChange(cleaned);
  };

  const onSelect = (field: keyof QuestionFilters, rawValue: string) => {
    const normalized = rawValue === '' ? undefined : rawValue;

    if (field === 'course') {
      const next = handleCourseChange(normalized, value);
      update(next);
      return;
    }

    update({
      ...value,
      [field]: normalized
    });
  };

  const resetFilters = () => {
    onChange({});
  };

  return (
    <div className={`question-filter-bar ${compact ? 'compact' : ''}`}>
      <div className="filter-group">
        <label htmlFor="filter-course">Ders</label>
        <select
          id="filter-course"
          className="select"
          value={value.course ?? ''}
          onChange={(event) => onSelect('course', event.target.value)}
        >
          <option value="">Tümü</option>
          {COURSE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-branch">Branş</label>
        <select
          id="filter-branch"
          className="select"
          value={value.subjectArea ?? ''}
          onChange={(event) => onSelect('subjectArea', event.target.value)}
        >
          <option value="">Tümü</option>
          {BRANCH_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-topic">Konu</label>
        <select
          id="filter-topic"
          className="select"
          value={value.subjectName ?? ''}
          onChange={(event) => onSelect('subjectName', event.target.value)}
        >
          <option value="">Tümü</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-category">Kategori</label>
        <select
          id="filter-category"
          className="select"
          value={value.category ?? ''}
          onChange={(event) => onSelect('category', event.target.value)}
        >
          <option value="">Tümü</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-level">Düzey</label>
        <select
          id="filter-level"
          className="select"
          value={value.educationLevel ?? ''}
          onChange={(event) => onSelect('educationLevel', event.target.value)}
        >
          <option value="">Tümü</option>
          {LEVEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button className="button secondary reset-button" type="button" onClick={resetFilters}>
        Filtreleri sıfırla
      </button>
    </div>
  );
};
