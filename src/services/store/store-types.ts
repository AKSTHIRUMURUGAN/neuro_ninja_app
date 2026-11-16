// NeuroStore & Merch Types & Seeds
// Full parity with neuro_ninja_web/lib/store.ts

export type StoreCategory = 'impact' | 'goodies' | 'digital';

export type StoreSubCategory =
  | 'environment'
  | 'education'
  | 'elderly'
  | 'relief'
  | 'apparel'
  | 'accessories'
  | 'perks';

export interface StoreItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: StoreCategory;
  subCategory: StoreSubCategory;
  coinsPrice: number;
  xpRequired: number;
  imageUrl: string;
  badgeText?: string;
  stockType: 'unlimited' | 'limited';
  stockQuantity: number;
  isAvailable: boolean;
  impactMetadata?: {
    partnerName: string;
    metricUnit: string;
    multiplierPerPurchase: number;
    totalImpactDelivered: number;
    region?: string;
  };
  goodiesMetadata?: {
    requiresShippingAddress: boolean;
    availableSizes?: ('S' | 'M' | 'L' | 'XL' | 'XXL')[];
    colors?: string[];
  };
  isPurchased?: boolean;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export interface StoreShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  selectedSize?: string;
}

export interface StoreOrder {
  orderId: string;
  itemId: string;
  itemTitle: string;
  itemCategory: StoreCategory;
  itemSubCategory: StoreSubCategory;
  itemImage?: string;
  quantity: number;
  coinsSpent: number;
  status: OrderStatus;
  shippingAddress?: StoreShippingAddress;
  courierName?: string;
  trackingNumber?: string;
  certificateId?: string;
  orderedAt: string;
  syncStatus: 'synced' | 'pending';
}

export const INITIAL_STORE_ITEMS: StoreItem[] = [
  // --- CAUSES: ENVIRONMENT & TREE PLANTING ---
  {
    id: 'cause-plant-one-tree',
    title: 'Plant 1 Living Tree',
    subtitle: 'Verified Reforestation with Eden Projects',
    description:
      'Convert your earned Ninja Coins into a real living mangrove or broadleaf tree planted on Earth. Includes GPS planting coordinates & digital certificate.',
    category: 'impact',
    subCategory: 'environment',
    coinsPrice: 1000,
    xpRequired: 0,
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    badgeText: '🌲 Eco Warrior',
    stockType: 'unlimited',
    stockQuantity: 99999,
    isAvailable: true,
    impactMetadata: {
      partnerName: 'Eden Reforestation Projects',
      metricUnit: 'Trees Planted',
      multiplierPerPurchase: 1,
      totalImpactDelivered: 1420,
      region: 'Madagascar / Western Ghats',
    },
  },

  // --- CAUSES: ELDER CARE & MEALS ---
  {
    id: 'cause-elder-care-meals',
    title: '1 Week Nutritious Meals for Seniors',
    subtitle: 'Nourishment & Dignity for Elderly Homes',
    description:
      'Sponsor a full week of warm, balanced meals and vital healthcare supplies for elderly residents in verified senior care shelters.',
    category: 'impact',
    subCategory: 'elderly',
    coinsPrice: 1500,
    xpRequired: 0,
    imageUrl: 'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=800&auto=format&fit=crop&q=80',
    badgeText: '🍲 Elder Care',
    stockType: 'unlimited',
    stockQuantity: 99999,
    isAvailable: true,
    impactMetadata: {
      partnerName: 'Akshaya Patra & HelpAge',
      metricUnit: 'Meals Donated',
      multiplierPerPurchase: 7,
      totalImpactDelivered: 3850,
      region: 'Community Shelters',
    },
  },

  // --- CAUSES: EDUCATION KITS ---
  {
    id: 'cause-child-education-kit',
    title: 'Complete School Supply Kit',
    subtitle: 'Notebooks, Stationery & Backpack for 1 Student',
    description:
      'Equip a student from an underserved rural community with durable notebooks, geometrical sets, textbooks, pens, and a backpack.',
    category: 'impact',
    subCategory: 'education',
    coinsPrice: 2000,
    xpRequired: 0,
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
    badgeText: '📚 Scholar Kit',
    stockType: 'unlimited',
    stockQuantity: 99999,
    isAvailable: true,
    impactMetadata: {
      partnerName: 'Pratham & Room to Read',
      metricUnit: 'Students Equipped',
      multiplierPerPurchase: 1,
      totalImpactDelivered: 890,
      region: 'Rural Learning Centers',
    },
  },

  // --- GOODIES: CYBERPUNK HOODIE ---
  {
    id: 'merch-cyber-hoodie',
    title: 'NeuroNinja Cyber Stealth Hoodie',
    subtitle: 'Heavyweight French Terry • Glow-in-the-Dark Embroidered Logo',
    description:
      'Official NeuroNinja physical apparel. 420 GSM pre-shrunk cotton, water-resistant zip pockets, and discreet headphone loops. Shipped directly to your doorstep.',
    category: 'goodies',
    subCategory: 'apparel',
    coinsPrice: 4500,
    xpRequired: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    badgeText: '🔥 Official Merch',
    stockType: 'limited',
    stockQuantity: 45,
    isAvailable: true,
    goodiesMetadata: {
      requiresShippingAddress: true,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Stealth Black', 'Cyber Emerald'],
    },
  },

  // --- GOODIES: THERMOS BOTTLE ---
  {
    id: 'merch-ninja-thermos',
    title: 'Vacuum Insulated Ninja Flask (750ml)',
    subtitle: '18/8 Double-Wall Stainless Steel • 24h Cold / 12h Hot',
    description:
      'The essential hydration companion for deep work blocks. Matte black rubberized grip with laser-engraved NeuroNinja icon and leakproof spout.',
    category: 'goodies',
    subCategory: 'accessories',
    coinsPrice: 2800,
    xpRequired: 1000,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
    badgeText: '💧 Hydration Gear',
    stockType: 'limited',
    stockQuantity: 120,
    isAvailable: true,
    goodiesMetadata: {
      requiresShippingAddress: true,
      colors: ['Matte Black'],
    },
  },

  // --- GOODIES: HOLOGRAPHIC STICKER PACK ---
  {
    id: 'merch-sticker-pack',
    title: 'Holographic Ninja Vinyl Sticker Pack',
    subtitle: '8 Die-Cut Weatherproof Cyberpunk Stickers',
    description:
      'Premium UV-resistant vinyl stickers for your MacBook, mechanical keyboards, and water bottles. Includes reflective chrome finish.',
    category: 'goodies',
    subCategory: 'accessories',
    coinsPrice: 800,
    xpRequired: 500,
    imageUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    badgeText: '✨ Holographic',
    stockType: 'limited',
    stockQuantity: 250,
    isAvailable: true,
    goodiesMetadata: {
      requiresShippingAddress: true,
    },
  },

  // --- DIGITAL PERKS ---
  {
    id: 'digital-vip-gold',
    title: 'VIP Ninja Gold Lifetime Badge',
    subtitle: 'Gilded Nameplate, Custom Profile Visor & 2x XP Boost',
    description:
      'Unlock prestigious VIP styling across your entire profile, access exclusive arena matchmaking rooms, and enjoy permanent 2x XP progression.',
    category: 'digital',
    subCategory: 'perks',
    coinsPrice: 1200,
    xpRequired: 500,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    badgeText: '👑 VIP Status',
    stockType: 'unlimited',
    stockQuantity: 99999,
    isAvailable: true,
  },
  {
    id: 'digital-ai-nutrition-coach',
    title: 'AI Nutrition & Macro Coach Unlock',
    subtitle: 'Personalized meal plans & metabolic fasting timing',
    description:
      'Empower your NeuroBody OS with advanced AI macro adjustments tailored to your workout intensity and circadian fasting schedule.',
    category: 'digital',
    subCategory: 'perks',
    coinsPrice: 950,
    xpRequired: 400,
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80',
    badgeText: '🤖 AI Unlock',
    stockType: 'unlimited',
    stockQuantity: 99999,
    isAvailable: true,
  },
];
