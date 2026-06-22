import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import supabase from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Upload, FileText } from 'lucide-react';

// Zod Validation Schema
const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(6, 'Phone number must be at least 6 characters'),
  address: z.string().min(5, 'Please enter your complete address'),
  housingType: z.enum(['House', 'Apartment', 'Condo', 'Other']),
  hasOtherPets: z.boolean(),
  experienceDetails: z.string().min(10, 'Please describe your pet care experience (min 10 characters)'),
  ageConfirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm that you are at least 18 years old',
  }),
});

type FormValues = z.infer<typeof schema>;

export const AdoptApply: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<{ name: string; status: string } | null>(null);
  const [loadingPet, setLoadingPet] = useState(true);
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

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setIdFileError('File size must be less than 5MB');
      setSelectedIdFile(null);
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      setIdFileError('Unsupported file format. Please upload JPG, PNG, HEIC, or PDF.');
      setSelectedIdFile(null);
      return;
    }

    setSelectedIdFile(file);

    // Image preview
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      hasOtherPets: false,
      housingType: 'House',
      ageConfirmed: false,
    },
  });

  const hasOtherPetsVal = watch('hasOtherPets');

  useEffect(() => {
    const fetchPet = async () => {
      if (!id) return;
      try {
        setLoadingPet(true);
        const { data, error } = await supabase
          .from('pets')
          .select('name, status')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPet(data);
      } catch (err: any) {
        console.error('Error fetching pet for application:', err);
        setSubmitError('Failed to load pet details. Please check the URL.');
      } finally {
        setLoadingPet(false);
      }
    };

    fetchPet();
  }, [id]);

  const onSubmit = async (values: FormValues) => {
    if (!id || !pet) return;
    
    // Prevent applying if pet is not available
    if (pet.status.toUpperCase() !== 'AVAILABLE') {
      setSubmitError('This pet is no longer available for adoption.');
      return;
    }

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
      const storagePath = `${randomUuid}/${timestamp}-id.${fileExt}`;

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('adopter-ids')
        .upload(storagePath, selectedIdFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload ID document: ${uploadError.message}`);
      }

      // Step 1: Insert into public.adopters
      const { data: adopterData, error: adopterError } = await supabase
        .from('adopters')
        .insert([
          {
            full_name: validated.fullName,
            email: validated.email,
            phone: validated.phone,
            address: validated.address,
            id_document_url: storagePath,
            age_confirmed: validated.ageConfirmed,
            user_id: null, // Anonymous submit
          }
        ])
        .select('id')
        .single();

      if (adopterError) {
        // Clean up the uploaded storage file if adopter insert fails
        await supabase.storage.from('adopter-ids').remove([storagePath]);

        if (adopterError.code === '23505') {
          throw new Error('This email address is already associated with an application. Please use a different email address.');
        }
        throw adopterError;
      }

      const confirmedAdopterId = adopterData.id;

      // Step 2: Insert into public.adoption_applications
      const { error: appError } = await supabase
        .from('adoption_applications')
        .insert([
          {
            pet_id: id,
            adopter_id: confirmedAdopterId,
            status: 'PENDING',
            housing_type: validated.housingType,
            has_other_pets: validated.hasOtherPets,
            experience_details: validated.experienceDetails,
          }
        ]);

      if (appError) {
        // Clean up the uploaded storage file
        await supabase.storage.from('adopter-ids').remove([storagePath]);
        throw appError;
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPet) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Fetching Kennel Registry...</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="py-16 md:py-24 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-xl mx-auto">
          <div
            className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded p-8 shadow-lg text-center space-y-6 relative overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Top folder line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
            
            <div className="inline-flex p-4 bg-hprh-sage/15 text-hprh-sage rounded-full rotate-[-2deg]">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold bg-hprh-sage/5 border border-hprh-sage/20 px-3 py-1 rounded select-none inline-block rotate-[1deg]">
                Application Received
              </span>
              <h2 className="font-display text-3xl font-extrabold text-hprh-pine mt-2">Dossier Registered Successfully</h2>
            </div>

            <p className="text-sm font-sans text-hprh-pine/80 leading-relaxed max-w-md mx-auto">
              Thank you! Your application for <span className="font-bold text-hprh-sage">{pet?.name}</span> has been received. Our team will review your case details and reach out within 3 to 5 business days.
            </p>

            <div className="border-t border-dashed border-hprh-pine/15 pt-6 flex flex-col gap-3">
              <Link
                to="/adopt"
                className="w-full bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-xs font-mono font-bold py-3 px-6 rounded uppercase tracking-wider block transition-colors text-center"
              >
                Return to Kennel Cases
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const housingOptions = [
    { value: 'House', label: 'Single Family House' },
    { value: 'Apartment', label: 'Apartment' },
    { value: 'Condo', label: 'Condominium' },
    { value: 'Other', label: 'Other / Shared Housing' },
  ];

  return (
    <div className="py-12 md:py-20 bg-hprh-paper min-h-screen text-hprh-pine">
      <Container className="max-w-2xl space-y-6">
        <div>
          <Link
            to={`/adopt/${id}`}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage hover:text-hprh-sage/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Back to Case File
          </Link>
        </div>

        {/* Dossier Application Form container */}
        <div
          className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-md p-6 md:p-8 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Top folder line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-clay/40"></div>

          {/* Form Header */}
          <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 mb-6 text-center sm:text-left">
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block mb-1">
              HPRH Intake Questionnaire
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-hprh-pine">
              Application for {pet?.name}
            </h2>
            <p className="text-xs text-hprh-pine/50 font-sans mt-1">
              Please complete all sections of this form. All information is confidential and will be assessed by rescue directors.
            </p>
          </div>

          {submitError && (
            <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-mono uppercase font-bold text-hprh-clay block">Submission Blocked</span>
                <p className="leading-relaxed">{submitError}</p>
              </div>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Adopter Contact Details */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                01. Contact Dossier
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. John Doe"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
                
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. john@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Phone Number"
                  placeholder="e.g. +234 803 123 4567"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                
                <Input
                  label="Home Address"
                  placeholder="e.g. 12 Adetokunbo Ademola St, Victoria Island, Lagos"
                  error={errors.address?.message}
                  {...register('address')}
                />
              </div>
            </div>

            {/* Section 2: ID Verification */}
            <div className="space-y-4 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                02. Government ID Verification
              </h3>
              
              <p className="text-xs text-hprh-pine/60 leading-relaxed font-sans -mt-1.5">
                This helps us verify you're a real person and keeps our adoption process safe. Your ID is reviewed by our team only and is never shared publicly.
              </p>

              {/* File Dropzone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                  Government ID (Driver's License, Passport, or State ID) *
                </label>
                
                <div className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-colors ${
                  selectedIdFile 
                    ? 'border-hprh-sage/50 bg-hprh-sage/5' 
                    : idFileError 
                    ? 'border-hprh-clay/40 bg-hprh-clay/5'
                    : 'border-hprh-pine/15 hover:border-hprh-sage/30 bg-hprh-paper'
                }`}>
                  {selectedIdFile ? (
                    <div className="text-center space-y-2">
                      {idPreviewUrl ? (
                        <div className="w-20 h-20 bg-white border border-hprh-pine/10 rounded overflow-hidden mx-auto shadow-sm flex items-center justify-center p-0.5 animate-in fade-in duration-200">
                          <img src={idPreviewUrl} alt="ID Document preview" className="w-full h-full object-cover rounded-sm" />
                        </div>
                      ) : (
                        <FileText className="w-8 h-8 text-hprh-sage mx-auto" />
                      )}
                      <span className="text-xs font-mono font-bold text-hprh-sage block truncate max-w-[250px] mx-auto">
                        {selectedIdFile.name}
                      </span>
                      <span className="text-[9px] text-hprh-pine/50 block font-mono">
                        {(selectedIdFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={handleClearIdFile}
                        className="text-[9px] uppercase font-mono tracking-widest font-bold text-hprh-clay hover:underline block mx-auto mt-1"
                      >
                        Clear Selection
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 cursor-pointer relative">
                      <Upload className="w-8 h-8 text-hprh-pine/30 mx-auto" />
                      <span className="text-xs font-bold text-hprh-pine block">Choose government ID / PDF</span>
                      <span className="text-[9px] text-hprh-pine/40 block">PNG, JPG, HEIC, PDF. Max 5MB.</span>
                      
                      <label className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg, image/heic, application/pdf"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                    </div>
                  )}
                </div>

                {idFileError && (
                  <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold pl-1">
                    {idFileError}
                  </span>
                )}
              </div>
            </div>

            {/* Section 3: Housing & Lifestyle */}
            <div className="space-y-4 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                03. Home & Environment
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <Select
                  label="Housing Structure"
                  options={housingOptions}
                  error={errors.housingType?.message}
                  {...register('housingType')}
                />

                {/* Has Other Pets Toggle */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                    Do you currently own other pets?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('hasOtherPets', true)}
                      className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors ${
                        hasOtherPetsVal 
                          ? 'bg-hprh-sage text-hprh-paper border-hprh-sage' 
                          : 'bg-hprh-paper border-hprh-pine/15 text-hprh-pine/60 hover:border-hprh-pine/30'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('hasOtherPets', false)}
                      className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors ${
                        !hasOtherPetsVal 
                          ? 'bg-hprh-sage text-hprh-paper border-hprh-sage' 
                          : 'bg-hprh-paper border-hprh-pine/15 text-hprh-pine/60 hover:border-hprh-pine/30'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Care Assessment Details */}
            <div className="space-y-4 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                04. Experience & Care Assessment
              </h3>
              
              <Textarea
                label="Assessment Details"
                placeholder="Please describe your experience with pets, details of other animals in your home, and why you are interested in adopting this specific pet..."
                error={errors.experienceDetails?.message}
                {...register('experienceDetails')}
              />
              <span className="text-[10px] text-hprh-pine/50 uppercase tracking-wide font-semibold block -mt-1.5 pl-1">
                Provide details regarding daily routines, exercise plans, and home safety features.
              </span>
            </div>

            {/* Age Confirmation Checkbox */}
            <div className="pt-2 flex flex-col gap-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs font-bold text-hprh-pine">
                <input
                  type="checkbox"
                  {...register('ageConfirmed')}
                  className="w-4 h-4 mt-0.5 accent-hprh-sage rounded border-hprh-pine/20 text-hprh-sage focus:ring-hprh-sage/30"
                />
                <span className="leading-relaxed font-sans">I confirm that I am at least 18 years old. *</span>
              </label>
              {errors.ageConfirmed && (
                <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold pl-7">
                  {errors.ageConfirmed.message}
                </span>
              )}
            </div>

            {/* Form Actions */}
            <div className="border-t border-dashed border-hprh-pine/15 pt-6 flex flex-col sm:flex-row items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || pet?.status.toUpperCase() !== 'AVAILABLE'}
                className="w-full sm:w-auto px-8 py-3.5 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering Case File...
                  </>
                ) : (
                  'Submit Application Questionnaire'
                )}
              </Button>
              
              <span className="text-[10px] font-mono text-hprh-pine/40 text-center sm:text-left leading-relaxed">
                By submitting, you authorize HPRH directors to contact your veterinary clinic and landlord if applicable.
              </span>
            </div>

          </form>
        </div>
      </Container>
    </div>
  );
};

export default AdoptApply;
