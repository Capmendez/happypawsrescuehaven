import React from 'react';
import Container from '../../components/ui/Container';

/**
 * Resources page placeholder (Phase 1).
 */
export const Resources: React.FC = () => {
  return (
    <div className="py-20 bg-hprh-paper flex-grow flex items-center">
      <Container className="text-center space-y-6">
        <div className="font-mono text-xs uppercase tracking-widest text-hprh-sage">
          Happy Paws Rescue Haven
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-display text-hprh-pine">
          Adopter Resources
        </h1>
        <p className="text-sm font-mono uppercase tracking-widest text-hprh-clay bg-hprh-clay/5 border border-hprh-clay/20 px-4 py-2 inline-block rounded select-none">
          Pet Care & Transition Guides — Coming in Phase 1
        </p>
      </Container>
    </div>
  );
};

export default Resources;
