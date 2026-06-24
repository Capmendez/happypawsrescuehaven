import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import { Shield, Award, Loader2, PawPrint } from 'lucide-react';

// Custom inline SVG brand icons to match Lucide's design language
const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const FacebookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export const About: React.FC = () => {
  const [socials, setSocials] = useState({
    tiktok: '',
    facebook: '',
    instagram: '',
    x: ''
  });
  const [loadingSocials, setLoadingSocials] = useState(true);

  useEffect(() => {
    const fetchSocialSettings = async () => {
      try {
        setLoadingSocials(true);
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .in('key', ['social_tiktok', 'social_facebook', 'social_instagram', 'social_x']);

        if (error) throw error;

        const fetchedSocials = {
          tiktok: '',
          facebook: '',
          instagram: '',
          x: ''
        };

        if (data) {
          data.forEach((row: any) => {
            if (row.key === 'social_tiktok') fetchedSocials.tiktok = row.value || '';
            if (row.key === 'social_facebook') fetchedSocials.facebook = row.value || '';
            if (row.key === 'social_instagram') fetchedSocials.instagram = row.value || '';
            if (row.key === 'social_x') fetchedSocials.x = row.value || '';
          });
        }
        setSocials(fetchedSocials);
      } catch (err) {
        console.error('Error fetching social links:', err);
      } finally {
        setLoadingSocials(false);
      }
    };

    fetchSocialSettings();
  }, []);

  // Determine which socials are populated and should be rendered
  const activeSocialLinks = [
    { name: 'TikTok', url: socials.tiktok, icon: TikTokIcon, color: 'hover:text-hprh-clay hover:bg-hprh-clay/10' },
    { name: 'Facebook', url: socials.facebook, icon: FacebookIcon, color: 'hover:text-hprh-pine hover:bg-hprh-pine/10' },
    { name: 'Instagram', url: socials.instagram, icon: InstagramIcon, color: 'hover:text-pink-600 hover:bg-pink-50' },
    { name: 'X (Twitter)', url: socials.x, icon: XIcon, color: 'hover:text-slate-900 hover:bg-slate-100' }
  ].filter(link => link.url && link.url.trim() !== '');

  return (
    <div className="py-16 bg-hprh-paper min-h-screen text-hprh-pine font-sans flex flex-col justify-between">
      <Container className="space-y-16 flex-grow">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold">
            <PawPrint className="w-4 h-4" />
            <span>Our Heritage & Dedication</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold font-display text-hprh-pine leading-tight">
            About Our Haven
          </h1>

          {/* Tasteful Established Badge */}
          <div className="pt-2">
            <span className="inline-block font-mono text-xs font-bold uppercase tracking-widest px-4 py-2 border border-hprh-pine/20 text-hprh-pine/70 bg-hprh-paper-dark rounded select-none shadow-sm">
              Established December 4, 2015
            </span>
          </div>
        </div>

        {/* Narrative & Visual Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
          {/* Narrative Text Column */}
          <div className="lg:col-span-7 space-y-6 text-sm sm:text-base leading-relaxed text-hprh-pine/80 font-sans">
            <p className="font-medium text-lg leading-relaxed text-hprh-pine">
              Founded on December 4, 2015, Happy Paws Rescue Haven is dedicated to
              giving homeless, abandoned, neglected, and at-risk animals a second
              chance at life. What began as a passion for helping vulnerable
              animals has grown into a mission-driven rescue organization focused
              on saving lives and creating lasting connections between pets and
              loving families.
            </p>

            <p>
              At Happy Paws Rescue Haven, we believe that every animal deserves
              compassion, safety, and the opportunity to thrive. Through rescue
              efforts, foster placement support, adoption coordination, and
              community outreach, we work tirelessly to help animals find the
              caring homes they deserve.
            </p>

            <p>
              Our commitment extends beyond rescue. We strive to educate
              communities about responsible pet ownership, promote animal welfare,
              and advocate for the humane treatment of all animals. Every adoption
              represents a new beginning, and every life saved reinforces our
              dedication to making a meaningful difference.
            </p>

            <p>
              Since our founding, we have helped countless animals on their journey
              from uncertainty to security, thanks to the support of adopters,
              fosters, volunteers, and animal lovers who share our vision.
            </p>

            <p>
              Whether you're looking to adopt, foster, volunteer, or support our
              mission, we welcome you to become part of the Happy Paws Rescue Haven
              family. Together, we can continue creating brighter futures for
              animals in need — one paw at a time.
            </p>
          </div>

          {/* Polaroid Image Column */}
          <div className="lg:col-span-5 flex justify-center items-center pt-4 lg:pt-0">
            <div className="relative bg-white p-5 pb-10 border border-hprh-pine/10 shadow-2xl rotate-[-2deg] hover:rotate-0 transition-all duration-500 w-full max-w-[380px]">
              {/* Polaroid photo frame */}
              <div className="aspect-[4/3] bg-hprh-paper border border-hprh-pine/5 overflow-hidden relative mb-4">
                <img
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800"
                  alt="Happy rescue dogs cuddling"
                  className="w-full h-full object-cover filter contrast-[1.02] sepia-[0.02]"
                />
                <div className="absolute top-2 right-2">
                  <span className="inline-block font-mono text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 border border-hprh-gold text-hprh-gold bg-hprh-gold/5 rounded-sm select-none shadow-sm">
                    FAMILY FIRST
                  </span>
                </div>
              </div>
              {/* Polaroid caption */}
              <div className="text-center font-display italic text-lg text-hprh-pine/80 tracking-wide">
                A second chance at life...
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision Section (Distinct Highlighted Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-4">
          {/* Mission Card */}
          <div className="bg-hprh-paper-dark border-l-4 border-l-hprh-sage border border-hprh-pine/10 rounded-xl p-8 space-y-4 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 text-hprh-sage">
              <div className="w-10 h-10 rounded-full bg-hprh-sage/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-hprh-pine">Our Mission</h3>
            </div>
            <p className="text-sm leading-relaxed text-hprh-pine/80 font-sans">
              To rescue, rehabilitate, and rehome animals in need while promoting
              compassion, responsible pet ownership, and lifelong human-animal
              bonds.
            </p>
          </div>

          {/* Vision Card */}
          <div className="bg-hprh-paper-dark border-l-4 border-l-hprh-clay border border-hprh-pine/10 rounded-xl p-8 space-y-4 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 text-hprh-clay">
              <div className="w-10 h-10 rounded-full bg-hprh-clay/10 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-hprh-pine">Our Vision</h3>
            </div>
            <p className="text-sm leading-relaxed text-hprh-pine/80 font-sans">
              A world where every animal is valued, protected, and loved in a safe
              and permanent home. 🐾
            </p>
          </div>
        </div>

        {/* Social Media Links Section */}
        <div className="border-t border-hprh-pine/10 pt-10 text-center max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold">
              Stay Connected
            </span>
            <h3 className="font-display text-2xl font-bold text-hprh-pine">
              Follow Our Rescue Journey
            </h3>
          </div>

          {loadingSocials ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-hprh-sage" />
            </div>
          ) : activeSocialLinks.length === 0 ? (
            <p className="text-xs text-hprh-pine/40 font-mono italic">
              Social platforms coordinates coming soon.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {activeSocialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hprh-pine/15 font-mono text-xs font-bold text-hprh-pine/80 transition-all shadow-sm ${social.color}`}
                    title={`Follow us on ${social.name}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{social.name}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default About;
