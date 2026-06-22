import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Heart, Coins, Users, Shield, Home as HomeIcon, Truck, BookOpen, PawPrint, Cat, Rabbit } from 'lucide-react';

/**
 * Small decorative page divider with a centered PawPrint icon
 */
const SectionDivider: React.FC = () => (
  <div className="relative flex py-8 items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex-grow border-t border-dashed border-hprh-pine/20"></div>
    <span className="flex-shrink mx-4 text-hprh-sage/50">
      <PawPrint className="w-5 h-5" />
    </span>
    <div className="flex-grow border-t border-dashed border-hprh-pine/20"></div>
  </div>
);

/**
 * Home page for Happy Paws Rescue Haven.
 */
export const Home: React.FC = () => {
  return (
    <div className="bg-hprh-paper min-h-screen flex flex-col">
      {/* Full-width Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[85vh] bg-hprh-pine overflow-hidden">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=1600&h=1000"
          alt="Happy rescue dog"
          className="absolute inset-0 w-full h-full object-cover object-center filter contrast-[1.02] brightness-[0.95]"
        />
        
        {/* Gradient Overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-hprh-pine/95 via-hprh-pine/35 to-transparent"></div>

        {/* Rescued & Loved Stamp Badge */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-10">
          <span className="inline-block font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 border-2 border-hprh-gold text-hprh-gold bg-hprh-gold/5 rounded-sm rotate-[1.5deg] select-none shadow-md">
            ★ RESCUED & LOVED
          </span>
        </div>

        {/* Content Container */}
        <div className="absolute inset-0 z-10 flex items-end">
          <Container className="pb-10 md:pb-16 flex flex-col justify-end text-left h-full">
            <div className="max-w-3xl space-y-4 md:space-y-6">
              {/* Eyebrow */}
              <div className="text-hprh-gold text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                Foster-Based • No-Kill • Community Driven
              </div>
              
              {/* Headline */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-hprh-paper leading-tight font-display drop-shadow-sm">
                Warm, Loving Homes for Every Pet
              </h1>
              
              {/* Subhead */}
              <p className="text-sm sm:text-base md:text-lg text-hprh-paper/90 leading-relaxed font-sans max-w-2xl drop-shadow-sm">
                We are a dedicated network of local foster homes providing love, rehabilitation, and medical care to pets in transition while they wait to find their forever families.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-wrap gap-4 pt-2">
                <Link to="/adopt">
                  <Button variant="primary">Meet Our Pets</Button>
                </Link>
                <Link to="/volunteer">
                  <Button variant="secondary" className="!bg-hprh-sage/80 border-hprh-sage/80 hover:!bg-hprh-sage/95">Become a Foster</Button>
                </Link>
              </div>
            </div>
          </Container>
        </div>
      </section>

      {/* 1. Mission Statement + Stats Section */}
      <section className="bg-hprh-paper-dark py-20 md:py-24 border-b border-hprh-pine/5">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Mission + Stats */}
            <div className="lg:col-span-7 space-y-12">
              <div className="space-y-6">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-hprh-sage font-bold font-mono mb-2">
                  WHAT DRIVES US
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-hprh-pine leading-tight">
                  Our Mission
                </h2>
                <p className="text-base sm:text-lg leading-relaxed text-hprh-pine/80 font-sans max-w-xl">
                  Happy Paws Rescue Haven is a foster-based rescue network dedicated to rescuing vulnerable animals and preparing them for loving homes. Through our nurturing foster network, safe transport routes, spay/neuter assistance, and community education programs, we provide the care and support needed to ensure every pet finds a lifelong adoption match.
                </p>
              </div>
            </div>

            {/* Right Column: Scaled-up Polaroid Photo with standout stat card */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="relative bg-white p-5 pb-10 border border-hprh-pine/10 shadow-2xl rotate-[2deg] hover:rotate-0 transition-transform duration-500 w-full max-w-[380px]">
                {/* Polaroid photo frame */}
                <div className="aspect-square bg-hprh-paper border border-hprh-pine/5 overflow-hidden relative mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800"
                    alt="Curled up sleeping cat"
                    className="w-full h-full object-cover filter contrast-[1.02] sepia-[0.02]"
                  />
                  {/* Small decorative stamp */}
                  <div className="absolute top-2 right-2">
                    <span className="inline-block font-mono text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 border border-hprh-gold text-hprh-gold bg-hprh-gold/5 rounded-sm select-none shadow-sm">
                      COZY HAVEN
                    </span>
                  </div>
                </div>
                {/* Polaroid caption */}
                <div className="text-center lg:text-right lg:pr-6 font-display italic text-lg text-hprh-pine/80 tracking-wide mb-2">
                  Cozy afternoon nap...
                </div>
                
                {/* Standout Overlapping Stat Badge - Absolute on desktop, inline-relative on mobile */}
                <div className="lg:absolute lg:-left-12 lg:-bottom-6 relative left-0 bottom-0 mt-6 lg:mt-0 z-20 bg-hprh-paper border-2 border-hprh-clay/20 p-5 rounded-lg shadow-xl flex items-center gap-4 max-w-[240px] mx-auto lg:mx-0 rotate-[-1.5deg] hover:rotate-0 transition-all duration-300">
                  <div className="w-12 h-12 bg-hprh-clay/10 text-hprh-clay flex items-center justify-center rounded-full shrink-0 shadow-inner">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="block text-4xl font-extrabold font-display text-hprh-clay leading-none">22</span>
                    <span className="block text-[8px] uppercase tracking-widest text-hprh-pine/80 font-extrabold font-sans mt-1">Total Animals Adopted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Supporting Stats */}
          <div className="pt-12 border-t border-hprh-pine/10 mt-20">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
              {[
                { label: 'Dogs Adopted', value: '12', icon: PawPrint, bg: 'bg-hprh-paper border border-hprh-pine/10 text-hprh-pine' },
                { label: 'Cats Adopted', value: '8', icon: Cat, bg: 'bg-hprh-sage/10 border border-hprh-sage/25 text-hprh-sage' },
                { label: 'Pocket Pets Adopted', value: '2', icon: Rabbit, bg: 'bg-hprh-clay/10 border border-hprh-clay/25 text-hprh-clay' },
                { label: 'Foster Homes Active', value: '6', icon: HomeIcon, bg: 'bg-hprh-sage/10 border border-hprh-sage/25 text-hprh-sage' },
                { label: 'Animals in Transport Network', value: '4', icon: Truck, bg: 'bg-hprh-clay/10 border border-hprh-clay/25 text-hprh-clay' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className={`p-5 rounded-lg text-center flex flex-col items-center justify-between min-h-[130px] shadow-sm hover:shadow transition-shadow duration-200 ${stat.bg}`}
                  >
                    <Icon className="w-5 h-5 mb-2 opacity-85" />
                    <span className="block text-2xl sm:text-3xl font-extrabold font-display leading-none">
                      {stat.value}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-hprh-pine/70 font-bold leading-tight font-sans mt-2">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Custom Divider 1 */}
      <SectionDivider />

      {/* Asymmetric Editorial Pull-Quote Section */}
      <section className="bg-hprh-paper py-8">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            <div className="hidden md:block md:col-span-3 border-r-2 border-hprh-clay/25 pr-8 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-hprh-sage font-bold">
              Our Vow to Them
            </div>
            <div className="md:col-span-9 pl-0 md:pl-8">
              <p className="font-display italic text-2xl sm:text-3xl lg:text-4xl text-hprh-pine/90 leading-relaxed">
                “Every animal we welcome is not a case number, but a promise—a commitment to care, transport, and nurture them until they find the love they’ve always deserved.”
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Custom Divider 1.5 */}
      <SectionDivider />

      {/* 2. "Ways to Help" — Three-Path Action Section */}
      <section className="bg-hprh-paper py-20 md:py-24">
        <Container className="space-y-12">
          <div className="border-b border-hprh-pine/10 pb-4">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-hprh-sage font-bold font-mono mb-2">
              GETTING INVOLVED
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-hprh-pine mt-1 leading-tight">
              Save an Animal
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Path 1: Adopt */}
            <Card className="flex flex-col justify-between h-full space-y-6 text-center md:text-left border-t-4 border-t-hprh-clay hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-hprh-clay/10 text-hprh-clay flex items-center justify-center rounded-full mx-auto md:mx-0 shadow-inner">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display text-hprh-pine">Adopt</h3>
                <p className="text-sm text-hprh-pine/70 leading-relaxed font-sans">
                  Check out our adoptable pets and find your perfect match.
                </p>
              </div>
              <Link to="/adopt" className="block">
                <Button variant="primary" className="w-full">Meet Our Pets</Button>
              </Link>
            </Card>

            {/* Path 2: Donate */}
            <Card className="flex flex-col justify-between h-full space-y-6 text-center md:text-left border-t-4 border-t-hprh-gold hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-hprh-gold/10 text-hprh-gold flex items-center justify-center rounded-full mx-auto md:mx-0 shadow-inner">
                  <Coins className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display text-hprh-pine">Donate</h3>
                <p className="text-sm text-hprh-pine/70 leading-relaxed font-sans">
                  Every contribution helps animals in need get the care they deserve.
                </p>
              </div>
              <Link to="/donate" className="block">
                <Button variant="secondary" className="w-full !bg-hprh-gold hover:!bg-hprh-gold/95 !border-hprh-gold text-hprh-pine">Donate Today</Button>
              </Link>
            </Card>

            {/* Path 3: Volunteer */}
            <Card className="flex flex-col justify-between h-full space-y-6 text-center md:text-left border-t-4 border-t-hprh-sage hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-hprh-sage/10 text-hprh-sage flex items-center justify-center rounded-full mx-auto md:mx-0 shadow-inner">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display text-hprh-pine">Foster or Volunteer</h3>
                <p className="text-sm text-hprh-pine/70 leading-relaxed font-sans">
                  Our fosters and volunteers are the heart of this rescue. Get involved.
                </p>
              </div>
              <Link to="/volunteer" className="block">
                <Button variant="secondary" className="w-full">Join Our Team</Button>
              </Link>
            </Card>
          </div>
        </Container>
      </section>

      {/* Custom Divider 2 */}
      <SectionDivider />

      {/* 3. "Our Services" / "What We Do" Section */}
      <section className="bg-hprh-paper-dark py-20 md:py-24 border-t border-b border-hprh-pine/5">
        <Container className="space-y-12">
          <div className="border-b border-hprh-pine/10 pb-4">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-hprh-sage font-bold font-mono mb-2">
              WHAT WE DO
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-hprh-pine mt-1 leading-tight">
              How We Help
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: 4 Pillars (staggered stack) */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              {/* Pillar 1: Rescuing Pets (Highlighted Editorial Headline) */}
              <div className="bg-hprh-paper p-8 rounded-lg border-l-4 border-l-hprh-clay shadow-md hover:shadow-lg transition-shadow duration-300">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-hprh-clay font-bold mb-2">
                  Featured Vocation // Core Mission
                </span>
                <div className="flex gap-5 items-start">
                  <div className="w-16 h-16 bg-hprh-clay/10 text-hprh-clay flex items-center justify-center rounded-md shrink-0 shadow-inner">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-extrabold font-display text-hprh-pine leading-tight">Rescuing Pets</h4>
                    <p className="text-sm sm:text-base text-hprh-pine/80 leading-relaxed font-sans">
                      pulling animals from neglect, abuse, high-risk shelter situations, and owner surrenders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Supporting Pillars (Vertical Index List) */}
              <div className="space-y-4 pt-2">
                {/* Pillar 2: Foster Homes */}
                <div className="flex gap-4 items-start p-5 bg-hprh-paper/50 hover:bg-hprh-paper rounded-lg transition-all border border-transparent hover:border-hprh-pine/5 shadow-sm hover:shadow duration-200">
                  <div className="w-12 h-12 bg-hprh-sage/10 text-hprh-sage flex items-center justify-center rounded-md shrink-0">
                    <HomeIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-lg font-bold font-display text-hprh-pine">Foster Homes</h5>
                    <p className="text-xs sm:text-sm text-hprh-pine/70 leading-relaxed font-sans">
                      our foster network gives pets a warm home to decompress in before adoption.
                    </p>
                  </div>
                </div>

                {/* Pillar 3: Pet Transport */}
                <div className="flex gap-4 items-start p-5 bg-hprh-paper/50 hover:bg-hprh-paper rounded-lg transition-all border border-transparent hover:border-hprh-pine/5 shadow-sm hover:shadow duration-200">
                  <div className="w-12 h-12 bg-hprh-gold/10 text-hprh-gold flex items-center justify-center rounded-md shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-lg font-bold font-display text-hprh-pine">Pet Transport</h5>
                    <p className="text-xs sm:text-sm text-hprh-pine/70 leading-relaxed font-sans">
                      getting pets safely from rescue to foster to their forever home — a core differentiator of our active transport network.
                    </p>
                  </div>
                </div>

                {/* Pillar 4: Community & Education */}
                <div className="flex gap-4 items-start p-5 bg-hprh-paper/50 hover:bg-hprh-paper rounded-lg transition-all border border-transparent hover:border-hprh-pine/5 shadow-sm hover:shadow duration-200">
                  <div className="w-12 h-12 bg-hprh-pine/10 text-hprh-pine flex items-center justify-center rounded-md shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-lg font-bold font-display text-hprh-pine">Community & Education</h5>
                    <p className="text-xs sm:text-sm text-hprh-pine/70 leading-relaxed font-sans">
                      outreach, adoption education, responsible pet ownership.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Polaroid Volunteer Image */}
            <div className="lg:col-span-6 flex justify-center items-center">
              <div className="relative bg-white p-6 pb-12 border border-hprh-pine/10 shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500 w-full max-w-[440px]">
                {/* Polaroid photo frame */}
                <div className="aspect-[4/5] bg-hprh-paper border border-hprh-pine/5 overflow-hidden relative mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=800"
                    alt="Volunteer walking dogs"
                    className="w-full h-full object-cover filter contrast-[1.02] sepia-[0.02]"
                  />
                  {/* Small decorative stamp */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-block font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border border-hprh-sage text-hprh-sage bg-hprh-sage/5 rounded-sm select-none shadow-sm">
                      VOLUNTEER NETWORK
                    </span>
                  </div>
                </div>
                {/* Polaroid caption */}
                <div className="text-center font-display italic text-xl text-hprh-pine/80 tracking-wide">
                  Making strides together...
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default Home;
