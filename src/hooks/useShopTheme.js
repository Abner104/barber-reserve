import { useAuthStore } from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

async function fetchShopTheme(shopId) {
  if (!shopId) return null;
  const { data } = await supabase
    .from("barbershops")
    .select("name, logo_url, theme_color, theme_font, theme_mode")
    .eq("id", shopId)
    .maybeSingle();
  return data;
}

export function useShopTheme() {
  const profile = useAuthStore(s => s.profile);
  const shopId  = profile?.shop_id;

  const { data } = useQuery({
    queryKey: ["shop-theme", shopId],
    queryFn:  () => fetchShopTheme(shopId),
    enabled:  !!shopId,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  return {
    shopName:  data?.name        ?? null,
    logoUrl:   data?.logo_url    ?? null,
    color:     data?.theme_color ?? "#FF6B2C",
    font:      data?.theme_font  ?? "Inter",
    mode:      data?.theme_mode  ?? "dark",
  };
}
