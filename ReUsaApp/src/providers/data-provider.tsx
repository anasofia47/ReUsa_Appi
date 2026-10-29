import NetInfo from '@react-native-community/netinfo';
import { randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { createRepositories, type Repositories } from '@/db/repositories';
import { api } from '@/services/api';
import { describeError } from '@/services/api/client';
import { createLoanService } from '@/services/loans/loan-service';
import { createSyncService } from '@/services/sync/sync-service';
import type { Book, Item, LoanAction, LocalLoan, LocalRequest, RequestAction } from '@/types';
import { useAuth } from './auth-provider';

interface DataContextValue {
  repos: Repositories;
  online: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  pendingCount: number;
  dataVersion: number;
  syncNow: () => Promise<void>;
  requestLoan: (book: Book) => Promise<LocalLoan>;
  requestItem: (item: Item) => Promise<LocalRequest>;
  transitionLoan: (loanId: string, action: LoanAction) => Promise<void>;
  transitionRequest: (requestId: string, action: RequestAction) => Promise<void>;
  dismissLoan: (loanId: string) => Promise<void>;
  dismissRequest: (requestId: string) => Promise<void>;
  notifyChanged: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { status, user } = useAuth();
  const repos = useMemo(() => createRepositories(db), [db]);
  const syncService = useMemo(() => createSyncService({ api, repos }), [repos]);
  const loanService = useMemo(() => createLoanService({ api, repos, newId: randomUUID }), [repos]);

  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);

  const inFlight = useRef<Promise<void> | null>(null);
  const wasOnline = useRef(true);
  const uid = user?.uid ?? null;

  const refreshMeta = useCallback(async () => {
    setPendingCount(await repos.outbox.count());
    setLastSyncAt(await syncService.lastSyncAt());
  }, [repos, syncService]);

  const notifyChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
    void refreshMeta();
  }, [refreshMeta]);

  /** Un solo ciclo de sincronización a la vez. */
  const syncNow = useCallback(async () => {
    if (!uid) return;
    if (inFlight.current) return inFlight.current;

    const run = (async () => {
      setSyncing(true);
      try {
        const result = await syncService.run();
        setLastError(null);
        if (result.pushed + result.conflicts > 0) {
          await repos.activity.log(
            'sync',
            `Enviadas ${result.pushed}, en conflicto ${result.conflicts}`,
          );
        }
      } catch (err) {
        setLastError(describeError(err));
      } finally {
        setSyncing(false);
        inFlight.current = null;
        notifyChanged();
      }
    })();

    inFlight.current = run;
    return run;
  }, [uid, syncService, repos, notifyChanged]);

  // Al volver la red: vaciar la cola automáticamente
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline && !wasOnline.current) void syncNow();
      wasOnline.current = isOnline;
    });
    return unsubscribe;
  }, [syncNow]);

  // Al volver la app a primer plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNow();
    });
    return () => sub.remove();
  }, [syncNow]);

  // Al cambiar la sesión: limpiar datos si cambió de usuario
  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;

    (async () => {
      if (uid) {
        const owner = await repos.meta.get('owner.uid');
        if (owner && owner !== uid) {
          await repos.loans.clear();
          await repos.requests.clear();
          await repos.outbox.clear();
        }
        await repos.meta.set('owner.uid', uid);
        if (cancelled) return;
        await refreshMeta();
        notifyChanged();
        await syncNow();
      } else {
        await repos.loans.clear();
        await repos.requests.clear();
        await repos.outbox.clear();
        await repos.meta.clear();
        if (cancelled) return;
        setLastSyncAt(null);
        setLastError(null);
        notifyChanged();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, uid, repos, refreshMeta, notifyChanged, syncNow]);

  const requestLoan = useCallback(
    async (book: Book) => {
      if (!user) throw new Error('Sesión no iniciada');
      const loan = await loanService.requestLoan(user, book);
      notifyChanged();
      void syncNow();
      return loan;
    },
    [user, loanService, notifyChanged, syncNow],
  );

  const requestItem = useCallback(
    async (item: Item) => {
      if (!user) throw new Error('Sesión no iniciada');
      const req = await loanService.requestItem(user, item);
      notifyChanged();
      void syncNow();
      return req;
    },
    [user, loanService, notifyChanged, syncNow],
  );

  const transitionLoan = useCallback(
    async (loanId: string, action: LoanAction) => {
      await loanService.transition(loanId, action);
      notifyChanged();
      void syncNow();
    },
    [loanService, notifyChanged, syncNow],
  );

  const transitionRequest = useCallback(
    async (requestId: string, action: RequestAction) => {
      await loanService.transitionRequest(requestId, action);
      notifyChanged();
      void syncNow();
    },
    [loanService, notifyChanged, syncNow],
  );

  const dismissLoan = useCallback(
    async (loanId: string) => {
      await loanService.dismiss(loanId);
      notifyChanged();
    },
    [loanService, notifyChanged],
  );

  const dismissRequest = useCallback(
    async (requestId: string) => {
      await loanService.dismissRequest(requestId);
      notifyChanged();
    },
    [loanService, notifyChanged],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      repos,
      online,
      syncing,
      lastSyncAt,
      lastError,
      pendingCount,
      dataVersion,
      syncNow,
      requestLoan,
      requestItem,
      transitionLoan,
      transitionRequest,
      dismissLoan,
      dismissRequest,
      notifyChanged,
    }),
    [
      repos,
      online,
      syncing,
      lastSyncAt,
      lastError,
      pendingCount,
      dataVersion,
      syncNow,
      requestLoan,
      requestItem,
      transitionLoan,
      transitionRequest,
      dismissLoan,
      dismissRequest,
      notifyChanged,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}
