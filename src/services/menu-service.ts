import { request } from '@/services/api';
import type { MenuCategory, MenuProduct } from '@/types/chat';

type Paginated<T> = { data?: T[] };

export async function fetchCategories(
  companyId: string,
  signal?: AbortSignal
): Promise<MenuCategory[]> {
  const response = await request<Paginated<MenuCategory> | MenuCategory[]>(
    '/delivery/bot/category',
    { query: { company_id: companyId }, signal }
  );
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export async function fetchProducts(
  companyId: string,
  options?: { categoryId?: string; limit?: number | string },
  signal?: AbortSignal
): Promise<MenuProduct[]> {
  const response = await request<Paginated<MenuProduct> | MenuProduct[]>('/delivery/bot/product', {
    query: {
      company_id: companyId,
      category_id: options?.categoryId,
      limit: options?.limit,
    },
    signal,
  });
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export async function fetchProduct(
  productId: string,
  companyId: string,
  signal?: AbortSignal
): Promise<MenuProduct | null> {
  return request<MenuProduct>(`/delivery/bot/product/${productId}`, {
    query: { company_id: companyId },
    signal,
  });
}
