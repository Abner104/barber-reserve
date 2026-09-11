import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import BookingWizard from "../features/booking/components/BookingWizard";
import ShopIntro from "../features/booking/components/ShopIntro";
import { useBookingStore } from "../store/bookingStore";
import { applyTheme } from "../lib/applyTheme";
import { useShopManifest } from "../lib/useShopManifest";
import { getShopSubscriptionStatus } from "../lib/subscriptionStatus";
import { Clock } from "lucide-react";

async function getShopBySlug(slug) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id, name, slug, theme_mode, theme_color, theme_font, logo_url, is_active, lat, lng, address, city, delivery_fee_base, delivery_fee_per_km, allows_delivery")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No se encontró barbería: ${slug}`);
  return data;
}

export default function ShopBookingPage() {
  const { slug }    = useParams();
  const [searchParams] = useSearchParams();
  const preferredBarberId = searchParams.get("barber");
  const qc          = useQueryClient();
  const setShopId     = useBookingStore(s => s.setShopId);
  const setShopConfig = useBookingStore(s => s.setShopConfig);
  const setPreferredBarberId = useBookingStore(s => s.setPreferredBarberId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (preferredBarberId) setPreferredBarberId(preferredBarberId);
  }, [preferredBarberId]);

  // Leer del cache de ShopLandingPage (misma query key)
  const cached = qc.getQueryData(["shop", slug]);

  const { data: shop, isLoading, error } = useQuery({
    queryKey:     ["shop", slug],
    queryFn:      () => getShopBySlug(slug),
    initialData:  cached ?? undefined, // usa cache si existe → sin loading
  });

  // Aplicar tema y shopId tan pronto tengamos el shop
  const activeShop = shop ?? cached;
  useShopManifest(slug, activeShop?.logo_url);

  const { data: subStatus } = useQuery({
    queryKey: ["shop-sub-status", activeShop?.id],
    queryFn:  () => getShopSubscriptionStatus(activeShop.id),
    enabled:  !!activeShop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (activeShop?.id) {
      setShopId(activeShop.id);
      setShopConfig({
        lat:                activeShop.lat                ?? -33.4489,
        lng:                activeShop.lng                ?? -70.6693,
        // shopLat/shopLng sin fallback — para el link de Google Maps, no queremos
        // apuntar a Santiago por defecto si la barbería no cargó coordenadas propias
        shopLat:            activeShop.lat ?? null,
        shopLng:            activeShop.lng ?? null,
        address:            activeShop.address ?? "",
        city:               activeShop.city    ?? "",
        delivery_fee_base:  activeShop.delivery_fee_base  ?? 0,
        delivery_fee_per_km: activeShop.delivery_fee_per_km ?? 650,
        allows_delivery:    activeShop.allows_delivery    ?? true,
      });
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

  if (subStatus && !subStatus.is_active) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Clock size={24} color="#777" />
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{activeShop.name} no está disponible</p>
          <p style={{ fontSize: 13.5, color: "#777", lineHeight: 1.6 }}>
            Este negocio no puede recibir reservas por el momento. Intenta más tarde o contacta directamente a la barbería.
          </p>
        </div>
      </div>
    );
  }

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

  return <BookingWizard shopName={activeShop.name} shopLogo={activeShop.logo_url} slug={slug} />;
}
