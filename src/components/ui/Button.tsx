import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'destructive';
  children: React.ReactNode;
}

/**
 * Brand button primitive with custom variant stylings matching HPRH aesthetics.
 * Utilizes monospace, tracking, and uppercase text for a warm tactile layout.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-sans text-xs uppercase tracking-wider font-bold py-2.5 px-5 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 border border-hprh-clay focus:ring-hprh-clay focus:ring-offset-hprh-paper',
    secondary: 'bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 border border-hprh-sage focus:ring-hprh-sage focus:ring-offset-hprh-paper',
    ghost: 'text-hprh-sage hover:bg-hprh-sage/10 border border-transparent focus:ring-hprh-sage focus:ring-offset-hprh-paper',
    success: 'bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 border border-hprh-sage focus:ring-hprh-sage focus:ring-offset-hprh-paper',
    destructive: 'bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 border border-hprh-clay focus:ring-hprh-clay focus:ring-offset-hprh-paper',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
