import { Linking } from 'react-native';

import type { CatalogCompany } from '@/types/chat';
import { resolveCompanyAction } from '@/utils/company';

/**
 * Runs a company's primary action — call, Telegram, website, or the in-app menu.
 */
export function openCompanyAction(
  company: CatalogCompany,
  openMenu?: (company: CatalogCompany) => void
) {
  const action = resolveCompanyAction(company);
  if (!action) return;

  if (action.kind === 'menu') {
    openMenu?.(company);
    return;
  }

  const url =
    action.kind === 'call'
      ? `tel:${action.value.replace(/[^\d+]/g, '')}`
      : action.kind === 'telegram'
        ? toTelegramUrl(action.value)
        : action.kind === 'web'
          ? action.value
          : null;

  if (url) Linking.openURL(url).catch(() => {});
}

function toTelegramUrl(value: string) {
  if (value.startsWith('http')) return value;
  return `https://t.me/${value.replace(/^@/, '')}`;
}
