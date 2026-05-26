import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { applyTheme, resetTheme } from "../lib/applyTheme";

export const useAuthStore = create((set, get) => ({
  user:     null,
  profile:  null,
  shopName: null,
  shopLogo: null,
  loading:  true,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().loadProfile(session.user);
      }
    } catch (e) {
      console.error("Auth init error:", e);
    } finally {
      set({ loading: false });
    }

    // Escuchar cambios — cierre de sesión en otra pestaña, expiración, etc.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        set({ user: null, profile: null, loading: false });
        resetTheme();
        // Redirigir si está en una ruta protegida
        const path = window.location.pathname;
        if (path.startsWith("/admin") || path.startsWith("/barber") || path.startsWith("/superadmin") || path.startsWith("/supplier")) {
          window.location.href = "/login";
        }
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        // Solo cargar si no tenemos perfil aún (evitar doble carga)
        if (!get().profile) {
          try {
            await get().loadProfile(session.user);
          } catch (e) {
            console.error("loadProfile error:", e);
            set({ user: session.user, profile: null });
          }
        }
      }

      if (event === "TOKEN_REFRESHED" && session?.user) {
        set({ user: session.user });
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
          .select("name, logo_url, theme_mode, theme_color, theme_font")
          .eq("id", profile.shop_id)
          .maybeSingle();
        if (shop) {
          applyTheme(shop);
          set({ shopName: shop.name ?? null, shopLogo: shop.logo_url ?? null });
        }
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
