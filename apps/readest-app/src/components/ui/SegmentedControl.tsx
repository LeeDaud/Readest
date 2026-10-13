import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; ariaLabel?: string }[];
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
};

export function SegmentedControl({
  value,
  onValueChange,
  options,
  size = 'md',
}: SegmentedControlProps) {
  return (
    <ToggleGroupPrimitive.Root
      type='single'
      value={value}
      onValueChange={(v) => {
        if (v) onValueChange(v);
      }}
      className='inline-flex rounded-lg bg-[var(--wr-current-bg,var(--wr-bg-green))] p-0.5'
    >
      {options.map((opt) => (
        <ToggleGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          aria-label={opt.ariaLabel ?? opt.label}
          className={`${sizeClasses[size]} rounded-md font-medium transition-colors duration-150 text-[var(--wr-text-secondary)] data-[state=on]:bg-[var(--wr-bg-white)] data-[state=on]:text-[var(--wr-text-primary)] data-[state=on]:shadow-[var(--wr-shadow-sm)]`}
        >
          {opt.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
