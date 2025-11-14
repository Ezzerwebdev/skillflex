// js/core/shop.js
const SHOP_ITEMS = [
  { id: 'frame-mint', label: 'Mint Frame', cost: 80, emoji: '🌿', type: 'frame' },
  { id: 'frame-gold', label: 'Gold Frame', cost: 120, emoji: '🏆', type: 'frame' },
  { id: 'emoji-rocket', label: 'Rocket Flair', cost: 60, emoji: '🚀', type: 'emoji' }
];
const SHOP_RATE_LIMIT_MS = 1500;
let lastPurchaseAt = 0;

export function getShopItems(profile) {
  const owned = new Set(profile?.purchases || []);
  const coins = profile?.coins || 0;
  return SHOP_ITEMS.map((item) => ({
    ...item,
    owned: owned.has(item.id),
    affordable: coins >= item.cost
  }));
}

export function purchaseItem(store, id) {
  const now = Date.now();
  if (now - lastPurchaseAt < SHOP_RATE_LIMIT_MS) return { ok: false, error: 'slow_down' };
  lastPurchaseAt = now;
  const item = SHOP_ITEMS.find((entry) => entry.id === id);
  if (!item) return { ok: false, error: 'not_found' };
  const snapshot = store.get();
  if ((snapshot.purchases || []).includes(id)) return { ok: false, error: 'owned' };
  if ((snapshot.coins || 0) < item.cost) return { ok: false, error: 'insufficient' };
  store.update((draft) => {
    draft.coins -= item.cost;
    draft.purchases = [...(draft.purchases || []), id];
  });
  return { ok: true, item };
}
