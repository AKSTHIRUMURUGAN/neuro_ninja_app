import AsyncStorage from '@react-native-async-storage/async-storage';
import { BattleArena, ArenaTask, ArenaHabit } from './battle-arena-types';

const STORAGE_KEY = '@neuroninja_battle_arenas_v2';

const INITIAL_ARENAS: BattleArena[] = [
  {
    id: 'arena_test_completed',
    creatorId: 'user_self',
    title: 'test',
    description: 'test',
    type: 'collection',
    targetValue: 100,
    duration: 7,
    stakeAmount: 10,
    status: 'completed',
    visibility: 'public',
    isCreator: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    participants: [
      {
        userId: 'user_self',
        name: 'THIRUMURUGAN A.K.S',
        score: 120,
        status: 'completed',
        rank: 1,
        level: 13,
      },
      {
        userId: 'user_alex',
        name: 'Alex Hunter',
        score: 95,
        status: 'completed',
        rank: 2,
        level: 11,
      },
    ],
    tasks: [
      { id: 't1', title: 'Complete Deep Work Sprint', points: 20, completed: true },
      { id: 't2', title: 'Zero Doomscroll Day', points: 30, completed: true },
    ],
    habits: [
      { id: 'h1', title: 'Morning Exercise', points: 15, frequency: 'daily', targetDays: 7, completedDays: 7 },
      { id: 'h2', title: 'Read 20 mins', points: 10, frequency: 'daily', targetDays: 7, completedDays: 7 },
    ],
    userProgress: {
      completedTasks: 2,
      totalTasks: 2,
      completedHabits: 2,
      totalHabits: 2,
      currentScore: 120,
    },
  },
  {
    id: 'arena_dare_completed',
    creatorId: 'user_self',
    title: 'are you dare',
    description: 'dare to take challange',
    type: 'collection',
    targetValue: 150,
    duration: 7,
    stakeAmount: 25,
    status: 'completed',
    visibility: 'public',
    isCreator: true,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    participants: [
      {
        userId: 'user_self',
        name: 'THIRUMURUGAN A.K.S',
        score: 150,
        status: 'completed',
        rank: 1,
        level: 13,
      },
      {
        userId: 'user_kage',
        name: 'Dharma Ninja',
        score: 130,
        status: 'completed',
        rank: 2,
        level: 14,
      },
    ],
    tasks: [
      { id: 't3', title: 'Solve 3 Hard Problems', points: 50, completed: true },
    ],
    habits: [
      { id: 'h3', title: 'Digital Curfew at 10 PM', points: 25, frequency: 'daily', targetDays: 7, completedDays: 7 },
    ],
    userProgress: {
      completedTasks: 1,
      totalTasks: 1,
      completedHabits: 1,
      totalHabits: 1,
      currentScore: 150,
    },
  },
  {
    id: 'arena_active_sprint',
    creatorId: 'user_self',
    title: 'IIT/NEET Top 100 Focus Sprint',
    description: 'Crush 4 hours of daily deep problem solving with zero distraction.',
    type: 'collection',
    targetValue: 200,
    duration: 14,
    stakeAmount: 50,
    status: 'active',
    visibility: 'public',
    isCreator: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    participants: [
      {
        userId: 'user_self',
        name: 'THIRUMURUGAN A.K.S',
        score: 65,
        status: 'accepted',
        rank: 2,
        level: 13,
      },
      {
        userId: 'user_arya',
        name: 'Dr. Arya',
        score: 80,
        status: 'accepted',
        rank: 1,
        level: 12,
      },
      {
        userId: 'user_kota',
        name: 'Kota Sensei',
        score: 45,
        status: 'accepted',
        rank: 3,
        level: 15,
      },
    ],
    tasks: [
      { id: 't4', title: 'Solve 20 Advanced Physics MCQs', points: 30, completed: true },
      { id: 't5', title: 'Formula Review & Active Recall', points: 20, completed: false },
    ],
    habits: [
      { id: 'h4', title: 'Wake Up at 5:30 AM', points: 15, frequency: 'daily', targetDays: 14, completedDays: 2 },
      { id: 'h5', title: 'No Social Media Before Noon', points: 20, frequency: 'daily', targetDays: 14, completedDays: 2 },
    ],
    userProgress: {
      completedTasks: 1,
      totalTasks: 2,
      completedHabits: 0,
      totalHabits: 2,
      currentScore: 65,
    },
  },
  {
    id: 'arena_lobby_open',
    creatorId: 'user_zen',
    title: 'Fullstack Devs 100-Commit Arena',
    description: 'Ship 1 meaningful PR every single day for 7 days straight. Stake 20 coins.',
    type: 'streak',
    targetValue: 7,
    duration: 7,
    stakeAmount: 20,
    status: 'pending',
    visibility: 'public',
    isCreator: false,
    createdAt: new Date().toISOString(),
    participants: [
      {
        userId: 'user_zen',
        name: 'Kernel Kage',
        score: 0,
        status: 'accepted',
        rank: 1,
        level: 16,
      },
    ],
    tasks: [
      { id: 't6', title: 'Merge 1 Production PR', points: 25, completed: false },
    ],
    habits: [
      { id: 'h6', title: 'Review 2 Pull Requests', points: 15, frequency: 'daily', targetDays: 7, completedDays: 0 },
    ],
    userProgress: {
      completedTasks: 0,
      totalTasks: 1,
      completedHabits: 0,
      totalHabits: 1,
      currentScore: 0,
    },
  },
];

export async function getBattleArenas(): Promise<BattleArena[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ARENAS));
      return INITIAL_ARENAS;
    }
    const parsed: BattleArena[] = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.warn('Failed to load battle arenas:', e);
    return INITIAL_ARENAS;
  }
}

export async function saveBattleArenas(arenas: BattleArena[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arenas));
  } catch (e) {
    console.error('Failed to save battle arenas:', e);
  }
}

export async function createBattleArena(params: {
  title: string;
  description: string;
  type: 'collection' | 'streak' | 'elimination' | 'custom';
  duration: number;
  stakeAmount: number;
  visibility: 'public' | 'password' | 'private';
  tasks: ArenaTask[];
  habits: ArenaHabit[];
  participantEmails?: string[];
}): Promise<BattleArena> {
  const newArena: BattleArena = {
    id: `arena_${Date.now()}`,
    creatorId: 'user_self',
    title: params.title.trim(),
    description: params.description.trim() || 'No description',
    type: params.type,
    targetValue: 100,
    duration: params.duration,
    stakeAmount: params.stakeAmount,
    status: 'active',
    visibility: params.visibility,
    isCreator: true,
    createdAt: new Date().toISOString(),
    participants: [
      {
        userId: 'user_self',
        name: 'THIRUMURUGAN A.K.S',
        score: 0,
        status: 'accepted',
        rank: 1,
        level: 13,
      },
      ...(params.participantEmails || []).map((email) => ({
        userId: `invited_${Math.random().toString(36).substring(2, 7)}`,
        name: email.split('@')[0],
        email,
        score: 0,
        status: 'invited' as const,
      })),
    ],
    tasks: params.tasks,
    habits: params.habits,
    userProgress: {
      completedTasks: 0,
      totalTasks: params.tasks.length,
      completedHabits: 0,
      totalHabits: params.habits.length,
      currentScore: 0,
    },
  };

  const current = await getBattleArenas();
  const updated = [newArena, ...current];
  await saveBattleArenas(updated);
  return newArena;
}

export async function joinArena(arenaId: string): Promise<BattleArena[]> {
  const arenas = await getBattleArenas();
  const updated = arenas.map((a) => {
    if (a.id === arenaId) {
      const alreadyJoined = a.participants.some((p) => p.userId === 'user_self');
      if (!alreadyJoined) {
        return {
          ...a,
          status: 'active' as const,
          participants: [
            ...a.participants,
            {
              userId: 'user_self',
              name: 'THIRUMURUGAN A.K.S',
              score: 0,
              status: 'accepted' as const,
              rank: a.participants.length + 1,
              level: 13,
            },
          ],
        };
      }
    }
    return a;
  });

  await saveBattleArenas(updated);
  return updated;
}
