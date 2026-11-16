import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  StoreItem,
  StoreCategory,
  StoreOrder,
  StoreShippingAddress,
} from './store-types';
import { INITIAL_STORE_ITEMS } from './store-types';

export class StoreService {
  /**
   * Get all catalog store items with optional category filter
   */
  async getItems(category?: StoreCategory): Promise<StoreItem[]> {
    const db = await getDatabase();
    
    // Check which digital items have already been purchased
    const orders = await db.getAllAsync<{ item_id: string }>(
      'SELECT DISTINCT item_id FROM store_orders'
    );
    const purchasedIds = new Set(orders.map((o) => o.item_id));

    let items = INITIAL_STORE_ITEMS.map((item) => ({
      ...item,
      isPurchased: item.category === 'digital' ? purchasedIds.has(item.id) : false,
    }));

    if (category && category !== ('all' as any)) {
      items = items.filter((i) => i.category === category);
    }

    return items;
  }

  /**
   * Purchase store item using focus coins
   */
  async purchaseItem(
    itemId: string,
    quantity: number = 1,
    shippingAddress?: StoreShippingAddress
  ): Promise<{ success: boolean; order?: StoreOrder; error?: string }> {
    const db = await getDatabase();
    const item = INITIAL_STORE_ITEMS.find((i) => i.id === itemId);

    if (!item) {
      return { success: false, error: 'Item not found in Neuro Store' };
    }

    // Check if digital perk is already owned
    if (item.category === 'digital') {
      const existing = await db.getFirstAsync<{ order_id: string }>(
        'SELECT order_id FROM store_orders WHERE item_id = ?',
        [itemId]
      );
      if (existing) {
        return { success: false, error: 'You already own this digital perk!' };
      }
    }

    const totalCoins = item.coinsPrice * quantity;

    // Spend coins via wallet
    const spendRes = await walletService.spendCoins(
      totalCoins,
      'store',
      `Purchased: ${item.title} x${quantity} 🛍️`,
      itemId
    );

    if (!spendRes.success) {
      return { success: false, error: spendRes.error || 'Insufficient Focus Coins' };
    }

    const orderId = `ORD-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const status = item.category === 'digital' ? 'delivered' : 'processing';
    const certId = item.category === 'impact' ? `CERT-${Date.now().toString().slice(-6)}` : undefined;

    const order: StoreOrder = {
      orderId,
      itemId,
      itemTitle: item.title,
      itemCategory: item.category,
      itemSubCategory: item.subCategory,
      itemImage: item.imageUrl,
      quantity,
      coinsSpent: totalCoins,
      status,
      shippingAddress,
      certificateId: certId,
      orderedAt: now,
      syncStatus: 'pending',
    };

    await db.runAsync(
      `INSERT INTO store_orders (
        order_id, item_id, item_title, item_category, item_sub_category, item_image,
        quantity, coins_spent, status, full_name, phone, address_line1, address_line2,
        city, state, postal_code, country, selected_size, certificate_id, ordered_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId,
        itemId,
        item.title,
        item.category,
        item.subCategory,
        item.imageUrl,
        quantity,
        totalCoins,
        status,
        shippingAddress?.fullName ?? null,
        shippingAddress?.phone ?? null,
        shippingAddress?.addressLine1 ?? null,
        shippingAddress?.addressLine2 ?? null,
        shippingAddress?.city ?? null,
        shippingAddress?.state ?? null,
        shippingAddress?.postalCode ?? null,
        shippingAddress?.country ?? 'India',
        shippingAddress?.selectedSize ?? null,
        certId ?? null,
        now,
      ]
    );

    try {
      await enqueueSyncItem('store_orders', orderId, 'insert', order);
    } catch (e) {
      console.warn('[StoreService] enqueueSync error:', e);
    }

    return {
      success: true,
      order,
    };
  }

  /**
   * Get past store orders
   */
  async getOrders(): Promise<StoreOrder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      order_id: string;
      item_id: string;
      item_title: string;
      item_category: string;
      item_sub_category: string;
      item_image: string | null;
      quantity: number;
      coins_spent: number;
      status: string;
      full_name: string | null;
      phone: string | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      selected_size: string | null;
      courier_name: string | null;
      tracking_number: string | null;
      certificate_id: string | null;
      ordered_at: string;
      sync_status: string;
    }>('SELECT * FROM store_orders ORDER BY ordered_at DESC');

    return rows.map((r) => ({
      orderId: r.order_id,
      itemId: r.item_id,
      itemTitle: r.item_title,
      itemCategory: r.item_category as any,
      itemSubCategory: r.item_sub_category as any,
      itemImage: r.item_image ?? undefined,
      quantity: r.quantity,
      coinsSpent: r.coins_spent,
      status: r.status as any,
      shippingAddress: r.full_name
        ? {
            fullName: r.full_name,
            phone: r.phone ?? '',
            addressLine1: r.address_line1 ?? '',
            addressLine2: r.address_line2 ?? undefined,
            city: r.city ?? '',
            state: r.state ?? '',
            postalCode: r.postal_code ?? '',
            country: r.country ?? 'India',
            selectedSize: r.selected_size ?? undefined,
          }
        : undefined,
      courierName: r.courier_name ?? undefined,
      trackingNumber: r.tracking_number ?? undefined,
      certificateId: r.certificate_id ?? undefined,
      orderedAt: r.ordered_at,
      syncStatus: r.sync_status as any,
    }));
  }
}

export const storeService = new StoreService();
