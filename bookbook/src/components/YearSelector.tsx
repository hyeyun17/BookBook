import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentYear } from '../utils/reading'
export function YearSelector({
  year,
  onChange,
}: {
  year: number
  onChange: (year: number) => void
}) {
  return (
    <div className="year-selector">
      <button
        className="icon-button"
        aria-label="이전 연도"
        onClick={() => onChange(year - 1)}
        disabled={year <= 1900}
      >
        <ChevronLeft size={20} />
      </button>
      <span aria-live="polite">{year}</span>
      <button
        className="icon-button"
        aria-label="다음 연도"
        onClick={() => onChange(year + 1)}
        disabled={year >= currentYear()}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
