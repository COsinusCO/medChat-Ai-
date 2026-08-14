/**
 * Loaded company card shared by every screen in the `company/[id]` stack, so menu / basket /
 * payment / info do not refetch the same `GET /company/:id`.
 */
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useUserLocation } from '@/features/location/location-context';
import { fetchCompany, fetchCompanyInstagram } from '@/services/company-service';
import type { CompanyDetail, InstagramData } from '@/types/chat';

type CompanyValue = {
  companyId: string;
  company: CompanyDetail | null;
  instagram: InstagramData | null;
  failed: boolean;
  reload: () => void;
};

const CompanyContext = createContext<CompanyValue | null>(null);

export function CompanyProvider({
  companyId,
  children,
}: {
  companyId: string;
  children: ReactNode;
}) {
  const { coords, resolving } = useUserLocation();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [instagram, setInstagram] = useState<InstagramData | null>(null);
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState(0);

  useEffect(() => {
    if (!companyId || resolving) return;

    const controller = new AbortController();
    setFailed(false);

    fetchCompany(companyId, coords, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setCompany(loaded);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => controller.abort();
  }, [companyId, resolving, coords, token]);

  useEffect(() => {
    if (!companyId) return;

    const controller = new AbortController();
    fetchCompanyInstagram(companyId, controller.signal)
      .then((data) => !controller.signal.aborted && setInstagram(data))
      .catch(() => {});

    return () => controller.abort();
  }, [companyId, token]);

  const value = useMemo<CompanyValue>(
    () => ({
      companyId,
      company,
      instagram,
      failed,
      reload: () => setToken((n) => n + 1),
    }),
    [companyId, company, instagram, failed]
  );

  return <CompanyContext value={value}>{children}</CompanyContext>;
}

export function useCompany() {
  const value = use(CompanyContext);
  if (!value) throw new Error('useCompany must be used inside <CompanyProvider>');
  return value;
}
