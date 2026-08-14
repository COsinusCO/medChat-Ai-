import { request } from '@/services/api';
import type { CompanyDetail } from '@/types/chat';

export async function submitCompanyUpdateRequest(
  companyId: string,
  data: Partial<CompanyDetail> & {
    requester_name?: string;
    requester_phone_number?: string;
    requester_position?: string;
  }
): Promise<void> {
  await request(`/delivery/bot/company/update-request/${companyId}`, {
    method: 'POST',
    body: data,
  });
}
