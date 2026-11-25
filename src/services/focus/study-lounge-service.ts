export interface StudyLoungeCycleState {
  isStudySprint: boolean;
  phaseLabel: string;
  secondsRemaining: number;
  totalPhaseSeconds: number;
  progressPercent: number;
  formattedTime: string;
}

export interface LoungeParticipant {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'focused' | 'resting' | 'breached';
  focusMinutesToday: number;
  streakDays: number;
}

export interface LoungeBreachLog {
  id: string;
  userName: string;
  timestamp: string;
  message: string;
  durationFocused: string;
}

export interface LoungeReaction {
  id: string;
  userName: string;
  emoji: string;
  timestamp: string;
}

const DEFAULT_PARTICIPANTS: LoungeParticipant[] = [
  {
    id: 'user_self',
    name: 'You (Ninja)',
    avatar: '🥷',
    role: 'Aspirant',
    status: 'focused',
    focusMinutesToday: 110,
    streakDays: 7,
  },
  {
    id: 'p_kota',
    name: 'Kota Sensei',
    avatar: '🥋',
    role: 'Host',
    status: 'focused',
    focusMinutesToday: 240,
    streakDays: 28,
  },
  {
    id: 'p_arya',
    name: 'Dr. Arya',
    avatar: '👩‍⚕️',
    role: 'Member',
    status: 'focused',
    focusMinutesToday: 185,
    streakDays: 14,
  },
  {
    id: 'p_kage',
    name: 'Kernel Kage',
    avatar: '💻',
    role: 'Member',
    status: 'focused',
    focusMinutesToday: 310,
    streakDays: 45,
  },
  {
    id: 'p_zen',
    name: 'Dharma Ninja',
    avatar: '🧘',
    role: 'Member',
    status: 'resting',
    focusMinutesToday: 150,
    streakDays: 12,
  },
];

/**
 * Deterministic master sprint clock:
 * 50 minutes study sprint + 10 minutes break (60 minutes total)
 * Synchronized globally across all devices using wall-clock time
 */
export function getSynchronizedLoungeCycle(sprintDurationMin = 50, breakDurationMin = 10): StudyLoungeCycleState {
  const totalCycleMin = sprintDurationMin + breakDurationMin;
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  const cycleMinute = currentMinute % totalCycleMin;
  const elapsedSeconds = cycleMinute * 60 + currentSecond;

  const sprintSeconds = sprintDurationMin * 60;
  const breakSeconds = breakDurationMin * 60;

  if (elapsedSeconds < sprintSeconds) {
    // In Study Sprint
    const remaining = sprintSeconds - elapsedSeconds;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const progress = Math.round((elapsedSeconds / sprintSeconds) * 100);

    return {
      isStudySprint: true,
      phaseLabel: 'Deep Study Sprint 🎯',
      secondsRemaining: remaining,
      totalPhaseSeconds: sprintSeconds,
      progressPercent: progress,
      formattedTime: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    };
  } else {
    // In Rest Break
    const elapsedInBreak = elapsedSeconds - sprintSeconds;
    const remaining = breakSeconds - elapsedInBreak;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const progress = Math.round((elapsedInBreak / breakSeconds) * 100);

    return {
      isStudySprint: false,
      phaseLabel: 'Micro-Rest Recharge ☕',
      secondsRemaining: remaining,
      totalPhaseSeconds: breakSeconds,
      progressPercent: progress,
      formattedTime: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    };
  }
}

export function getInitialLoungeParticipants(): LoungeParticipant[] {
  return DEFAULT_PARTICIPANTS;
}
