// NeuroHealth Engine Types & Constants
// Parity with Whoop, Oura, Headspace, Huberman NSDR & Breathwork

export type MoodRating = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface MentalWellnessScores {
  stress: number; // 1-10 (1 = serene, 10 = extreme stress)
  anxiety: number; // 1-10 (1 = calm, 10 = severe anxiety)
  energy: number; // 1-10 (1 = depleted, 10 = vibrant)
  motivation: number; // 1-10 (1 = none, 10 = unstoppable)
  focus: number; // 1-10 (1 = scattered, 10 = deep flow)
  happiness: number; // 1-10 (1 = low, 10 = joyful)
}

export interface MentalHealthLog {
  logId: string;
  date: string; // YYYY-MM-DD
  mood: MoodRating;
  moodScore: number; // 1-5
  wellnessScores: MentalWellnessScores;
  tags: string[];
  journalText?: string;
  gratitudeList: string[];
  createdAt: string;
}

export const MOOD_RATING_META: Record<MoodRating, { label: string; emoji: string; score: number; color: string }> = {
  great: { label: 'Great', emoji: '😊', score: 5, color: '#10B981' },
  good: { label: 'Good', emoji: '🙂', score: 4, color: '#3B82F6' },
  okay: { label: 'Okay', emoji: '😐', score: 3, color: '#F59E0B' },
  bad: { label: 'Bad', emoji: '😔', score: 2, color: '#F97316' },
  terrible: { label: 'Very Bad', emoji: '😢', score: 1, color: '#EF4444' },
};

export const QUICK_MOOD_TAGS = [
  'Grateful',
  'Deep Focus',
  'Calm Mind',
  'High Energy',
  'Productive',
  'Overwhelmed',
  'Fatigued',
  'Anxious',
  'Restless',
  'Optimistic',
  'Creative Flow',
];

export type BreathingPattern = 'box' | 'relax' | 'resonance';

export interface BreathingPatternConfig {
  id: BreathingPattern;
  name: string;
  subtitle: string;
  description: string;
  inhale: number; // seconds
  holdIn: number;
  exhale: number;
  holdOut: number;
  color: string;
}

export const BREATHING_PATTERNS: Record<BreathingPattern, BreathingPatternConfig> = {
  box: {
    id: 'box',
    name: 'Box Breathing (Navy SEALs)',
    subtitle: '4-4-4-4 Stress Reset',
    description: 'Equal 4-part pacing to rapidly lower autonomic arousal and sharpen executive focus.',
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
    color: '#00E699',
  },
  relax: {
    id: 'relax',
    name: '4-7-8 Deep Relaxation',
    subtitle: 'Dr. Weil Vagal Nerve Stimulator',
    description: 'Lengthened exhale to trigger parasympathetic tone and alleviate acute tension.',
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
    color: '#818CF8',
  },
  resonance: {
    id: 'resonance',
    name: 'Resonance Coherence (5-5)',
    subtitle: 'HRV Cardiac Coherence',
    description: 'Breathe at 6 breaths per minute to synchronize heart rate variability and blood pressure.',
    inhale: 5,
    holdIn: 0,
    exhale: 5,
    holdOut: 0,
    color: '#38BDF8',
  },
};
