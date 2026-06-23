import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Loader2, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Clock
} from 'lucide-react';

export const Contact: React.FC = () => {
  // Contact Info State (fetched dynamically)
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    address: ''
  });
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General');
  const [message, setMessage] = useState('');
  
  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch contact information from app_settings on mount
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoadingInfo(true);
        const { data, error: fetchError } = await supabase
          .from('app_settings')
          .select('*')
          .in('key', ['contact_phone', 'contact_email', 'contact_address']);

        if (fetchError) throw fetchError;

        const info = {
          phone: '+1 (XXX) XXX-XXXX',
          email: 'support@happypawsrescuehaven.com',
          address: 'Grand Rapids, MI 49503'
        };

        if (data) {
          data.forEach((row: any) => {
            if (row.key === 'contact_phone') info.phone = row.value;
            if (row.key === 'contact_email') info.email = row.value;
            if (row.key === 'contact_address') info.address = row.value;
          });
        }
        setContactInfo(info);
      } catch (err) {
        console.error('Error fetching contact info from settings:', err);
        // Fallback defaults in case of network/db issues
        setContactInfo({
          phone: '+1 (XXX) XXX-XXXX',
          email: 'support@happypawsrescuehaven.com',
          address: 'Grand Rapids, MI 49503'
        });
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchContactInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validations
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields (Name, Email, and Message).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Insert into database (contact_submissions) - WITHOUT .select() due to INSERT-only RLS policy
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert([
          {
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            subject: subject,
            message: message.trim()
          }
        ]);

      if (dbError) throw dbError;

      // 2. Trigger email notification via Edge Function (non-blocking if it fails, but we try)
      try {
        const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            type: 'contact_form_submission',
            submitterName: fullName.trim(),
            submitterEmail: email.trim(),
            message: message.trim(),
            subject: subject,
            phone: phone.trim() || undefined
          }
        });

        if (emailError) {
          console.error('Database insert succeeded, but email notification failed to send:', emailError);
        }
      } catch (emailErr) {
        console.error('Error triggering email notification:', emailErr);
      }

      // Show success
      setSubmitSuccess(true);
      
      // Reset form fields
      setFullName('');
      setEmail('');
      setPhone('');
      setSubject('General');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to submit contact form:', err);
      setError(err.message || 'Failed to submit message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-16 bg-hprh-paper min-h-[85vh] flex-grow flex items-center text-hprh-pine">
      <Container className="max-w-6xl space-y-12">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block">
            Rescue Correspondence
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold font-display text-hprh-pine">
            Contact Rescue Care
          </h1>
          <p className="text-sm font-sans text-hprh-pine/70 leading-relaxed">
            Have questions about our adoption process, volunteer programs, or a pet in our care? 
            Fill out the form below and our volunteer staff will get back to you as soon as possible.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 border border-hprh-pine/15 rounded-lg shadow-sm relative overflow-hidden">
            {submitSuccess ? (
              <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-hprh-sage/10 text-hprh-sage mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-display text-2xl font-bold text-hprh-pine">
                  Submission Received
                </h3>
                <p className="text-sm text-hprh-pine/70 max-w-md mx-auto leading-relaxed">
                  Thanks for reaching out! We'll get back to you soon.
                </p>
                <Button 
                  onClick={() => setSubmitSuccess(false)}
                  variant="ghost" 
                  className="font-mono font-bold"
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="font-display text-xl font-bold text-hprh-pine border-b border-hprh-pine/10 pb-3">
                  Submit a Message
                </h3>

                {error && (
                  <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
                    <div className="space-y-1">
                      <span className="font-mono uppercase font-bold text-hprh-clay block">Submission Error</span>
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Jane Doe"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={submitting}
                  />

                  <Input
                    label="Email Address *"
                    placeholder="e.g. jane@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number (Optional)"
                    placeholder="e.g. +1 (555) 019-2834"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />

                  <Select
                    label="Topic / Subject *"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={submitting}
                    options={[
                      { value: 'General Inquiry', label: 'General Inquiry' },
                      { value: 'Adoption Question', label: 'Adoption Question' },
                      { value: 'Volunteer Inquiry', label: 'Volunteer Inquiry' },
                      { value: 'Fostering Inquiry', label: 'Fostering Inquiry' }
                    ]}
                  />
                </div>

                <Textarea
                  label="Your Message *"
                  placeholder="Type your message details here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  disabled={submitting}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto font-mono uppercase tracking-wider py-3.5 px-8 flex items-center justify-center gap-2 shadow"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Contact Info Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Display Info Card */}
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-sage"></div>
              
              <h3 className="font-display text-xl font-bold text-hprh-pine border-b border-hprh-pine/10 pb-3">
                Rescue Contact Directory
              </h3>

              {loadingInfo ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2.5">
                  <Loader2 className="w-6 h-6 animate-spin text-hprh-sage" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hprh-pine/50">
                    Loading directory info...
                  </span>
                </div>
              ) : (
                <div className="space-y-5 font-sans text-sm">
                  {/* Phone Item */}
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 bg-white border border-hprh-pine/10 rounded-md shadow-sm text-hprh-sage flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-hprh-pine/40 font-bold block">
                        Phone Number
                      </span>
                      <span className="font-semibold text-hprh-pine block text-base">
                        {contactInfo.phone}
                      </span>
                    </div>
                  </div>

                  {/* Email Item */}
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 bg-white border border-hprh-pine/10 rounded-md shadow-sm text-hprh-sage flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-hprh-pine/40 font-bold block">
                        Email Support
                      </span>
                      <a 
                        href={`mailto:${contactInfo.email}`} 
                        className="font-semibold text-hprh-clay hover:underline block text-base break-all"
                      >
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>

                  {/* Address Item */}
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 bg-white border border-hprh-pine/10 rounded-md shadow-sm text-hprh-sage flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-hprh-pine/40 font-bold block">
                        Rescue Haven Location
                      </span>
                      <span className="font-semibold text-hprh-pine block text-base leading-relaxed">
                        {contactInfo.address}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Operating Hours Card */}
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-clay"></div>
              
              <div className="flex items-center gap-2 border-b border-hprh-pine/10 pb-3 text-hprh-pine">
                <Clock className="w-5 h-5 text-hprh-clay" />
                <h3 className="font-display text-base font-bold">
                  Volunteer Operations Hours
                </h3>
              </div>

              <div className="font-sans text-xs space-y-2 text-hprh-pine/70 leading-relaxed">
                <p>
                  Our shelter runs primarily on volunteer coordinators. Correspondence is monitored 
                  periodically throughout the day:
                </p>
                <div className="grid grid-cols-2 gap-y-1 font-mono text-[10px] pt-1">
                  <span className="font-bold text-hprh-pine">Mon – Fri:</span>
                  <span>9:00 AM – 5:00 PM EST</span>
                  <span className="font-bold text-hprh-pine">Sat – Sun:</span>
                  <span>10:00 AM – 2:00 PM EST</span>
                </div>
                <p className="text-[10px] italic pt-1 border-t border-hprh-pine/5">
                  Emergency notifications concerning active shipments or foster needs should be directed to coordinates on file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Contact;
