import { Share } from 'react-native';
import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  ReferralProfile,
  ReferralMilestone,
  ReferralBuddy,
  ClaimReferralResult,
} from './referral-types';

export class ReferralService {
  /**
   * Retrieves or lazily generates the user's permanent unique referral code
   */
  async getUserReferralCode(): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'user_referral_code'"
    );

    if (row && row.value_json) {
      return row.value_json;
    }

    // Generate deterministic 4-character hex code based on timestamp & randomness
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `NINJA-${randomHex}`;
    const now = new Date().toISOString();

    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('user_referral_code', ?, ?)",
      [code, now]
    );

    return code;
  }

  /**
   * Get complete referral profile including milestone ladders and buddies
   */
  async getReferralProfile(): Promise<ReferralProfile> {
    const db = await getDatabase();
    const myCode = await this.getUserReferralCode();

    // Check if user has claimed an invite code
    const claimedRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'claimed_referral_code'"
    );
    const claimedCode = claimedRow?.value_json || null;
    const hasClaimedInvite = Boolean(claimedCode);

    // Fetch claimed milestone IDs
    const claimedMilestonesRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'claimed_referral_milestones'"
    );
    let claimedMilestoneIds: string[] = [];
    try {
      claimedMilestoneIds = JSON.parse(claimedMilestonesRow?.value_json || '[]');
    } catch {
      claimedMilestoneIds = [];
    }

    // Fetch buddies from referrals table
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

    const buddies: ReferralBuddy[] = rows.map((r) => ({
      id: r.referral_id,
      name: r.referee_name || 'Ninja Recruit',
      email: r.referee_email ?? undefined,
      status: r.status === 'completed' || r.status === 'qualified' ? 'qualified' : 'invited',
      invitedAt: r.invited_at,
      qualifiedAt: r.qualified_at ?? undefined,
      coinsEarned: r.coins_awarded,
    }));

    const totalInvited = buddies.length;
    const totalQualified = buddies.filter((b) => b.status === 'qualified').length;
    const totalCoinsEarned = rows.reduce((acc, curr) => acc + curr.coins_awarded, 0);

    // 4-Tier Milestone Ladder
    const milestones: ReferralMilestone[] = [
      {
        milestoneId: 'milestone_1',
        friendsCount: 1,
        coinsReward: 150,
        xpReward: 300,
        rewardTitle: 'Ninja Scout (150 Coins + 300 XP)',
        badgeId: 'recruiter_novice',
        isUnlocked: totalQualified >= 1,
        isClaimed: claimedMilestoneIds.includes('milestone_1'),
      },
      {
        milestoneId: 'milestone_3',
        friendsCount: 3,
        coinsReward: 500,
        xpReward: 1000,
        rewardTitle: 'Squad Leader (500 Coins + Cyber Katana Skin)',
        badgeId: 'squad_leader',
        isUnlocked: totalQualified >= 3,
        isClaimed: claimedMilestoneIds.includes('milestone_3'),
      },
      {
        milestoneId: 'milestone_5',
        friendsCount: 5,
        coinsReward: 1200,
        xpReward: 2500,
        rewardTitle: 'Clan Master (1,200 Coins + 1-Mo Focus VIP)',
        badgeId: 'clan_master',
        isUnlocked: totalQualified >= 5,
        isClaimed: claimedMilestoneIds.includes('milestone_5'),
      },
      {
        milestoneId: 'milestone_10',
        friendsCount: 10,
        coinsReward: 3000,
        xpReward: 7000,
        rewardTitle: 'Dojo Legend (3,000 Coins + Lifetime VIP Badge)',
        badgeId: 'dojo_legend',
        isUnlocked: totalQualified >= 10,
        isClaimed: claimedMilestoneIds.includes('milestone_10'),
      },
    ];

    const shareUrl = `https://neuroninja.app/refer/${myCode}`;

    return {
      referralCode: myCode,
      shareUrl,
      hasClaimedInvite,
      claimedCode,
      totalInvited,
      totalQualified,
      totalCoinsEarned,
      milestones,
      buddies,
    };
  }

  /**
   * Claim an invited referral code to receive referee welcome bonus (150 coins + free soundscape)
   */
  async claimReferralCode(rawCode: string): Promise<ClaimReferralResult> {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid referral code.', coinsAwarded: 0, xpAwarded: 0 };
    }

    const myCode = await this.getUserReferralCode();
    if (cleanCode === myCode.toUpperCase()) {
      return { success: false, message: 'You cannot claim your own referral code!', coinsAwarded: 0, xpAwarded: 0 };
    }

    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'claimed_referral_code'"
    );

    if (existing && existing.value_json) {
      return {
        success: false,
        message: `You have already claimed referral code ${existing.value_json}.`,
        coinsAwarded: 0,
        xpAwarded: 0,
      };
    }

    const now = new Date().toISOString();
    const rewardCoins = 150;
    const rewardXp = 300;

    // 1. Save claimed code to lifeos_state
    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('claimed_referral_code', ?, ?)",
      [cleanCode, now]
    );

    // 2. Credit coins and XP to Focus Wallet
    await walletService.creditCoins(
      rewardCoins,
      rewardXp,
      'referral',
      `Welcome Bonus: Joined with referral code ${cleanCode} 🤝`,
      cleanCode
    );

    // 3. Unlock 1 free premium soundscape track from Audio Vault if available
    let unlockedTitle = 'Rain on Temple Roof';
    try {
      const lockedTrack = await db.getFirstAsync<{ track_id: string; title: string }>(
        'SELECT track_id, title FROM audio_vault_tracks WHERE is_unlocked = 0 LIMIT 1'
      );
      if (lockedTrack) {
        await db.runAsync(
          'UPDATE audio_vault_tracks SET is_unlocked = 1, unlocked_at = ? WHERE track_id = ?',
          [now, lockedTrack.track_id]
        );
        unlockedTitle = lockedTrack.title;
      }
    } catch (e) {
      console.warn('[ReferralService] Soundscape bonus unlock error:', e);
    }

    return {
      success: true,
      message: `Welcome to NeuroNinja! Claimed ${rewardCoins} Coins + 1 Soundscape (${unlockedTitle})!`,
      coinsAwarded: rewardCoins,
      xpAwarded: rewardXp,
      unlockedTrackTitle: unlockedTitle,
    };
  }

  /**
   * Explicitly claim an unlocked milestone reward
   */
  async claimMilestone(milestoneId: string): Promise<boolean> {
    const profile = await this.getReferralProfile();
    const milestone = profile.milestones.find((m) => m.milestoneId === milestoneId);
    if (!milestone || !milestone.isUnlocked || milestone.isClaimed) {
      return false;
    }

    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'claimed_referral_milestones'"
    );

    let claimed: string[] = [];
    try {
      claimed = JSON.parse(row?.value_json || '[]');
    } catch {
      claimed = [];
    }

    if (!claimed.includes(milestoneId)) {
      claimed.push(milestoneId);
      const now = new Date().toISOString();
      await db.runAsync(
        "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('claimed_referral_milestones', ?, ?)",
        [JSON.stringify(claimed), now]
      );

      // Award coins & XP to wallet
      await walletService.creditCoins(
        milestone.coinsReward,
        milestone.xpReward,
        'referral',
        `Referral Milestone Claimed: ${milestone.rewardTitle} 🏆`,
        milestoneId
      );
      return true;
    }
    return false;
  }

  /**
   * Share invite link using native Android share sheet
   */
  async shareInvite(): Promise<void> {
    const code = await this.getUserReferralCode();
    const message = `Join me on NeuroNinja — the ultimate focus guardian & LifeOS! Enter my code ${code} to get 150 Free Focus Coins and unlock a premium soundscape: https://neuroninja.app/refer/${code}`;

    try {
      await Share.share({
        message,
        title: 'Join NeuroNinja Dojo',
      });
    } catch (e) {
      console.warn('[ReferralService] Share error:', e);
    }
  }

  /**
   * Add a real friend contact / invitee
   */
  async addBuddy(name: string, email?: string): Promise<ReferralBuddy> {
    const db = await getDatabase();
    const myCode = await this.getUserReferralCode();
    const id = 'ref_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO referrals (referral_id, referee_name, referee_email, referrer_code, status, coins_awarded, xp_awarded, invited_at, qualified_at, sync_status)
       VALUES (?, ?, ?, ?, 'pending', 0, 0, ?, NULL, 'pending')`,
      [id, name.trim(), email?.trim() || null, myCode, now]
    );

    try {
      await enqueueSyncItem('referrals', id, 'insert', {
        referralId: id,
        refereeName: name.trim(),
        refereeEmail: email?.trim(),
        referrerCode: myCode,
      });
    } catch (e) {
      console.warn('[ReferralService] enqueueSync error:', e);
    }

    return {
      id,
      name: name.trim(),
      email: email?.trim(),
      status: 'invited',
      invitedAt: now,
      coinsEarned: 0,
    };
  }
}

export const referralService = new ReferralService();
