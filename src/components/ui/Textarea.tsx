import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Shared Textarea primitive for forms, matching custom focus rings.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3.5 py-2.5 text-sm text-hprh-pine font-sans placeholder-hprh-pine/40 transition-colors focus:outline-none min-h-[100px] resize-y ${
            error ? 'border-hprh-clay focus:border-hprh-clay focus:ring-hprh-clay' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
