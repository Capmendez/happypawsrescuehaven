// ========================================================
// HAPPY PAWS RESCUE HAVEN TYPESCRIPT TYPE DEFINITIONS
// ========================================================

export type PetStatus = 'AVAILABLE' | 'PENDING' | 'ADOPTED' | 'MEDICAL_HOLD' | 'NOT_LISTED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TransportStatus = 
  | 'AWAITING_CHOICE'
  | 'SELF_PICKUP_CONFIRMED'
  | 'AWAITING_LOCATION'
  | 'QUOTE_GENERATED'
  | 'TRANSPORT_FEE_PENDING'
  | 'TRANSPORT_FEE_PAID'
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_PROOF_SUBMITTED'
  | 'DEPOSIT_PAID'
  | 'TRACKING_ACTIVE'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PENDING'    // legacy support
  | 'EN_ROUTE';  // legacy support

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  gender: string | null;
  description: string | null;
  status: PetStatus;
  case_number: string;
  intake_date: string;
  photo_url: string | null;
  created_at: string;
  // NEW FIELDS (added via migration)
  adoption_fee: number;
  currency: string;
  good_with_kids: boolean | null;
  good_with_dogs: boolean | null;
  good_with_cats: boolean | null;
  vaccinated: boolean;
  spayed_neutered: boolean;
  microchipped: boolean;
  foster_notes: string | null;
  current_location: string | null;
  age_years: number | null;
  sex: 'male' | 'female' | 'unknown' | null;
  size: 'small' | 'medium' | 'large' | 'extra_large' | null;
  photos: string[];
  origin_latitude: number | null;
  origin_longitude: number | null;
}

export interface Adopter {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  id_document_url?: string | null;
  id_verified?: boolean;
  id_verified_by?: string | null;
  id_verified_at?: string | null;
  age_confirmed?: boolean;
  created_at: string;
}

export interface AdoptionApplication {
  id: string;
  pet_id: string;
  adopter_id: string;
  status: ApplicationStatus;
  housing_type: string;
  has_other_pets: boolean;
  experience_details: string | null;
  submitted_at: string;
  updated_at: string;
  // Joined fields
  pets?: Pet;
  adopters?: Adopter;
}

export type AdoptionPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Adoption {
  id: string;
  application_id: string;
  pet_id: string;
  adopter_id: string;
  adoption_date: string;
  fee_paid: number;
  amount: number | null;
  currency: string;
  payment_status: AdoptionPaymentStatus;
  flutterwave_tx_ref: string | null;
  flutterwave_tx_id: string | null;
  flutterwave_raw_response: Record<string, unknown> | null;
  paid_at: string | null;
  tracking_id: string | null;
  created_at: string;
  // Joined fields
  pets?: Pet;
  adopters?: Adopter;
}

export interface TransportRequest {
  id: string;
  adoption_id: string;
  pet_id: string | null;
  adopter_id: string | null;
  status: TransportStatus;
  destination_address: string | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  distance_miles: number | null;
  fee_tier_id: string | null;
  transport_fee_amount: number | null;
  transport_fee_currency: string | null;
  transport_fee_proof_id: string | null;
  transport_fee_paid_at: string | null;
  security_deposit_id: string | null;
  tracking_id: string | null;
  tracking_activated_at: string | null;
  pickup_method: 'self_pickup' | 'transport' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  pets?: Pet;
  adopters?: Adopter;
}

export type SecurityDepositStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FORFEITED';

export interface SecurityDeposit {
  id: string;
  transport_request_id: string;
  amount: number;
  currency: string;
  status: SecurityDepositStatus;
  proof_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_notes: string | null;
  created_at: string;
}

export interface Volunteer {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  interests: string[];
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export type PaymentMethodType = 
  | 'bank_transfer'
  | 'zelle'
  | 'cashapp'
  | 'chime'
  | 'venmo'
  | 'paypal'
  | 'other';

export interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string | null;
  routing_number: string | null;
  account_type: 'checking' | 'savings' | null;
  swift_code: string | null;
  currency: string;
  is_active: boolean;
  notes: string | null;
  logo_url: string | null;
  method_type: PaymentMethodType;
  handle: string | null;
  display_label: string | null;
  created_at?: string;
}

export type PaymentProofStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type PaymentProofPurpose = 'ADOPTION_FEE' | 'TRANSPORT_FEE' | 'SECURITY_DEPOSIT';

export interface PaymentProof {
  id: string;
  application_id: string;
  pet_id: string;
  adopter_id: string;
  bank_account_id: string;
  proof_image_url: string;
  amount_claimed: number;
  reference_note: string | null;
  status: PaymentProofStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  purpose: PaymentProofPurpose;
  transport_request_id: string | null;
  security_deposit_id: string | null;
  // Joined fields
  pets?: Pet;
  adopters?: Adopter;
  bank_accounts?: BankAccount;
  transport_requests?: TransportRequest;
}

export type ShipmentStatus = 
  | 'PENDING'
  | 'SHIPPED'
  | 'EN_ROUTE'
  | 'ARRIVED_AT_HUB'
  | 'ON_HOLD'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ShipmentStatusUpdate {
  id: string;
  transport_request_id: string;
  status: ShipmentStatus;
  location_description: string | null;
  note: string | null;
  posted_by: string;
  created_at: string;
  // Joined fields
  staff?: Staff;
}

