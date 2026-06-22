import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { 
  ArrowLeft, 
  Loader2, 
  Upload, 
  Trash,
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';

// Form validation schema
const petSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  species: z.string().min(1, 'Please select a species'),
  breed: z.string().optional().nullable(),
  age_years: z.coerce.number().min(0, 'Age must be 0 or greater'),
  sex: z.enum(['male', 'female', 'unknown']),
  size: z.enum(['small', 'medium', 'large', 'extra_large']),
  status: z.enum(['AVAILABLE', 'PENDING', 'ADOPTED', 'MEDICAL_HOLD', 'NOT_LISTED']),
  story: z.string().min(10, 'Story must be at least 10 characters'),
  foster_notes: z.string().optional().nullable(),
  adoption_fee: z.coerce.number().min(0, 'Adoption fee must be 0 or greater'),
  currency: z.string().default('USD'),
  good_with_kids: z.boolean().default(false),
  good_with_dogs: z.boolean().default(false),
  good_with_cats: z.boolean().default(false),
  vaccinated: z.boolean().default(false),
  spayed_neutered: z.boolean().default(false),
  microchipped: z.boolean().default(false),
  current_location: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof petSchema>;

export const AdminPetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [fetchingPet, setFetchingPet] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Storage / Photos state
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Coordinate and Geocoding state
  const [originLatitude, setOriginLatitude] = useState<number | null>(null);
  const [originLongitude, setOriginLongitude] = useState<number | null>(null);
  const [geocodeVerified, setGeocodeVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      species: 'dog',
      sex: 'male',
      size: 'medium',
      status: 'AVAILABLE',
      currency: 'USD',
      good_with_kids: false,
      good_with_dogs: false,
      good_with_cats: false,
      vaccinated: false,
      spayed_neutered: false,
      microchipped: false,
    },
  });

  // Fetch pet details if in Edit Mode
  useEffect(() => {
    const fetchPet = async () => {
      if (!isEditMode || !id) return;
      try {
        setFetchingPet(true);
        setErrorMsg(null);

        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          // Reset form values with database state
          reset({
            name: data.name,
            species: data.species,
            breed: data.breed,
            age_years: data.age_years || 0,
            sex: data.sex || 'unknown',
            size: data.size || 'medium',
            status: data.status,
            story: data.description || '', // Mapping old description field to story input
            foster_notes: data.foster_notes || '',
            adoption_fee: data.adoption_fee || 0,
            currency: data.currency || 'USD',
            good_with_kids: data.good_with_kids || false,
            good_with_dogs: data.good_with_dogs || false,
            good_with_cats: data.good_with_cats || false,
            vaccinated: data.vaccinated || false,
            spayed_neutered: data.spayed_neutered || false,
            microchipped: data.microchipped || false,
            current_location: data.current_location || '',
          });

          // Set existing photos
          setPhotos(data.photos || []);

          if (data.origin_latitude !== null && data.origin_longitude !== null) {
            setOriginLatitude(data.origin_latitude);
            setOriginLongitude(data.origin_longitude);
            setGeocodeVerified(true);
            setVerifiedAddress(data.current_location);
          } else {
            setOriginLatitude(null);
            setOriginLongitude(null);
            setGeocodeVerified(false);
            setVerifiedAddress(null);
          }
        }
      } catch (err: any) {
        console.error('Error fetching pet for edit:', err);
        setErrorMsg(err.message || 'Failed to retrieve pet record details.');
      } finally {
        setFetchingPet(false);
      }
    };

    fetchPet();
  }, [id, isEditMode, reset]);

  // Ensure Supabase Storage bucket 'pet-photos' exists (public access)
  const ensureBucketExists = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === 'pet-photos');
      
      if (!exists) {
        // Try creating bucket
        const { error } = await supabase.storage.createBucket('pet-photos', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880, // 5MB
        });
        if (error) {
          console.warn('Bucket creation warning (expected if user is not superadmin):', error.message);
        }
      }
    } catch (e) {
      console.error('Error checking storage bucket:', e);
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setErrorMsg(null);

      // Verify bucket exists
      await ensureBucketExists();

      // Upload file to bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `pets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(filePath);

      setPhotos(prev => [...prev, publicUrl]);
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setErrorMsg('Photo upload failed: ' + (err.message || 'Check storage configurations.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper: Format age text fallback
  const formatAgeText = (years: number) => {
    if (years === 1) return '1 year';
    if (years < 1) {
      const months = Math.round(years * 12);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    const wholeYears = Math.floor(years);
    const months = Math.round((years - wholeYears) * 12);
    if (months === 0) {
      return `${wholeYears} ${wholeYears === 1 ? 'year' : 'years'}`;
    }
    return `${wholeYears} ${wholeYears === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`;
  };

  const handleGeocode = async () => {
    const locationVal = getValues('current_location');
    if (!locationVal || !locationVal.trim()) {
      setGeocodeError('Please enter a location address first.');
      return;
    }

    try {
      setGeocoding(true);
      setGeocodeError(null);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: locationVal }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOriginLatitude(data.latitude);
      setOriginLongitude(data.longitude);
      setVerifiedAddress(data.formattedAddress);
      setValue('current_location', data.formattedAddress);
      setGeocodeVerified(true);
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setGeocodeError(err.message || 'Geocoding failed. Please verify the address.');
      setGeocodeVerified(false);
    } finally {
      setGeocoding(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (values.current_location && values.current_location.trim()) {
      if (!geocodeVerified || !originLatitude || !originLongitude) {
        setGeocodeError('You must successfully verify the coordinates for this location before saving.');
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Formulate Fallback Text representations
      const textAge = formatAgeText(values.age_years);
      const genderCapitalized = values.sex.replace(/^\w/, (c) => c.toUpperCase());
      const firstPhotoUrl = photos.length > 0 ? photos[0] : null;

      // Payload mapping for DB columns (syncing old and new schema fields)
      const petPayload: any = {
        name: values.name,
        species: values.species.toLowerCase(),
        breed: values.breed || null,
        status: values.status,
        description: values.story, // description maps to story
        foster_notes: values.foster_notes || null,
        adoption_fee: values.adoption_fee,
        currency: values.currency,
        good_with_kids: values.good_with_kids,
        good_with_dogs: values.good_with_dogs,
        good_with_cats: values.good_with_cats,
        vaccinated: values.vaccinated,
        spayed_neutered: values.spayed_neutered,
        microchipped: values.microchipped,
        current_location: values.current_location || null,
        origin_latitude: values.current_location ? originLatitude : null,
        origin_longitude: values.current_location ? originLongitude : null,
        age_years: values.age_years,
        sex: values.sex,
        size: values.size,
        photos: photos,
        // BACKWARD COMPATIBILITY double-writes:
        age: textAge,
        gender: genderCapitalized,
        photo_url: firstPhotoUrl,
      };

      if (isEditMode && id) {
        // Update existing pet
        const { error: updateError } = await supabase
          .from('pets')
          .update(petPayload)
          .eq('id', id);

        if (updateError) throw updateError;
        alert(`Dossier for "${values.name}" updated successfully.`);
      } else {
        // 1. Generate sequential Case Number for current year
        const currentYear = new Date().getFullYear();
        const prefix = `HPRH-${currentYear}-`;

        const { data: existingPets, error: caseError } = await supabase
          .from('pets')
          .select('case_number')
          .like('case_number', `${prefix}%`);

        if (caseError) throw caseError;

        let nextSeq = 1;
        if (existingPets && existingPets.length > 0) {
          const seqs = existingPets.map(p => {
            const parts = p.case_number.split('-');
            if (parts.length === 3) {
              const val = parseInt(parts[2], 10);
              return isNaN(val) ? 0 : val;
            }
            return 0;
          });
          nextSeq = Math.max(...seqs) + 1;
        }
        const generatedCaseNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
        
        petPayload.case_number = generatedCaseNumber;
        petPayload.intake_date = new Date().toISOString().split('T')[0];

        // Insert new pet
        const { error: insertError } = await supabase
          .from('pets')
          .insert([petPayload]);

        if (insertError) throw insertError;
        alert(`New Dossier "${values.name}" registered successfully under Case ID: ${generatedCaseNumber}`);
      }

      navigate('/admin/pets');
    } catch (err: any) {
      console.error('Submit pet form error:', err);
      setErrorMsg(err.message || 'Failed to submit case record.');
    } finally {
      setLoading(false);
    }
  };

  const speciesOptions = [
    { value: 'dog', label: 'Dog' },
    { value: 'cat', label: 'Cat' },
    { value: 'rabbit', label: 'Rabbit' },
    { value: 'pocket_pet', label: 'Pocket Pet' },
    { value: 'other', label: 'Other' },
  ];

  const sexOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unknown', label: 'Unknown' },
  ];

  const sizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extra_large', label: 'Extra Large' },
  ];

  const statusOptions = [
    { value: 'AVAILABLE', label: 'AVAILABLE (Listed)' },
    { value: 'PENDING', label: 'PENDING (Hold / In Review)' },
    { value: 'ADOPTED', label: 'ADOPTED' },
    { value: 'MEDICAL_HOLD', label: 'MEDICAL_HOLD' },
    { value: 'NOT_LISTED', label: 'NOT_LISTED (Soft Deleted)' },
  ];

  if (fetchingPet) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Fetching Case Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="max-w-3xl space-y-6">
        <div>
          <Link
            to="/admin/pets"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage hover:text-hprh-sage/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Back to Inventory
          </Link>
        </div>

        {/* Form Container */}
        <div
          className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-md p-6 md:p-8 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Accent border */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>

          {/* Form Header */}
          <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 mb-6">
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block mb-1">
              {isEditMode ? 'Modify Registry Archive' : 'Intake Questionnaire Log'}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-hprh-pine">
              {isEditMode ? 'Edit Case File' : 'Register New Case File'}
            </h2>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Ensure all fields align with database schema attributes to avoid integrity errors.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-mono uppercase font-bold text-hprh-clay block">Submission Denied</span>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1: Core Profile */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                01. Intake Dossier Profile
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Animal Name"
                  placeholder="e.g. Barnaby"
                  error={errors.name?.message}
                  {...register('name')}
                />
                
                <Input
                  label="Breed / Mix"
                  placeholder="e.g. Golden Retriever Mix"
                  error={errors.breed?.message}
                  {...register('breed')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Select
                  label="Species"
                  options={speciesOptions}
                  error={errors.species?.message}
                  {...register('species')}
                />

                <Select
                  label="Sex"
                  options={sexOptions}
                  error={errors.sex?.message}
                  {...register('sex')}
                />

                <Select
                  label="Size Category"
                  options={sizeOptions}
                  error={errors.size?.message}
                  {...register('size')}
                />

                <Input
                  label="Age (Years Decimal)"
                  type="number"
                  step="0.05"
                  placeholder="e.g. 1.2"
                  error={errors.age_years?.message}
                  {...register('age_years')}
                />
              </div>
            </div>

            {/* Section 2: Care, Status & Pricing */}
            <div className="space-y-4 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                02. Care & Environment Clearance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Case status"
                  options={statusOptions}
                  error={errors.status?.message}
                  {...register('status')}
                />

                <Input
                  label="Adoption Fee"
                  type="number"
                  placeholder="e.g. 250"
                  error={errors.adoption_fee?.message}
                  {...register('adoption_fee')}
                />

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                    Current Location Facility
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-grow bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded p-3 text-xs text-hprh-pine font-sans focus:outline-none"
                      placeholder="e.g. 1109 N Highland St, Arlington, VA"
                      {...register('current_location')}
                      onChange={(e) => {
                        register('current_location').onChange(e);
                        setGeocodeVerified(false);
                        setGeocodeError(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={geocoding}
                      className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider px-4 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {geocoding ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify Location</span>
                      )}
                    </button>
                  </div>
                  
                  {geocodeError && (
                    <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold block mt-1">
                      {geocodeError}
                    </span>
                  )}
                  
                  {errors.current_location?.message && (
                    <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold block mt-1">
                      {errors.current_location.message}
                    </span>
                  )}
                  
                  {geocodeVerified && verifiedAddress && (
                    <span className="text-[10px] text-hprh-sage uppercase tracking-wide font-semibold block mt-1">
                      ✓ Location verified: {verifiedAddress} ({originLatitude?.toFixed(4)}, {originLongitude?.toFixed(4)})
                    </span>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-hprh-paper/60 p-4 rounded border border-hprh-pine/10 font-mono text-[10px]">
                <div className="flex flex-col gap-2">
                  <span className="uppercase text-hprh-pine/40 font-bold block mb-1">Temperament Checks</span>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('good_with_kids')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Good with Kids</span>
                  </label>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('good_with_dogs')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Good with Dogs</span>
                  </label>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('good_with_cats')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Good with Cats</span>
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="uppercase text-hprh-pine/40 font-bold block mb-1">Medical Clearances</span>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('vaccinated')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Vaccinated</span>
                  </label>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('spayed_neutered')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Spayed / Neutered</span>
                  </label>
                  <label className="flex items-center gap-2 select-none font-bold text-hprh-pine/75 cursor-pointer">
                    <input type="checkbox" {...register('microchipped')} className="w-4 h-4 rounded text-hprh-sage border-hprh-pine/15 focus:ring-hprh-sage" />
                    <span>Microchipped</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Assessment & Media */}
            <div className="space-y-4 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                03. Story & Media Dossier
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Pet Biography / Story"
                  placeholder="Tell their story, backstory, and personality traits..."
                  error={errors.story?.message}
                  {...register('story')}
                />
                
                <Textarea
                  label="Intake & Foster Notes"
                  placeholder="Confidential care notes regarding handling, feeding, or vet visits..."
                  error={errors.foster_notes?.message}
                  {...register('foster_notes')}
                />
              </div>

              {/* Photo Upload Handler */}
              <div className="space-y-3 font-mono text-[10px]">
                <span className="uppercase text-hprh-pine/50 font-bold block mb-1">Dossier Photography Portfolio</span>
                
                <div className="flex flex-wrap gap-3 items-center">
                  
                  {/* Upload button wrapper */}
                  <label className={`w-24 h-24 rounded border-2 border-dashed border-hprh-pine/15 hover:border-hprh-sage/40 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors bg-hprh-paper/60 ${
                    uploadingPhoto ? 'pointer-events-none opacity-50' : ''
                  }`}>
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-hprh-sage mb-1" />
                        <span className="text-[8px] leading-tight text-hprh-pine/50">Filing File...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-hprh-sage mb-1" />
                        <span className="text-[8px] leading-tight text-hprh-pine/60">Upload Image</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                      disabled={uploadingPhoto} 
                    />
                  </label>

                  {/* Thumbnail Previews */}
                  {photos.map((photoUrl, idx) => (
                    <div 
                      key={idx} 
                      className="relative w-24 h-24 bg-white border border-hprh-pine/10 rounded overflow-hidden shadow-sm p-0.5 group"
                    >
                      <img src={photoUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-sm" />
                      
                      {/* Badge for Primary image */}
                      {idx === 0 && (
                        <div className="absolute bottom-1 left-1 bg-hprh-sage text-hprh-paper text-[7px] font-bold uppercase tracking-widest px-1 py-0.2 rounded shadow-sm border border-hprh-sage/40 select-none">
                          Primary
                        </div>
                      )}

                      {/* Remove Button Overlay */}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-hprh-clay/90 hover:bg-hprh-clay text-hprh-paper rounded shadow-sm border border-hprh-clay/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Image"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                </div>
                <span className="text-[9px] text-hprh-pine/40 uppercase block mt-1">
                  * First photo in the list automatically serves as the primary display image. Max size 5MB.
                </span>
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="border-t border-dashed border-hprh-pine/15 pt-6 flex flex-col sm:flex-row items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Filing Case Dossier...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    {isEditMode ? 'Update Pet Dossier' : 'Register Intake Dossier'}
                  </>
                )}
              </Button>
              
              <Link
                to="/admin/pets"
                className="w-full sm:w-auto text-center font-mono text-[10px] uppercase tracking-wider text-hprh-pine/50 border border-hprh-pine/15 py-3.5 px-6 rounded hover:bg-hprh-pine/5 transition-colors"
              >
                Cancel and Discard Changes
              </Link>
            </div>

          </form>
        </div>
      </Container>
    </div>
  );
};

export default AdminPetForm;
