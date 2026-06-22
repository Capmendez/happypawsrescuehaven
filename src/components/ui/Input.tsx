import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Shared Input form primitive with custom warm borders, focus ring,
 * and helper error messages for input fields.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3.5 py-2.5 text-sm text-hprh-pine font-sans placeholder-hprh-pine/40 transition-colors focus:outline-none ${
            error ? 'border-hprh-clay focus:border-hprh-clay focus:ring-hprh-clay' : ''
          } ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-[10px] text-hprh-pine/50 uppercase tracking-wide font-semibold">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
