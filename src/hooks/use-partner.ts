/**
 * Everything that makes this app "the MedChat assistant": the partner card (prompt) and
 * its medical specialties. Both are derived from `PARTNER_ID`, exactly like `usePartnerContext`
 * derives them from the `partner` URL param in the Mini App.
 */
import { useEffect, useState } from 'react';

import { PARTNER_FALLBACK_NAME } from '@/constants/config';
import { useI18n } from '@/i18n';
import { fetchIndustryTypes, fetchPartnerCard, type PartnerCard } from '@/services/catalog-service';
import type { IndustryType } from '@/types/chat';

export function usePartner() {
  const { language } = useI18n();
  const [card, setCard] = useState<PartnerCard | null>(null);
  const [industryTypes, setIndustryTypes] = useState<IndustryType[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchPartnerCard(language, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setCard(loaded);
      })
      .catch(() => {
        // Falls back to the hardcoded name; the chat works without the card.
      });

    fetchIndustryTypes(language, controller.signal)
      .then((types) => {
        if (!controller.signal.aborted) setIndustryTypes(types.filter((type) => !!type.label));
      })
      .catch(() => {
        if (!controller.signal.aborted) setIndustryTypes([]);
      });

    return () => controller.abort();
  }, [language]);

  return {
    card,
    name: PARTNER_FALLBACK_NAME,
    prompt: card?.prompt ?? null,
    industryTypes,
  };
}
