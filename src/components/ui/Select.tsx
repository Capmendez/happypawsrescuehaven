import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

/**
 * Shared Select primitive component for drop downs, matching the custom borders.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3.5 py-2.5 text-sm text-hprh-pine font-sans transition-colors focus:outline-none ${
            error ? 'border-hprh-clay focus:border-hprh-clay focus:ring-hprh-clay' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
