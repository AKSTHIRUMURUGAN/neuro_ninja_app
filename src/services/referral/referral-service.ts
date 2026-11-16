import { Share } from 'react-native';
import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  ReferralProfile,
  ReferralMilestone,
  ReferralBuddy,
} from './referral-types';

export class ReferralService {
  private defaultCode = 'NINJA-9921';

  /**
   * Get complete referral profile including milestone ladders and buddies
   */
  async getReferralProfile(): Promise<ReferralProfile> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      referral_id: string;
      referee_name: string | null;
      referee_email: string | null;
      referrer_code: string;
      status: 'pending' | 'qualified' | 'completed';
      coins_awarded: number;
      xp_awarded: number;
      invited_at: string;
      qualified_at: string | null;
    }>('SELECT * FROM referrals ORDER BY invited_at DESC');

    const buddies: ReferralBuddy[] = rows.map(r => ({
      id: r.referral_id,
      name: r.referee_name || 'Ninja Recruit',
      email: r.referee_email ?? undefined,
      status: r.status === 'completed' || r.status === 'qualified' ? 'qualified' : 'invited',
      invitedAt: r.invited_at,
      qualifiedAt: r.qualified_at ?? undefined,
      coinsEarned: r.coins_awarded,
    }));

    const totalInvited = buddies.length;
    const totalQualified = buddies.filter(b => b.status === 'qualified').length;
    const totalCoinsEarned = rows.reduce((acc, curr) => acc + curr.coins_awarded, 0);

    // 4-Tier Milestone Ladder
    const milestones: ReferralMilestone[] = [
      {
        friendsCount: 1,
        coinsReward: 100,
        xpReward: 200,
        rewardTitle: 'Recruit Bonus (100 Coins + 200 XP)',
        badgeId: 'recruiter_novice',
        isUnlocked: totalQualified >= 1,
        isClaimed: totalCoinsEarned >= 100,
      },
      {
        friendsCount: 3,
        coinsReward: 350,
        xpReward: 600,
        rewardTitle: 'Squad Leader (350 Coins + 1-Mo Pro Free)',
        badgeId: 'squad_leader',
        isUnlocked: totalQualified >= 3,
        isClaimed: totalCoinsEarned >= 450,
      },
      {
        friendsCount: 5,
        coinsReward: 1000,
        xpReward: 1500,
        rewardTitle: 'Clan Master (1,000 Coins + Gold Visor Skin)',
        badgeId: 'clan_master',
        isUnlocked: totalQualified >= 5,
        isClaimed: totalCoinsEarned >= 1450,
      },
      {
        friendsCount: 10,
        coinsReward: 2500,
        xpReward: 5000,
        rewardTitle: 'Dojo Legend (2,500 Coins + Lifetime Pro)',
        badgeId: 'dojo_legend',
        isUnlocked: totalQualified >= 10,
        isClaimed: totalCoinsEarned >= 3950,
      },
    ];

    const shareUrl = `https://neuroninja.app/refer/${this.defaultCode}`;

    return {
      referralCode: this.defaultCode,
      shareUrl,
      totalInvited,
      totalQualified,
      totalCoinsEarned,
      milestones,
      buddies,
    };
  }

  /**
   * Share invite link using native Android share sheet
   */
  async shareInvite(): Promise<void> {
    const message = `Join me on NeuroNinja — the ultimate LifeOS and focus guardian! Use my referral code ${this.defaultCode} to get 100 free Focus Coins and unlock exclusive cyberpunk themes: https://neuroninja.app/refer/${this.defaultCode}`;

    try {
      await Share.share({
        message,
        title: 'Join NeuroNinja',
      });
    } catch (e) {
      console.warn('[ReferralService] share error:', e);
    }
  }

  /**
   * Record new invited friend
   */
  async recordInvite(name: string, email?: string): Promise<ReferralBuddy> {
    const db = await getDatabase();
    const id = 'ref_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO referrals (referral_id, referee_name, referee_email, referrer_code, status, coins_awarded, xp_awarded, invited_at, qualified_at, sync_status)
       VALUES (?, ?, ?, ?, 'pending', 0, 0, ?, NULL, 'pending')`,
      [id, name, email ?? null, this.defaultCode, now]
    );

    try {
      await enqueueSyncItem('referrals', id, 'insert', {
        referralId: id,
        refereeName: name,
        refereeEmail: email,
        referrerCode: this.defaultCode,
      });
    } catch (e) {
      console.warn('[ReferralService] enqueueSync error:', e);
    }

    return {
      id,
      name,
      email,
      status: 'invited',
      invitedAt: now,
      coinsEarned: 0,
    };
  }

  /**
   * Qualify buddy and award milestone coins
   */
  async qualifyBuddy(buddyId: string): Promise<boolean> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const rewardCoins = 100;
    const rewardXp = 200;

    await db.runAsync(
      `UPDATE referrals
       SET status = 'qualified', coins_awarded = ?, xp_awarded = ?, qualified_at = ?, sync_status = 'pending'
       WHERE referral_id = ?`,
      [rewardCoins, rewardXp, now, buddyId]
    );

    // Credit coins to wallet
    await walletService.creditCoins(
      rewardCoins,
      rewardXp,
      'referral',
      'Referral Reward: Friend completed first habit 🤝',
      buddyId
    );

    return true;
  }
}

export const referralService = new ReferralService();
