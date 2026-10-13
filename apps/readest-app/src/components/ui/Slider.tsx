import * as SliderPrimitive from '@radix-ui/react-slider';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  label?: string;
  formatValue?: (value: number) => string;
}

export function Slider({ value, onValueChange, min, max, step, label, formatValue }: SliderProps) {
  return (
    <div className='flex items-center gap-4'>
      {label && (
        <span className='text-sm text-[var(--wr-text-secondary)] w-12 shrink-0'>{label}</span>
      )}
      <SliderPrimitive.Root
        className='relative flex h-5 w-full touch-none items-center'
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
      >
        <SliderPrimitive.Track className='relative h-1 w-full grow rounded-full bg-[var(--wr-bg-green)]'>
          <SliderPrimitive.Range className='absolute h-full rounded-full bg-[var(--wr-accent)]' />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className='block h-4 w-4 rounded-full bg-white shadow-[var(--wr-shadow-md)] ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--wr-accent)]/20' />
      </SliderPrimitive.Root>
      {formatValue && (
        <span className='text-sm tabular-nums text-[var(--wr-text-secondary)] w-10 text-right'>
          {formatValue(value[0]!)}
        </span>
      )}
    </div>
  );
}
