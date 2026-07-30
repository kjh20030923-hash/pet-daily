import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. The app is running in local demo mode.',
  );
}

// Supabase validates URL/key during client creation. In a public demo deployment
// we still want the local-first app shell to render even when cloud env vars are
// omitted, so we use harmless placeholders and keep cloud features gated by
// isSupabaseConfigured.
const demoSupabaseUrl = 'https://demo.supabase.co';
const demoSupabaseAnonKey = 'demo-anon-key';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : demoSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey : demoSupabaseAnonKey,
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  },
);
