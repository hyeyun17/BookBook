import { Star } from 'lucide-react'
export function Rating({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div
      className={`rating ${onChange ? 'rating-input' : ''}`}
      role={onChange ? 'group' : 'img'}
      aria-label={onChange ? '별점 선택' : `${value}점 / 5점`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        onChange ? (
          <button
            key={star}
            type="button"
            aria-label={`${star}점`}
            aria-pressed={value === star}
            onClick={() => onChange(star)}
          >
            <Star size={36} fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ) : (
          <Star key={star} size={14} fill={star <= value ? 'currentColor' : 'none'} />
        ),
      )}
    </div>
  )
}
