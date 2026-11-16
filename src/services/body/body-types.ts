// NeuroBody Engine Types & Constants
// Parity with neuro_ninja_web & industry leaders (Flo, Clue, Zero, Waterllama, MyFitnessPal, Whoop, Oura)

export type FastingProtocol = '14:10' | '16:8' | '18:6' | '20:4' | '24:0' | 'custom';
export type FastingStatus = 'active' | 'completed' | 'cancelled';

export interface FastingSession {
  sessionId: string;
  protocol: FastingProtocol;
  targetHours: number;
  startTime: string; // ISO string
  endTime?: string;
  status: FastingStatus;
  mood?: string;
  notes?: string;
  createdAt: string;
}

export interface FastingBioStage {
  minHours: number;
  maxHours: number;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export const FASTING_BIO_STAGES: FastingBioStage[] = [
  { minHours: 0, maxHours: 4, name: 'Digestion & Anabolic', emoji: '🍽️', color: '#F59E0B', description: 'Blood glucose peaks, insulin elevated' },
  { minHours: 4, maxHours: 8, name: 'Insulin Drop', emoji: '📉', color: '#3B82F6', description: 'Blood sugar stabilizes, insulin falls' },
  { minHours: 8, maxHours: 12, name: 'Fat Burning', emoji: '🔥', color: '#EF4444', description: 'Liver glycogen depleted, fat oxidation begins' },
  { minHours: 12, maxHours: 16, name: 'Ketosis Zone', emoji: '⚡', color: '#8B5CF6', description: 'High fat oxidation & ketone production' },
  { minHours: 16, maxHours: 24, name: 'Autophagy', emoji: '🧬', color: '#10B981', description: 'Cellular recycling & anti-aging activated' },
  { minHours: 24, maxHours: Infinity, name: 'Deep Renewal', emoji: '✨', color: '#06B6D4', description: 'Peak growth hormone & deep autophagy' },
];

export const FASTING_PROTOCOLS: Record<FastingProtocol, { label: string; fastHours: number; eatHours: number; description: string }> = {
  '14:10': { label: '14:10 Beginner', fastHours: 14, eatHours: 10, description: 'Gentle start for beginners' },
  '16:8': { label: '16:8 LeanGains', fastHours: 16, eatHours: 8, description: 'Gold-standard fat burn & clarity' },
  '18:6': { label: '18:6 Rapid', fastHours: 18, eatHours: 6, description: 'Accelerated fat burning & autophagy' },
  '20:4': { label: '20:4 Warrior', fastHours: 20, eatHours: 4, description: 'Advanced warrior diet' },
  '24:0': { label: '24h OMAD', fastHours: 24, eatHours: 0, description: 'One meal a day deep fast' },
  'custom': { label: 'Custom', fastHours: 16, eatHours: 8, description: 'Set your own window' },
};

// ────────── Hydration & Fluids ──────────
export type FluidType = 'water' | 'electrolytes' | 'green_tea' | 'black_coffee' | 'herbal';

export interface FluidMeta {
  label: string;
  emoji: string;
  multiplier: number; // Hydration coefficient
  color: string;
}

export const FLUID_TYPES: Record<FluidType, FluidMeta> = {
  water: { label: 'Pure Water', emoji: '💧', multiplier: 1.0, color: '#38BDF8' },
  electrolytes: { label: 'Electrolytes', emoji: '⚡', multiplier: 1.1, color: '#10B981' },
  green_tea: { label: 'Green Tea', emoji: '🍵', multiplier: 0.95, color: '#84CC16' },
  black_coffee: { label: 'Black Coffee', emoji: '☕', multiplier: 0.75, color: '#F59E0B' },
  herbal: { label: 'Herbal Infusion', emoji: '🫖', multiplier: 1.0, color: '#A855F7' },
};

export interface WaterEntry {
  time: string;
  amountMl: number;
  fluidType?: FluidType;
  effectiveMl?: number;
}

export interface WaterLog {
  logId: string;
  date: string; // YYYY-MM-DD
  targetMl: number;
  totalMl: number;
  effectiveMl: number;
  logs: WaterEntry[];
  updatedAt: string;
}

// ────────── Nutrition & Meals ──────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface MealItem {
  mealId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  name: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  ingredients?: string[];
  notes?: string;
  createdAt: string;
}

export const MEAL_TYPE_META: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', color: '#F59E0B' },
  lunch: { label: 'Lunch', emoji: '☀️', color: '#22C55E' },
  dinner: { label: 'Dinner', emoji: '🌙', color: '#6366F1' },
  snack: { label: 'Snack', emoji: '🍎', color: '#EC4899' },
  pre_workout: { label: 'Pre-Workout', emoji: '💪', color: '#EF4444' },
  post_workout: { label: 'Post-Workout', emoji: '🏋️', color: '#14B8A6' },
};

// ────────── Body Metrics & Composition ──────────
export interface BodyMetric {
  metricId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  heightCm?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  bodyFatPercentage?: number;
  bmi?: number;
  whtr?: number; // Waist to Height ratio (<0.5 is healthy)
  notes?: string;
  createdAt: string;
}

// ────────── User Body Profile ──────────
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type Gender = 'female' | 'male' | 'other';

export interface BodyProfile {
  userId: string;
  gender: Gender;
  age: number;
  heightCm: number;
  targetWeightKg: number;
  defaultWaterTargetMl: number;
  preferredFastingProtocol: FastingProtocol;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatsGoal: number;
  activityLevel: ActivityLevel;
  updatedAt: string;
}

// ────────── Women's Health & Cycle Tracking ──────────
export type WomensHealthMode = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'perimenopause';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
export type CervicalMucus = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white';

export interface HealthModeMeta {
  id: WomensHealthMode;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}

export const HEALTH_MODES: HealthModeMeta[] = [
  { id: 'cycle', label: 'Cycle Tracking', emoji: '🌸', desc: 'Predict period, symptoms & energy', color: '#F43F5E' },
  { id: 'ttc', label: 'Trying to Conceive', emoji: '✨', desc: 'Pinpoint fertile window & ovulation peak', color: '#8B5CF6' },
  { id: 'pregnancy', label: 'Pregnancy', emoji: '🤰', desc: 'Week-by-week fetal milestones & trimester', color: '#10B981' },
  { id: 'postpartum', label: 'Postpartum', emoji: '🤱', desc: 'Recovery, hormone balance & pelvic care', color: '#F59E0B' },
  { id: 'perimenopause', label: 'Perimenopause', emoji: '🌿', desc: 'Track hot flashes, sleep & cycle shifts', color: '#D946EF' },
];

export const FLOW_LEVELS: { id: FlowLevel; label: string; emoji: string; color: string }[] = [
  { id: 'spotting', label: 'Spotting', emoji: '💧', color: '#FDA4AF' },
  { id: 'light', label: 'Light', emoji: '🩸', color: '#FB7185' },
  { id: 'medium', label: 'Medium', emoji: '🩸🩸', color: '#F43F5E' },
  { id: 'heavy', label: 'Heavy', emoji: '🩸🩸🩸', color: '#BE123C' },
];

export interface PhaseMeta {
  name: string;
  tag: string;
  emoji: string;
  color: string;
  desc: string;
  neuroTip: string;
  workoutTip: string;
  nutritionTip: string;
}

export const CYCLE_PHASE_META: Record<CyclePhase, PhaseMeta> = {
  menstrual: {
    name: 'Menstrual Phase',
    tag: 'Days 1 - 5',
    emoji: '🩸',
    color: '#F43F5E',
    desc: 'Hormones (estrogen & progesterone) are at baseline. Lower physical stamina.',
    neuroTip: 'Intuitive & Strategic: Best for reflective reviews, journaling, and roadmap planning.',
    workoutTip: 'Restorative yoga, gentle walking, light stretching, mobility drills.',
    nutritionTip: 'Iron-rich foods (spinach, lentils), warm bone broth, magnesium, hydration.',
  },
  follicular: {
    name: 'Follicular Phase',
    tag: 'Days 6 - 13',
    emoji: '🌱',
    color: '#10B981',
    desc: 'Estrogen rises, boosting brain BDNF, insulin sensitivity, and physical stamina.',
    neuroTip: 'Peak Cognitive Power: Optimal for learning complex logic, sprint coding, brainstorming.',
    workoutTip: 'Heavy progressive overload, HIIT, sprint intervals, personal best attempts.',
    nutritionTip: 'Lean proteins, fermented foods, complex carbs to fuel sustained dopamine.',
  },
  ovulation: {
    name: 'Ovulation Phase',
    tag: 'Days 14 - 16',
    emoji: '✨',
    color: '#8B5CF6',
    desc: 'Estrogen peaks, LH surge triggers egg release. High energy, confidence, and social charisma.',
    neuroTip: 'High Charisma & Focus: Best for public presentations, negotiations, team syncs.',
    workoutTip: 'Max effort training, powerlifting, endurance running, dynamic group workouts.',
    nutritionTip: 'Antioxidant berries, leafy greens, zinc, light clean carbohydrates.',
  },
  luteal: {
    name: 'Luteal Phase',
    tag: 'Days 17 - 28',
    emoji: '🍂',
    color: '#F59E0B',
    desc: 'Progesterone rises; basal metabolic rate increases (+150-300 kcal/day). Vulnerable to PMS.',
    neuroTip: 'Detail-Oriented & Focused: Ideal for code reviews, editing, debugging, wrapping up tasks.',
    workoutTip: 'Steady-state cardio, Pilates, moderate weight training, avoid extreme burnout.',
    nutritionTip: 'Complex carbs (sweet potatoes, oats), dark chocolate, magnesium, B6 vitamins.',
  },
};

export interface CycleSymptomMeta {
  id: string;
  label: string;
  emoji: string;
  category: 'physical' | 'digestive' | 'mood';
}

export const CYCLE_SYMPTOMS: CycleSymptomMeta[] = [
  { id: 'cramps', label: 'Cramps', emoji: '⚡', category: 'physical' },
  { id: 'headache', label: 'Headache', emoji: '🤕', category: 'physical' },
  { id: 'bloating', label: 'Bloating', emoji: '🎈', category: 'digestive' },
  { id: 'acne', label: 'Acne', emoji: '🫧', category: 'physical' },
  { id: 'fatigue', label: 'Fatigue', emoji: '😴', category: 'physical' },
  { id: 'breast_tenderness', label: 'Tender Breasts', emoji: '🌸', category: 'physical' },
  { id: 'backache', label: 'Back Pain', emoji: '🦴', category: 'physical' },
  { id: 'cravings', label: 'Cravings', emoji: '🍫', category: 'digestive' },
  { id: 'insomnia', label: 'Insomnia', emoji: '🌙', category: 'physical' },
  { id: 'brain_fog', label: 'Brain Fog', emoji: '🌫️', category: 'physical' },
  { id: 'nausea', label: 'Nausea', emoji: '🤢', category: 'digestive' },
  { id: 'hot_flashes', label: 'Hot Flashes', emoji: '🔥', category: 'physical' },
  { id: 'joint_pain', label: 'Joint Pain', emoji: '🦵', category: 'physical' },
  { id: 'muscle_soreness', label: 'Muscle Ache', emoji: '💪', category: 'physical' },
];

export interface CycleMoodMeta {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const CYCLE_MOODS: CycleMoodMeta[] = [
  { id: 'calm', label: 'Calm', emoji: '🧘', color: '#10B981' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡', color: '#F59E0B' },
  { id: 'happy', label: 'Happy', emoji: '😊', color: '#38BDF8' },
  { id: 'focused', label: 'Deep Flow', emoji: '🎯', color: '#00E699' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: '#A855F7' },
  { id: 'irritable', label: 'Irritable', emoji: '😤', color: '#EF4444' },
  { id: 'sad', label: 'Low / Down', emoji: '🥺', color: '#64748B' },
  { id: 'sensitive', label: 'Sensitive', emoji: '🥺', color: '#EC4899' },
];

export interface PregnancyProfile {
  lmpDate: string; // Last menstrual period date (YYYY-MM-DD)
  dueDate: string; // Estimated due date (YYYY-MM-DD)
  fetusName?: string;
  currentWeek: number; // 1-40
  currentDay: number; // 0-6
  currentTrimester: 1 | 2 | 3;
  babySizeComparison: string; // e.g. "Size of a Mango"
  milestoneDescription: string;
}

export interface WomensHealthProfile {
  userId: string;
  mode: WomensHealthMode;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStartDate?: string;
  isIrregular: boolean;
  pregnancyProfile?: PregnancyProfile;
  privacyPinEnabled: boolean;
  updatedAt: string;
}

export interface WomensHealthLog {
  logId: string;
  date: string; // YYYY-MM-DD
  isPeriodStart: boolean;
  isPeriodEnd: boolean;
  flowLevel?: FlowLevel;
  symptoms: string[];
  moods: string[];
  bbtCelsius?: number;
  cervicalMucus?: CervicalMucus;
  notes?: string;
  createdAt: string;
}

export interface CycleStats {
  currentCycleDay: number;
  totalCycleDays: number;
  predictedPhase: CyclePhase;
  daysUntilNextPeriod: number;
  isFertileWindow: boolean;
  conceptionProbability: 'low' | 'medium' | 'high' | 'peak';
  nextPeriodStartDate: string;
  ovulationDate: string;
  phaseMeta: PhaseMeta;
  todayLog: WomensHealthLog | null;
  pregnancy?: PregnancyProfile;
}

// ────────── Vitality Score (0-100 Composite) ──────────
export interface VitalityScore {
  total: number; // 0-100
  hydration: number; // 0-20
  fasting: number; // 0-20
  nutrition: number; // 0-20
  bodycare: number; // 0-20
  mindfulness: number; // 0-20
  status: 'surging' | 'optimal' | 'moderate' | 'depleted';
  statusLabel: string;
  statusColor: string;
  buffDescription: string;
}

// ────────── Daily Consolidated Stats ──────────
export interface BodyDaySummary {
  date: string;
  vitalityScore: VitalityScore;
  waterTotalMl: number;
  waterTargetMl: number;
  waterPercentage: number;
  activeFast: FastingSession | null;
  fastingElapsedHours: number;
  fastingBioStage: FastingBioStage;
  totalCalories: number;
  calorieGoal: number;
  totalProtein: number;
  proteinGoal: number;
  totalCarbs: number;
  totalFats: number;
  meals: MealItem[];
  latestMetric: BodyMetric | null;
  womensHealth?: CycleStats;
  profile: BodyProfile;
}
