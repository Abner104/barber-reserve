import { supabase } from "../../../lib/supabase";
import { resolveShopId } from "./adminService";

// ── Productos ──────────────────────────────────────────────
export async function getInventory() {
  const shopId = resolveShopId();
  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("shop_id", shopId)
    .order("category")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function upsertInventoryProduct(product) {
  const shopId = resolveShopId();
  const { data, error } = await supabase
    .from("inventory_products")
    .upsert({ ...product, shop_id: shopId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInventoryProduct(id) {
  const { error } = await supabase.from("inventory_products").delete().eq("id", id);
  if (error) throw error;
}

export async function adjustStock(id, delta, reason = "") {
  const { data: product, error: fetchErr } = await supabase
    .from("inventory_products")
    .select("stock")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  const newStock = Math.max(0, (product.stock ?? 0) + delta);
  const { error } = await supabase
    .from("inventory_products")
    .update({ stock: newStock })
    .eq("id", id);
  if (error) throw error;

  // Registrar movimiento
  const shopId = resolveShopId();
  await supabase.from("inventory_movements").insert({
    product_id: id,
    shop_id:    shopId,
    delta,
    reason:     reason || (delta > 0 ? "Entrada manual" : "Salida manual"),
  });
  return newStock;
}

// ── Ventas rápidas (venta directa desde el local) ──────────
export async function registerSale({ productId, qty, price }) {
  await adjustStock(productId, -qty, "Venta en local");
  const shopId = resolveShopId();
  const { data, error } = await supabase
    .from("inventory_sales")
    .insert({ shop_id: shopId, product_id: productId, qty, price_unit: price, total: price * qty })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInventorySales({ from, to } = {}) {
  const shopId = resolveShopId();
  let query = supabase
    .from("inventory_sales")
    .select("*, inventory_products(name, category)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (from) query = query.gte("created_at", from);
  if (to)   query = query.lte("created_at", to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getInventoryMovements(productId) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
