import { supabase } from "../../../lib/supabase";
import { resolveShopId } from "./adminService";

const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = import.meta.env.VITE_WA_SECRET      ?? "barberos2026secret";

async function notifyLowStock(product, newStock) {
  try {
    const emoji = newStock === 0 ? "🚨" : "⚠️";
    const nivel = newStock === 0 ? "SIN STOCK" : "Stock bajo";
    const msg   = `${emoji} *${nivel}: ${product.name}*\n\nQuedan *${newStock} ${product.unit ?? "unidades"}* en inventario.\nMínimo configurado: ${product.stock_min ?? 3}\n\n💡 Recordá reponer antes de que se agote.`;

    // Usar la sesión del negocio (shop_${shopId}) — se escanea en Config del admin
    await fetch(`${WA_URL}/notify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` },
      body:    JSON.stringify({ barberId: `shop_${product.shop_id}`, message: msg }),
    });
  } catch {}
}

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
  // Alerta si el stock inicial ya está bajo el mínimo
  const min = data.stock_min ?? 3;
  if (data.stock <= min && data.stock >= 0) {
    await notifyLowStock(data, data.stock);
  }
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
  const { data: updated, error } = await supabase
    .from("inventory_products")
    .update({ stock: newStock })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // Registrar movimiento
  const shopId = resolveShopId();
  await supabase.from("inventory_movements").insert({
    product_id: id,
    shop_id:    shopId,
    delta,
    reason:     reason || (delta > 0 ? "Entrada manual" : "Salida manual"),
  });

  // Alerta WA si el stock queda bajo el mínimo
  const min = updated?.stock_min ?? 3;
  if (delta < 0 && newStock <= min) {
    await notifyLowStock(updated, newStock);
  }

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
