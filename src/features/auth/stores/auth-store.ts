import { create } from 'zustand';

export type AuthFlow = 'signIn' | 'signUp';

interface AuthStoreState {
  flow: AuthFlow;
  setFlow: (flow: AuthFlow) => void;
  toggleFlow: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  flow: 'signIn',
  setFlow: (flow) => set({ flow }),
  toggleFlow: () => set({ flow: get().flow === 'signIn' ? 'signUp' : 'signIn' }),
}));
