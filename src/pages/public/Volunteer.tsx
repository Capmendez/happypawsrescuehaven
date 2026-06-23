import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import supabase from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Upload, FileText, Heart, ShieldCheck, Clock } from 'lucide-react';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
  roleInterest: z.enum(['FOSTER', 'VOLUNTEER', 'BOTH']),
  experienceDetails: z.string().min(10, 'Please describe your experience (min 10 characters)'),
  availability: z.string().min(5, 'Please specify your availability'),
  hasOtherPets: z.boolean(),
  housingType: z.string().optional(),
  ageConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm that you are at least 18 years old',
  }),
});

type FormValues = z.infer<typeof schema>;

export const Volunteer: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedIdFile, setSelectedIdFile] = useState<File | null>(null);
  const [idFileError, setIdFileError] = useState<string | null>(null);
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (idPreviewUrl) {
        URL.revokeObjectURL(idPreviewUrl);
      }
    };
  }, [idPreviewUrl]);

  const handleClearIdFile = () => {
    setSelectedIdFile(null);
    setIdFileError(null);
    if (idPreviewUrl) {
      URL.revokeObjectURL(idPreviewUrl);
      setIdPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIdFileError(null);

    if (idPreviewUrl) {
      URL.revokeObjectURL(idPreviewUrl);
      setIdPreviewUrl(null);
    }

    if (!file) {
      setSelectedIdFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIdFileError('File size must be less than 5MB');
      setSelectedIdFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      setIdFileError('Unsupported file format. Please upload JPG, PNG, HEIC, or PDF.');
      setSelectedIdFile(null);
      return;
    }

    setSelectedIdFile(file);

    if (file.type.startsWith('image/') && fileExtension !== 'heic') {
      try {
        const url = URL.createObjectURL(file);
        setIdPreviewUrl(url);
      } catch (err) {
        console.error('Failed to create object URL:', err);
      }
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      hasOtherPets: false,
      roleInterest: 'BOTH',
      ageConfirmed: false,
      housingType: 'House',
    },
  });

  const roleInterestVal = watch('roleInterest');

  const onSubmit = async (values: FormValues) => {
    if (!selectedIdFile) {
      setIdFileError('Government-issued ID document is required.');
      setSubmitError('Please upload a valid government-issued ID to complete your application.');
      return;
    }

    if (idFileError) {
      setSubmitError('Please resolve the file upload errors before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Validate data with Zod schema
      const validated = schema.parse(values);

      // Upload file to Supabase storage bucket 'adopter-ids'
      const fileExt = selectedIdFile.name.split('.').pop()?.toLowerCase();
      const randomUuid = crypto.randomUUID();
      const timestamp = Date.now();
      const storagePath = `foster-volunteer-ids/${randomUuid}/${timestamp}-id.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('adopter-ids')
        .upload(storagePath, selectedIdFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('File upload failed:', uploadError);
        throw new Error(`Failed to upload ID document: ${uploadError.message}`);
      }

      // Build payload for DB insertion
      const applicationPayload = {
        full_name: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        address: validated.address || null,
        role_interest: validated.roleInterest,
        experience_details: validated.experienceDetails,
        availability: validated.availability,
        has_other_pets: validated.hasOtherPets,
        housing_type: validated.housingType || null,
        id_document_url: uploadData.path,
        age_confirmed: validated.ageConfirmed,
        status: 'SUBMITTED',
      };

      const { error: dbError } = await supabase
        .from('foster_volunteer_applications')
        .insert(applicationPayload);

      if (dbError) {
        console.error('Database insertion failed:', dbError);
        // Attempt cleanup of uploaded file
        await supabase.storage.from('adopter-ids').remove([storagePath]);
        throw dbError;
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setSubmitError(err.message || 'An unexpected error occurred during submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="py-20 bg-hprh-paper flex-grow flex items-center justify-center">
        <Container maxW="md" className="space-y-8 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-hprh-sage/20 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-hprh-sage/10 text-hprh-sage flex items-center justify-center rounded-full">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold font-display text-hprh-pine">
              Application Submitted!
            </h1>
            <p className="text-hprh-clay text-sm">
              Thank you for applying to be a part of Happy Paws Rescue Haven. Your application has been successfully received and placed in our review queue.
            </p>
            <div className="bg-hprh-sage/5 border border-hprh-sage/20 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-hprh-sage mt-0.5 shrink-0" />
                <div className="text-xs text-hprh-pine">
                  <span className="font-semibold block">Step 1: Application Review</span>
                  Our staff will review your background and check your submitted government ID.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-hprh-sage mt-0.5 shrink-0" />
                <div className="text-xs text-hprh-pine">
                  <span className="font-semibold block">Step 2: Assignment & Logistics</span>
                  Once approved, we will assign a pet to foster (if applicable) and notify you with steps to arrange pickup or transport.
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Link to="/adopt">
                <Button variant="primary" className="w-full">
                  Browse Available Pets
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper flex-grow">
      <Container maxW="xl" className="space-y-8">
        {/* Back Link */}
        <div className="flex items-center">
          <Link to="/adopt" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-hprh-clay hover:text-hprh-pine transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Available Pets
          </Link>
        </div>

        {/* Intro */}
        <div className="text-center space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-hprh-sage">
            Happy Paws Rescue Haven
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-display text-hprh-pine">
            Foster & Volunteer Application
          </h1>
          <p className="text-hprh-clay text-sm max-w-lg mx-auto">
            Become a lifeline for pets in transition. Whether you can open your home as a foster parent, or volunteer your time at our hub, we need your help.
          </p>
        </div>

        {/* Main Card Form */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-10 border border-hprh-sage/20 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {submitError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>{submitError}</div>
              </div>
            )}

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Full Name"
                  id="fullName"
                  placeholder="John Doe"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
              </div>
              <div>
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Phone Number"
                  id="phone"
                  placeholder="(555) 000-0000"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
              <div>
                <Select
                  label="Role Interest"
                  id="roleInterest"
                  error={errors.roleInterest?.message}
                  {...register('roleInterest')}
                >
                  <option value="BOTH">Both Fostering & Volunteering</option>
                  <option value="FOSTER">Fostering Only</option>
                  <option value="VOLUNTEER">Volunteering Only</option>
                </Select>
              </div>
            </div>

            {/* Address (Optional) */}
            <div>
              <Input
                label="Home Address (Optional, required for fosters)"
                id="address"
                placeholder="123 Main St, Detroit, MI 48201"
                error={errors.address?.message}
                {...register('address')}
              />
            </div>

            {/* Housing Type (Only visible/relevant for fosters/both) */}
            {(roleInterestVal === 'FOSTER' || roleInterestVal === 'BOTH') && (
              <div>
                <Select
                  label="Housing Type"
                  id="housingType"
                  error={errors.housingType?.message}
                  {...register('housingType')}
                >
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Condo">Condo</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            )}

            {/* Experience */}
            <div>
              <Textarea
                label="Experience Details"
                id="experienceDetails"
                placeholder="Please describe your experience with pets, animal care, or previous volunteer work..."
                error={errors.experienceDetails?.message}
                {...register('experienceDetails')}
              />
            </div>

            {/* Availability */}
            <div>
              <Input
                label="Availability"
                id="availability"
                placeholder="e.g. Weekends, weekday evenings, flexible..."
                error={errors.availability?.message}
                {...register('availability')}
              />
            </div>

            {/* Has Other Pets Toggle */}
            <div className="flex items-center gap-3 bg-hprh-paper/50 p-4 rounded-xl border border-hprh-sage/10">
              <input
                type="checkbox"
                id="hasOtherPets"
                className="w-4.5 h-4.5 rounded border-hprh-sage/30 text-hprh-sage focus:ring-hprh-sage"
                {...register('hasOtherPets')}
              />
              <label htmlFor="hasOtherPets" className="text-sm font-medium text-hprh-pine cursor-pointer select-none">
                I currently have other pets in my household
              </label>
            </div>

            {/* ID Document Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-hprh-pine">
                Government-Issued Photo ID <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-hprh-clay">
                We require a valid ID to verify identity and age for all applications. Allowed formats: JPG, PNG, HEIC, or PDF. Max size: 5MB.
              </p>

              {!selectedIdFile ? (
                <div className="border-2 border-dashed border-hprh-sage/30 hover:border-hprh-sage/60 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-hprh-paper/20">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/heic,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-hprh-clay mx-auto" />
                    <div className="text-xs font-medium text-hprh-pine">
                      Click to upload ID document
                    </div>
                    <div className="text-[10px] text-hprh-clay">
                      Drag and drop files here
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-6 h-6 text-hprh-sage shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-hprh-pine truncate">
                        {selectedIdFile.name}
                      </div>
                      <div className="text-[10px] text-hprh-clay">
                        {(selectedIdFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearIdFile}
                    className="text-xs font-mono uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

              {idPreviewUrl && (
                <div className="border border-hprh-sage/10 rounded-xl p-2 bg-white max-w-xs overflow-hidden shadow-inner">
                  <img src={idPreviewUrl} alt="ID Preview" className="max-h-36 rounded mx-auto object-contain" />
                </div>
              )}

              {idFileError && (
                <div className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {idFileError}
                </div>
              )}
            </div>

            {/* Age Confirmation Checkbox */}
            <div className="space-y-1">
              <div className="flex items-start gap-3 bg-hprh-paper/50 p-4 rounded-xl border border-hprh-sage/10">
                <input
                  type="checkbox"
                  id="ageConfirmed"
                  className="w-4.5 h-4.5 rounded border-hprh-sage/30 text-hprh-sage focus:ring-hprh-sage mt-0.5"
                  {...register('ageConfirmed')}
                />
                <label htmlFor="ageConfirmed" className="text-xs text-hprh-pine cursor-pointer select-none leading-relaxed">
                  <span className="font-semibold text-sm block mb-0.5">Age & Accuracy Declaration</span>
                  I confirm that I am at least 18 years of age and that all information provided in this application is true and accurate.
                </label>
              </div>
              {errors.ageConfirmed && (
                <div className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errors.ageConfirmed.message}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 border-t border-hprh-sage/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 text-hprh-clay">
                <ShieldCheck className="w-5 h-5 text-hprh-sage" />
                <span className="text-[11px] font-medium leading-tight">
                  Your identity documents are securely stored and accessible only to authorized administrators.
                </span>
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-8 min-w-[160px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default Volunteer;
