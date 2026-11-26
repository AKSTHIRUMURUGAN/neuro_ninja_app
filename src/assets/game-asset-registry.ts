import type { ImageSourcePropType } from 'react-native';

export const NINJA_ANIMATIONS = {
  master: require('../../assets/game/v2/characters/ninja/ninja_master.png'),
  idle: [
    require('../../assets/game/v2/characters/ninja/idle/frame_00.png'),
    require('../../assets/game/v2/characters/ninja/idle/frame_01.png'),
    require('../../assets/game/v2/characters/ninja/idle/frame_02.png'),
    require('../../assets/game/v2/characters/ninja/idle/frame_03.png'),
    require('../../assets/game/v2/characters/ninja/idle/frame_04.png'),
    require('../../assets/game/v2/characters/ninja/idle/frame_05.png'),
  ] as ImageSourcePropType[],
  walk: [
    require('../../assets/game/v2/characters/ninja/walk/frame_00.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_01.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_02.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_03.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_04.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_05.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_06.png'),
    require('../../assets/game/v2/characters/ninja/walk/frame_07.png'),
  ] as ImageSourcePropType[],
  attack: [
    require('../../assets/game/v2/characters/ninja/attack/frame_00.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_01.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_02.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_03.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_04.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_05.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_06.png'),
    require('../../assets/game/v2/characters/ninja/attack/frame_07.png'),
  ] as ImageSourcePropType[],
  hit: [
    require('../../assets/game/v2/characters/ninja/hit/frame_00.png'),
    require('../../assets/game/v2/characters/ninja/hit/frame_01.png'),
    require('../../assets/game/v2/characters/ninja/hit/frame_02.png'),
    require('../../assets/game/v2/characters/ninja/hit/frame_03.png'),
  ] as ImageSourcePropType[],
  victory: [
    require('../../assets/game/v2/characters/ninja/victory/frame_00.png'),
    require('../../assets/game/v2/characters/ninja/victory/frame_01.png'),
    require('../../assets/game/v2/characters/ninja/victory/frame_02.png'),
    require('../../assets/game/v2/characters/ninja/victory/frame_03.png'),
    require('../../assets/game/v2/characters/ninja/victory/frame_04.png'),
    require('../../assets/game/v2/characters/ninja/victory/frame_05.png'),
  ] as ImageSourcePropType[],
};

export const SCROLL_HYDRA_ANIMATIONS = {
  master: require('../../assets/game/v2/enemies/scroll_hydra/scroll_hydra_master.png'),
  idle: [
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_00.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_01.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_02.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_03.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_04.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/idle/frame_05.png'),
  ] as ImageSourcePropType[],
  attack: [
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_00.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_01.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_02.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_03.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_04.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_05.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_06.png'),
    require('../../assets/game/v2/enemies/scroll_hydra/attack/frame_07.png'),
  ] as ImageSourcePropType[],
};

export const WEAPON_ICONS = {
  wooden_katana: require('../../assets/game/v2/weapons/wpn_wooden_katana.png'),
  silver_katana: require('../../assets/game/v2/weapons/wpn_silver_katana.png'),
  golden_katana: require('../../assets/game/v2/weapons/wpn_golden_katana.png'),
  golden_katana_sparkle: require('../../assets/game/v2/weapons/wpn_golden_katana_sparkle.png'),
  shadow_katana: require('../../assets/game/v2/weapons/wpn_shadow_katana.png'),
  dragon_katana: require('../../assets/game/v2/weapons/wpn_dragon_katana.png'),
  icy_katana: require('../../assets/game/v2/weapons/wpn_icy_katana.png'),
  wind_kunai: require('../../assets/game/v2/weapons/wpn_wind_kunai.png'),
  stone_hammer: require('../../assets/game/v2/weapons/wpn_stone_hammer.png'),
  shadow_bow: require('../../assets/game/v2/weapons/wpn_shadow_bow.png'),
  light_staff: require('../../assets/game/v2/weapons/wpn_light_staff.png'),
};

export const WEAPON_EQUIP_GLOW_FRAMES: ImageSourcePropType[] = [
  require('../../assets/game/v2/weapons/equip_glow/frame_00.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_01.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_02.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_03.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_04.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_05.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_06.png'),
  require('../../assets/game/v2/weapons/equip_glow/frame_07.png'),
];

export const GEAR_ICONS = {
  starter_gi: require('../../assets/game/v2/gear/gear_starter_gi.png'),
  focus_robe: require('../../assets/game/v2/gear/gear_focus_robe.png'),
  guardian_armour: require('../../assets/game/v2/gear/gear_guardian_armour.png'),
  stoneplate_armour: require('../../assets/game/v2/gear/gear_stoneplate_armour.png'),
  wind_cloak: require('../../assets/game/v2/gear/gear_wind_cloak.png'),
  ninja_headband: require('../../assets/game/v2/gear/gear_ninja_headband.png'),
};

export const CHEST_ASSETS = {
  wooden_closed: require('../../assets/game/v2/chests/chest_wooden_closed.png'),
  wooden_open: require('../../assets/game/v2/chests/chest_wooden_open.png'),
  silver_closed: require('../../assets/game/v2/chests/chest_silver_closed.png'),
  gold_closed: require('../../assets/game/v2/chests/chest_gold_closed.png'),
  magic_closed: require('../../assets/game/v2/chests/chest_magic_closed.png'),
  legendary_closed: require('../../assets/game/v2/chests/chest_legendary_closed.png'),
  openingFrames: [
    require('../../assets/game/v2/chests/opening/frame_00.png'),
    require('../../assets/game/v2/chests/opening/frame_01.png'),
    require('../../assets/game/v2/chests/opening/frame_02.png'),
    require('../../assets/game/v2/chests/opening/frame_03.png'),
    require('../../assets/game/v2/chests/opening/frame_04.png'),
    require('../../assets/game/v2/chests/opening/frame_05.png'),
    require('../../assets/game/v2/chests/opening/frame_06.png'),
    require('../../assets/game/v2/chests/opening/frame_07.png'),
  ] as ImageSourcePropType[],
  burstFrames: [
    require('../../assets/game/v2/chests/burst/frame_00.png'),
    require('../../assets/game/v2/chests/burst/frame_01.png'),
    require('../../assets/game/v2/chests/burst/frame_02.png'),
    require('../../assets/game/v2/chests/burst/frame_03.png'),
    require('../../assets/game/v2/chests/burst/frame_04.png'),
    require('../../assets/game/v2/chests/burst/frame_05.png'),
    require('../../assets/game/v2/chests/burst/frame_06.png'),
    require('../../assets/game/v2/chests/burst/frame_07.png'),
  ] as ImageSourcePropType[],
};

export const CASTLE_ASSETS = {
  tile_grass: require('../../assets/game/v2/castle/tile_grass.png'),
  tile_stone_path: require('../../assets/game/v2/castle/tile_stone_path.png'),
  keep_lv1: require('../../assets/game/v2/castle/keep_lv1.png'),
  keep_lv2: require('../../assets/game/v2/castle/keep_lv2.png'),
  keep_lv3: require('../../assets/game/v2/castle/keep_lv3.png'),
  dojo_lv1: require('../../assets/game/v2/castle/dojo_lv1.png'),
  dojo_lv2: require('../../assets/game/v2/castle/dojo_lv2.png'),
  habit_shrine: require('../../assets/game/v2/castle/habit_shrine.png'),
  task_forge: require('../../assets/game/v2/castle/task_forge.png'),
  watchtower: require('../../assets/game/v2/castle/watchtower.png'),
  archer_tower: require('../../assets/game/v2/castle/archer_tower.png'),
  training_yard: require('../../assets/game/v2/castle/training_yard.png'),
  resource_store: require('../../assets/game/v2/castle/resource_store.png'),
  wall_straight: require('../../assets/game/v2/castle/wall_straight.png'),
  wall_corner_tower: require('../../assets/game/v2/castle/wall_corner_tower.png'),
  castle_gate: require('../../assets/game/v2/castle/castle_gate.png'),
  castle_gate_damaged: require('../../assets/game/castle/gates_damaged.png'),
  decor_bonsai: require('../../assets/game/v2/castle/decor_bonsai.png'),
  decor_lantern: require('../../assets/game/v2/castle/decor_lantern.png'),
};

export const UI_GAME_ICONS = {
  res_gold: require('../../assets/game/v2/ui/res_gold.png'),
  res_wood: require('../../assets/game/v2/ui/res_wood.png'),
  res_stone: require('../../assets/game/v2/ui/res_stone.png'),
  res_energy: require('../../assets/game/v2/ui/res_energy.png'),
  icon_mission_scroll: require('../../assets/game/v2/ui/icon_mission_scroll.png'),
  icon_focus_hourglass: require('../../assets/game/v2/ui/icon_focus_hourglass.png'),
  icon_habit_leaf: require('../../assets/game/v2/ui/icon_habit_leaf.png'),
  icon_task_board: require('../../assets/game/v2/ui/icon_task_board.png'),
  frame_common: require('../../assets/game/v2/ui/frame_common.png'),
  frame_rare: require('../../assets/game/v2/ui/frame_rare.png'),
  frame_legendary: require('../../assets/game/v2/ui/frame_legendary.png'),
  badge_mission: require('../../assets/game/v2/ui/badge_mission.png'),
  badge_boss: require('../../assets/game/v2/ui/badge_boss.png'),
};

export function getWeaponSpriteForId(weaponIdOrName: string): ImageSourcePropType {
  const k = weaponIdOrName.toLowerCase();
  if (k.includes('kusanagi') || k.includes('dragon')) return WEAPON_ICONS.dragon_katana;
  if (k.includes('muramasa') || k.includes('shadow')) return WEAPON_ICONS.shadow_katana;
  if (k.includes('flowblade') || k.includes('icy')) return WEAPON_ICONS.icy_katana;
  if (k.includes('kusarigama') || k.includes('bow')) return WEAPON_ICONS.shadow_bow;
  if (k.includes('kunai')) return WEAPON_ICONS.wind_kunai;
  if (k.includes('hammer')) return WEAPON_ICONS.stone_hammer;
  if (k.includes('staff')) return WEAPON_ICONS.light_staff;
  if (k.includes('gold')) return WEAPON_ICONS.golden_katana_sparkle;
  if (k.includes('silver')) return WEAPON_ICONS.silver_katana;
  return WEAPON_ICONS.wooden_katana;
}

export function getChestSpriteForTier(tier: string): ImageSourcePropType {
  switch (tier.toLowerCase()) {
    case 'mythic':
    case 'legendary':
      return CHEST_ASSETS.legendary_closed;
    case 'shadow':
    case 'magic':
      return CHEST_ASSETS.magic_closed;
    case 'jade':
    case 'gold':
      return CHEST_ASSETS.gold_closed;
    case 'silver':
      return CHEST_ASSETS.silver_closed;
    default:
      return CHEST_ASSETS.wooden_closed;
  }
}

export function getStoryChapterForLevel(level: number): {
  chapter: string;
  title: string;
  lore: string;
} {
  if (level >= 10) {
    return {
      chapter: 'CHAPTER IV',
      title: 'Siege of the Chaos Titan',
      lore: 'Your Shadow Dojo Clan unites to shatter the ancient Chaos Titan and claim the Dragon Katana.',
    };
  }
  if (level >= 5) {
    return {
      chapter: 'CHAPTER III',
      title: 'The Wisp & The Snooze',
      lore: 'Conquer morning routines and app limits to awaken the Mystical Habit Shrine.',
    };
  }
  if (level >= 3) {
    return {
      chapter: 'CHAPTER II',
      title: 'The Mire of Someday',
      lore: 'Every completed task forges stone for your Watchtower and pierces Procrastination.',
    };
  }
  return {
    chapter: 'CHAPTER I',
    title: "The Scroll Hydra's Coil",
    lore: 'Break endless scrolling loops with deep focus to push back the three-headed Scroll Hydra.',
  };
}
