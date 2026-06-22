import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Shared container primitive defining consistent max-widths and page side paddings.
 */
export const Container: React.FC<ContainerProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Container;
