import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { applyTheme, resetTheme } from "../lib/applyTheme";

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    // sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await get().loadProfile(session.user);
    }
    set({ loading: false });

    // escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().loadProfile(session.user);
      } else {
        set({ user: null, profile: null });
      }
    });
  },

  loadProfile: async (user) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    set({ user, profile });

    // Cargar y aplicar el tema del shop
    if (profile?.shop_id) {
      const { data: shop } = await supabase
        .from("barbershops")
        .select("theme_mode, theme_color, theme_font")
        .eq("id", profile.shop_id)
        .maybeSingle();
      if (shop) applyTheme(shop);
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
    resetTheme();
  },

  isAdmin: () => {
    const { profile } = get();
    return profile?.role === "owner" || profile?.role === "super_admin";
  },

  isSuperAdmin: () => get().profile?.role === "super_admin",
}));
