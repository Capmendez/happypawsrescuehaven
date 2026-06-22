import React from 'react';
import Nav from './Nav';
import Footer from './Footer';

interface PageShellProps {
  children: React.ReactNode;
}

/**
 * PageShell component that wraps all primary route content with standard Header (Nav) and Footer.
 */
export const PageShell: React.FC<PageShellProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-hprh-paper">
      <Nav />
      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageShell;
