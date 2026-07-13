export interface UserProfile {
  id: string; // Auth UID
  name: string;
  email: string;
  photoUrl?: string;
  phone?: string;
  connections: string[]; // Array of connected User IDs
  vouchCount: number;
  reliabilityScore: number;
  deviceTokens: string[];
  hostPaymentDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  hasCompletedOnboarding?: boolean;
}

export interface Intent {
  id: string;
  creatorId: string;
  activity: string; // e.g., "Play Hockey"
  timeframe: string; // e.g., "This weekend"
  location?: string; 
  description?: string;
  status: 'active' | 'expired' | 'drafted_to_hangout';
  createdAt: number;
  expiresAt: number;
  interestedUsers: string[]; // Array of User IDs who tapped "I'm Down"
}

export interface PollOption {
  id: string;
  time: number; // Unix timestamp
  venue: string;
  votes: string[]; // Array of User IDs who voted for this
}

export interface Hangout {
  id: string;
  intentId: string;
  hostId: string;
  title: string;
  status: 'drafting' | 'collecting_funds' | 'confirmed' | 'canceled' | 'completed';
  
  // Confirmed details (populated after voting)
  confirmedTime?: number;
  confirmedVenue?: string;
  polls?: PollOption[];
  
  // Payment Details (Option A: Manual Ledger)
  pricingModel: 'per_person' | 'split_total' | 'free';
  totalCost?: number;
  perPersonCost?: number;
  requiredAttendees?: number;
  paymentDeadline?: number;
  hostPaymentDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  
  // Roster
  attendees: string[]; // Array of User IDs who are confirmed/paid
  presentAttendees: string[]; // Array of User IDs who checked in via QR
}
