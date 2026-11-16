import { getDatabase } from '../database/database';
import type { ShoppingList, ShoppingItem, GroceryCategory } from './shopping-types';
import { GROCERY_PRESETS } from './shopping-types';

export class ShoppingService {
  async getLists(): Promise<ShoppingList[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      list_id: string;
      name: string;
      created_at: string;
      updated_at: string;
      sync_status: string;
    }>('SELECT * FROM shopping_lists ORDER BY updated_at DESC');

    const lists: ShoppingList[] = [];
    for (const r of rows) {
      const items = await this.getItems(r.list_id);
      lists.push({
        listId: r.list_id,
        name: r.name,
        items,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        syncStatus: r.sync_status as any,
      });
    }
    return lists;
  }

  async getItems(listId: string): Promise<ShoppingItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      item_id: string;
      list_id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      is_checked: number;
      notes: string | null;
      updated_at: string;
    }>('SELECT * FROM shopping_items WHERE list_id = ? ORDER BY is_checked ASC, item_id ASC', [listId]);

    return rows.map((r) => ({
      itemId: r.item_id,
      listId: r.list_id,
      name: r.name,
      category: r.category as GroceryCategory,
      quantity: r.quantity,
      unit: r.unit,
      isChecked: r.is_checked === 1,
      notes: r.notes ?? undefined,
      updatedAt: r.updated_at,
    }));
  }

  async createList(name: string): Promise<ShoppingList> {
    const db = await getDatabase();
    const listId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO shopping_lists (list_id, name, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?)',
      [listId, name, now, now, 'pending']
    );

    return {
      listId,
      name,
      items: [],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };
  }

  async deleteList(listId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM shopping_items WHERE list_id = ?', [listId]);
    await db.runAsync('DELETE FROM shopping_lists WHERE list_id = ?', [listId]);
  }

  async addItem(
    listId: string,
    name: string,
    category: GroceryCategory = 'pantry',
    quantity: number = 1,
    unit: string = 'pcs'
  ): Promise<ShoppingItem> {
    const db = await getDatabase();
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO shopping_items (item_id, list_id, name, category, quantity, unit, is_checked, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [itemId, listId, name, category, quantity, unit, now]
    );

    await db.runAsync(
      'UPDATE shopping_lists SET updated_at = ?, sync_status = "pending" WHERE list_id = ?',
      [now, listId]
    );

    return {
      itemId,
      listId,
      name,
      category,
      quantity,
      unit,
      isChecked: false,
      updatedAt: now,
    };
  }

  async toggleItemChecked(itemId: string, isChecked: boolean): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE shopping_items SET is_checked = ?, updated_at = ? WHERE item_id = ?',
      [isChecked ? 1 : 0, now, itemId]
    );
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.deleteItem(itemId);
      return;
    }
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE shopping_items SET quantity = ?, updated_at = ? WHERE item_id = ?',
      [quantity, now, itemId]
    );
  }

  async deleteItem(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM shopping_items WHERE item_id = ?', [itemId]);
  }

  async importPreset(listId: string, presetId: string): Promise<void> {
    const preset = GROCERY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    for (const item of preset.items) {
      await this.addItem(listId, item.name, item.category, item.quantity, item.unit);
    }
  }

  async clearCheckedItems(listId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM shopping_items WHERE list_id = ? AND is_checked = 1', [listId]);
  }
}

export const shoppingService = new ShoppingService();
