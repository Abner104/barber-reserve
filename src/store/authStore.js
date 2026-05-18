import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { applyTheme, resetTheme } from "../lib/applyTheme";

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().loadProfile(session.user);
      }
    } catch (e) {
      console.error("Auth init error:", e);
    } finally {
      // Siempre terminar el loading — nunca quedarse atascado
      set({ loading: false });
    }

    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ loading: true });
        try {
          await get().loadProfile(session.user);
        } finally {
          set({ loading: false });
        }
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  loadProfile: async (user) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      set({ user, profile: profile ?? null });

      if (profile?.shop_id) {
        const { data: shop } = await supabase
          .from("barbershops")
          .select("theme_mode, theme_color, theme_font")
          .eq("id", profile.shop_id)
          .maybeSingle();
        if (shop) applyTheme(shop);
      }
    } catch (e) {
      console.error("loadProfile error:", e);
      set({ user, profile: null });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error:", e);
    } finally {
      set({ user: null, profile: null, loading: false });
      resetTheme();
    }
  },

  isAdmin: () => {
    const { profile } = get();
    return profile?.role === "owner" || profile?.role === "super_admin";
  },

  isSuperAdmin: () => get().profile?.role === "super_admin",
}));
