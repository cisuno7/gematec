import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type NewActivityClientMode = 'new' | 'existing';

export type NewActivityType = {
  id: number;
  name: string;
  slug?: string;
  budgetPolicy?: string;
};

export type NewClientDraft = {
  name: string;
  document?: string;
  phone?: string;
  email: string;
  contactName: string;
  sectorName: string;
  subsectorName?: string;
};

export type ExistingClientSelection = {
  clientId: number;
  clientName?: string;
  sectorId: number;
  sectorName?: string;
};

export type NewActivityFlowState = {
  activityType?: NewActivityType;
  clientMode?: NewActivityClientMode;
  newClientDraft?: NewClientDraft;
  existingClient?: ExistingClientSelection;
};

type NewActivityFlowContextValue = {
  state: NewActivityFlowState;
  setActivityType: (t: NewActivityType) => void;
  setClientMode: (m: NewActivityClientMode) => void;
  setNewClientDraft: (draft: NewClientDraft) => void;
  setExistingClient: (sel: ExistingClientSelection) => void;
  resetFlow: () => void;
};

const NewActivityFlowContext = createContext<NewActivityFlowContextValue | null>(null);

export const NewActivityFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NewActivityFlowState>({});

  const setActivityType = useCallback((t: NewActivityType) => {
    setState(prev => ({ ...prev, activityType: t }));
  }, []);

  const setClientMode = useCallback((m: NewActivityClientMode) => {
    setState(prev => ({
      ...prev,
      clientMode: m,
      // limpar dados específicos quando alterna modo
      newClientDraft: m === 'new' ? prev.newClientDraft : undefined,
      existingClient: m === 'existing' ? prev.existingClient : undefined,
    }));
  }, []);

  const setNewClientDraft = useCallback((draft: NewClientDraft) => {
    setState(prev => ({ ...prev, newClientDraft: draft }));
  }, []);

  const setExistingClient = useCallback((sel: ExistingClientSelection) => {
    setState(prev => ({ ...prev, existingClient: sel }));
  }, []);

  const resetFlow = useCallback(() => setState({}), []);

  const value = useMemo<NewActivityFlowContextValue>(() => {
    return { state, setActivityType, setClientMode, setNewClientDraft, setExistingClient, resetFlow };
  }, [state, setActivityType, setClientMode, setNewClientDraft, setExistingClient, resetFlow]);

  return <NewActivityFlowContext.Provider value={value}>{children}</NewActivityFlowContext.Provider>;
};

export function useNewActivityFlow() {
  const ctx = useContext(NewActivityFlowContext);
  if (!ctx) {
    throw new Error('useNewActivityFlow deve ser usado dentro de NewActivityFlowProvider');
  }
  return ctx;
}


