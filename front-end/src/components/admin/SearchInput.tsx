import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

// Controlled search box: the parent owns the value and receives every change.
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  label = "Search",
}: SearchInputProps) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      {/* Hidden label keeps the field accessible without extra visible text. */}
      <span className="sr-only">{label}</span>
      <Search
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#7A585B]"
      />
      {/* Each typed character goes to the parent for filtering or refetching. */}
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-[#EBD5D3] bg-white py-2.5 pr-4 pl-10 text-sm text-[#58111A] outline-none transition placeholder:text-[#7A585B]/70 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15"
      />
    </label>
  );
}
