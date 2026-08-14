/**
 * In-memory basket, the native counterpart of the Mini App's `foodBoxSlice`.
 * Lives above the company stack so menu → product → basket → payment share one cart.
 */
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { MenuProduct } from '@/types/chat';
import { productUnitPrice } from '@/utils/price';

export type BasketItem = MenuProduct & { amount: number };

type BasketValue = {
  items: BasketItem[];
  add: (product: MenuProduct) => void;
  removeOne: (product: MenuProduct) => void;
  remove: (productId: string) => void;
  clear: () => void;
  countOf: (productId: string) => number;
  size: number;
  subtotal: number;
  subtotalWithoutDiscount: number;
};

const BasketContext = createContext<BasketValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);

  const add = useCallback((product: MenuProduct) => {
    setItems((current) => {
      const existing = current.find((item) => item._id === product._id);
      if (existing) {
        return current.map((item) =>
          item._id === product._id ? { ...item, amount: item.amount + 1 } : item
        );
      }
      return [...current, { ...product, amount: 1 }];
    });
  }, []);

  const removeOne = useCallback((product: MenuProduct) => {
    setItems((current) => {
      const existing = current.find((item) => item._id === product._id);
      if (!existing) return current;
      if (existing.amount <= 1) return current.filter((item) => item._id !== product._id);
      return current.map((item) =>
        item._id === product._id ? { ...item, amount: item.amount - 1 } : item
      );
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item._id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const countOf = useCallback(
    (productId: string) => items.find((item) => item._id === productId)?.amount ?? 0,
    [items]
  );

  const size = items.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + productUnitPrice(item) * item.amount,
    0
  );
  const subtotalWithoutDiscount = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.amount,
    0
  );

  const value = useMemo<BasketValue>(
    () => ({
      items,
      add,
      removeOne,
      remove,
      clear,
      countOf,
      size,
      subtotal,
      subtotalWithoutDiscount,
    }),
    [items, add, removeOne, remove, clear, countOf, size, subtotal, subtotalWithoutDiscount]
  );

  return <BasketContext value={value}>{children}</BasketContext>;
}

export function useBasket() {
  const value = use(BasketContext);
  if (!value) throw new Error('useBasket must be used inside <BasketProvider>');
  return value;
}
