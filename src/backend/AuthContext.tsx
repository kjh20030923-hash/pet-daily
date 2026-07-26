import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authService, petService } from './services';
import { supabase } from './supabase';
import { Pet } from './types';

type AuthContextValue = {
  authVisible: boolean;
  initializing: boolean;
  user: User | null;
  session: Session | null;
  currentPet: Pet | null;
  authMessage: string | null;
  openAuth: () => void;
  closeAuth: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<'signedIn' | 'confirmationRequired'>;
  signOut: () => Promise<void>;
  refreshPet: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_PET_NAME = '康七七';

const ensureDefaultPet = async () => {
  const pets = await petService.listPets();
  if (pets.length > 0) return pets[0];
  return petService.createPet({
    name: DEFAULT_PET_NAME,
    medication_notes: '佐尼沙胺库存和用药记录可在健康中心继续完善',
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authVisible, setAuthVisible] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const refreshPet = async () => {
    const pet = await ensureDefaultPet();
    setCurrentPet(pet);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const existingSession = await authService.getSession();
        if (!mounted) return;
        setSession(existingSession);
        if (existingSession) {
          await refreshPet();
        }
      } catch (error) {
        if (mounted) setAuthMessage(error instanceof Error ? error.message : '登录状态检查失败');
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setCurrentPet(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || currentPet) return;
    refreshPet().catch((error) => {
      setAuthMessage(error instanceof Error ? error.message : '默认宠物创建失败');
    });
  }, [currentPet, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authVisible,
      initializing,
      user: session?.user ?? null,
      session,
      currentPet,
      authMessage,
      openAuth: () => setAuthVisible(true),
      closeAuth: () => setAuthVisible(false),
      signIn: async (email, password) => {
        setAuthMessage(null);
        const data = await authService.signIn(email, password);
        setSession(data.session);
        await refreshPet();
        setAuthVisible(false);
      },
      signUp: async (email, password) => {
        setAuthMessage(null);
        const data = await authService.signUp(email, password);
        if (!data.session) {
          setAuthMessage('注册成功，请先到邮箱确认账号，然后再登录。');
          return 'confirmationRequired';
        }
        setSession(data.session);
        await refreshPet();
        setAuthVisible(false);
        return 'signedIn';
      },
      signOut: async () => {
        await authService.signOut();
        setSession(null);
        setCurrentPet(null);
      },
      refreshPet,
    }),
    [authMessage, authVisible, currentPet, initializing, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
