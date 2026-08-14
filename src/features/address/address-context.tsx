/**
 * Delivery address for checkout — current pick plus named saves, like the Mini App's
 * `acceptedLocation` + `savedLocation` slices.
 */
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AcceptedAddress } from '@/types/order';

const KEY = 'medchat_saved_addresses';

type AddressValue = {
  accepted: AcceptedAddress | null;
  saved: AcceptedAddress[];
  setAccepted: (address: AcceptedAddress | null) => void;
  save: (address: AcceptedAddress) => void;
  removeSaved: (title: string) => void;
};

const AddressContext = createContext<AddressValue | null>(null);

export function AddressProvider({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState<AcceptedAddress | null>(null);
  const [saved, setSaved] = useState<AcceptedAddress[]>([]);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as AcceptedAddress[];
        if (Array.isArray(parsed)) setSaved(parsed);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: AcceptedAddress[]) => {
    setSaved(next);
    SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const save = useCallback(
    (address: AcceptedAddress) => {
      const title = address.title?.trim();
      if (!title) return;
      persist([{ ...address, title }, ...saved.filter((item) => item.title !== title)]);
    },
    [persist, saved]
  );

  const removeSaved = useCallback(
    (title: string) => persist(saved.filter((item) => item.title !== title)),
    [persist, saved]
  );

  const value = useMemo<AddressValue>(
    () => ({ accepted, saved, setAccepted, save, removeSaved }),
    [accepted, saved, save, removeSaved]
  );

  return <AddressContext value={value}>{children}</AddressContext>;
}

export function useDeliveryAddress() {
  const value = use(AddressContext);
  if (!value) throw new Error('useDeliveryAddress must be used inside <AddressProvider>');
  return value;
}
