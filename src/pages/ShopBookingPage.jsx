import { useParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import BookingWizard from "../features/booking/components/BookingWizard";
import ShopIntro from "../features/booking/components/ShopIntro";
import { useBookingStore } from "../store/bookingStore";
import { applyTheme } from "../lib/applyTheme";

async function getShopBySlug(slug) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id, name, slug, theme_mode, theme_color, theme_font, logo_url, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No se encontró barbería: ${slug}`);
  return data;
}

export default function ShopBookingPage() {
  const { slug }    = useParams();
  const qc          = useQueryClient();
  const setShopId   = useBookingStore(s => s.setShopId);
  const [ready, setReady] = useState(false);

  // Leer del cache de ShopLandingPage (misma query key)
  const cached = qc.getQueryData(["shop", slug]);

  const { data: shop, isLoading, error } = useQuery({
    queryKey:     ["shop", slug],
    queryFn:      () => getShopBySlug(slug),
    initialData:  cached ?? undefined, // usa cache si existe → sin loading
  });

  // Aplicar tema y shopId tan pronto tengamos el shop
  const activeShop = shop ?? cached;

  useEffect(() => {
    if (activeShop?.id) {
      setShopId(activeShop.id);
      applyTheme(activeShop);
      document.title = `${activeShop.name} — Reservar`;
    }
  }, [activeShop?.id]);

  // Si tenemos el shop del cache, aplicar tema síncronamente antes del primer render
  if (cached && !activeShop?.id) {
    setShopId(cached.id);
    applyTheme(cached);
  }

  if (isLoading && !cached) {
    return <div style={{ minHeight: "100vh", background: "#0A0A0A" }} />;
  }

  if (error && !cached) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#ef4444", fontSize: 16 }}>Barbería no encontrada</p>
        <p style={{ color: "#555", fontSize: 13 }}>{error?.message}</p>
      </div>
    );
  }

  if (!activeShop) return <Navigate to="/" replace />;

  if (!ready) {
    return (
      <ShopIntro
        shopName={activeShop.name}
        logoUrl={activeShop.logo_url}
        color={activeShop.theme_color ?? "#FF6B2C"}
        onDone={() => setReady(true)}
      />
    );
  }

  return <BookingWizard shopName={activeShop.name} slug={slug} />;
}
