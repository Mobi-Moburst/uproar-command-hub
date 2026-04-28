interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-glass rounded-xl px-3 py-2 text-sm font-sans text-white focus:outline-none focus:ring-1 focus:ring-[rgba(185,224,69,0.3)]"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-glass w-full max-w-sm rounded-xl px-3 py-2 text-sm font-sans text-white placeholder:text-[rgba(255,255,255,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(185,224,69,0.3)]"
    />
  );
}
