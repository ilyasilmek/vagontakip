import { SORT_OPTIONS, type RecordSort } from './sorting';

export default function SortSelect({ value, onChange, label }: { value: RecordSort; onChange: (sort: RecordSort) => void; label: string }) {
  return <label className="sort-control"><span>Sıralama</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value as RecordSort)}>{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
