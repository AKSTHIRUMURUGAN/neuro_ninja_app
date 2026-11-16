// Smart Shopping & Grocery Types & Presets
// Parity with AnyList, Bring!, and neuro_ninja_web shopping engine

export type GroceryCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'supplements';

export interface ShoppingItem {
  itemId: string;
  listId: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: string; // 'pcs' | 'kg' | 'g' | 'liters' | 'pack' | 'box'
  isChecked: boolean;
  notes?: string;
  updatedAt: string;
}

export interface ShoppingList {
  listId: string;
  name: string;
  items?: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending';
}

export const GROCERY_CATEGORIES: Record<GroceryCategory, { label: string; icon: string; color: string }> = {
  produce: { label: 'Produce 🥦', icon: 'nutrition', color: '#10B981' },
  protein: { label: 'Protein & Meat 🥩', icon: 'fish', color: '#EF4444' },
  dairy: { label: 'Dairy & Eggs 🥛', icon: 'water', color: '#3B82F6' },
  pantry: { label: 'Pantry & Grains 🌾', icon: 'basket', color: '#F59E0B' },
  frozen: { label: 'Frozen 🧊', icon: 'snow', color: '#06B6D4' },
  bakery: { label: 'Bakery 🥖', icon: 'pizza', color: '#D97706' },
  beverages: { label: 'Beverages 🧃', icon: 'wine', color: '#8B5CF6' },
  snacks: { label: 'Snacks & Nuts 🥜', icon: 'fast-food', color: '#EC4899' },
  supplements: { label: 'Supplements 💊', icon: 'medkit', color: '#00E699' },
  household: { label: 'Household 🧼', icon: 'home', color: '#64748B' },
};

export const COMMON_STAPLES: { name: string; category: GroceryCategory; unit: string; qty: number }[] = [
  { name: 'Eggs (Dozen)', category: 'dairy', unit: 'pcs', qty: 12 },
  { name: 'Greek Yogurt', category: 'dairy', unit: 'pack', qty: 2 },
  { name: 'Rolled Oats', category: 'pantry', unit: 'kg', qty: 1 },
  { name: 'Bananas', category: 'produce', unit: 'pcs', qty: 6 },
  { name: 'Spinach', category: 'produce', unit: 'bunch', qty: 1 },
  { name: 'Almond Milk', category: 'dairy', unit: 'liters', qty: 1 },
  { name: 'Peanut Butter', category: 'pantry', unit: 'jar', qty: 1 },
  { name: 'Whey Protein', category: 'supplements', unit: 'tub', qty: 1 },
  { name: 'Olive Oil', category: 'pantry', unit: 'liters', qty: 1 },
  { name: 'Electrolytes', category: 'supplements', unit: 'pack', qty: 1 },
];

export interface GroceryPreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  items: { name: string; category: GroceryCategory; quantity: number; unit: string }[];
}

export const GROCERY_PRESETS: GroceryPreset[] = [
  {
    id: 'preset_ninja_high_protein',
    name: 'Ninja High-Protein Fuel',
    desc: 'Optimized for lean mass recovery and neuro-clarity',
    icon: 'barbell',
    items: [
      { name: 'Chicken Breast / Tofu', category: 'protein', quantity: 1, unit: 'kg' },
      { name: 'Eggs (Free Range)', category: 'dairy', quantity: 24, unit: 'pcs' },
      { name: 'Greek Yogurt 0%', category: 'dairy', quantity: 3, unit: 'pack' },
      { name: 'Whey Protein Isolate', category: 'supplements', quantity: 1, unit: 'tub' },
      { name: 'Rolled Oats', category: 'pantry', quantity: 1, unit: 'kg' },
      { name: 'Raw Almonds', category: 'snacks', quantity: 500, unit: 'g' },
    ],
  },
  {
    id: 'preset_keto_metabolic',
    name: 'Keto Fasting Metabolic',
    desc: 'Zero-sugar staples for sustained ketosis and energy',
    icon: 'flame',
    items: [
      { name: 'Hass Avocados', category: 'produce', quantity: 4, unit: 'pcs' },
      { name: 'Extra Virgin Olive Oil', category: 'pantry', quantity: 1, unit: 'liters' },
      { name: 'Wild Salmon Fillets', category: 'protein', quantity: 500, unit: 'g' },
      { name: 'Baby Spinach & Kale', category: 'produce', quantity: 2, unit: 'bunch' },
      { name: 'Grass-fed Butter', category: 'dairy', quantity: 1, unit: 'pack' },
      { name: 'Macadamia Nuts', category: 'snacks', quantity: 250, unit: 'g' },
    ],
  },
  {
    id: 'preset_neuro_brain_vitality',
    name: 'Neuro Brain Vitality',
    desc: 'Polyphenols, omega-3s, and cognitive superfoods',
    icon: 'brain',
    items: [
      { name: 'Wild Blueberries', category: 'produce', quantity: 300, unit: 'g' },
      { name: 'Walnuts (Brain shaped)', category: 'snacks', quantity: 500, unit: 'g' },
      { name: '85% Dark Chocolate', category: 'snacks', quantity: 2, unit: 'bar' },
      { name: 'Green Tea (Matcha)', category: 'beverages', quantity: 1, unit: 'box' },
      { name: 'Broccoli Sprouts', category: 'produce', quantity: 1, unit: 'pack' },
      { name: 'Turmeric & Black Pepper', category: 'pantry', quantity: 1, unit: 'jar' },
    ],
  },
];
