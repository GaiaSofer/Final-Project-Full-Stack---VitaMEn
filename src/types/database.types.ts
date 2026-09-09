// Matches supabase/migrations/0001_init.sql.
// Regenerate later with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type UserRole = 'client' | 'admin';

export type Sex = 'male' | 'female';
export type LifeStage = 'none' | 'pregnant' | 'breastfeeding_0_6' | 'breastfeeding_7_12';
export type Origin = 'israel' | 'abroad';
export type RequestStatus = 'open' | 'done';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  sex: Sex | null;
  age: number | null;
  stage: LifeStage;
  created_at: string;
}

export interface Supplement {
  id: string;
  name: string;
  brand: string;
  price_cents: number;          // treated as the MINIMUM price
  price_max_cents: number | null;
  currency: string;
  purpose: string[];
  info: string | null;
  origin: Origin | null;
  source_url: string | null;
  category: string | null;
  created_at: string;
}

export interface SupplementIngredient {
  id: string;
  supplement_id: string;
  ingredient_name: string;
  amount: number;
  unit: string;
}

export interface IntakeItem {
  id: string;
  client_id: string;
  supplement_id: string;
  dosage: string;
  schedule: string;
  pills_per_time: number;
  times_per_week: number;
  created_at: string;
}

export interface MedicalRecommendation {
  id: string;
  client_id: string;
  ingredient_name: string;
  target_amount: number;
  unit: string;
  note: string | null;
  created_at: string;
}

export interface ProductRequest {
  id: string;
  client_id: string;
  product_name: string;
  note: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface Comment {
  id: string;
  supplement_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface IntakeLog {
  id: string;
  client_id: string;
  supplement_id: string;
  taken_at: string;
  notes: string | null;
}

// payload for the add_supplement() RPC
export interface IngredientInput {
  ingredient_name: string;
  amount: number;
  unit: string;
}

export type AuditAction = 'add_supplement' | 'csv_import' | 'update_supplement';

export interface CatalogAuditLogEntry {
  id: string;
  admin_id: string | null;
  action: AuditAction;
  supplement_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}
