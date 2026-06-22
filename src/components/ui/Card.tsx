import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Base card primitive using the brand's 'paper-dark' background and subtle dark borders.
 */
export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-hprh-paper-dark border border-hprh-pine/10 rounded-lg shadow-sm p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
