import { supabase } from "./supabase";

/**
 * Calcula el estado de suscripción de una barbería: 30 días gratis desde su
 * creación + 30 días por cada pago registrado en shop_payments.
 * Usa el RPC get_shop_subscription_status (security definer) en vez de leer
 * shop_payments directo — esa tabla solo la puede leer super_admin por RLS,
 * pero este estado lo necesitan también el owner y el booking público anónimo.
 * Requiere sql/migration_subscription_status_rpc.sql aplicado en Supabase.
 */
export async function getShopSubscriptionStatus(shopId) {
  const { data, error } = await supabase
    .rpc("get_shop_subscription_status", { p_shop_id: shopId })
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
