import { supabase } from "../../../lib/supabase";

// ── Productos ──────────────────────────────────────────────
export async function getSupplierProducts(supplierId) {
  const { data, error } = await supabase
    .from("supplier_products")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("category")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getPublicProducts() {
  const { data, error } = await supabase
    .from("supplier_products")
    .select("*, suppliers(id, name, logo_url, whatsapp, description)")
    .eq("is_available", true)
    .order("category")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function upsertProduct(product) {
  const { data, error } = await supabase
    .from("supplier_products")
    .upsert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("supplier_products").delete().eq("id", id);
  if (error) throw error;
}

// ── Pedidos ────────────────────────────────────────────────
export async function createOrder({ supplierId, shopId, barberId, items, note, contactName, contactPhone }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const { data, error } = await supabase
    .from("supplier_orders")
    .insert({
      supplier_id:   supplierId,
      shop_id:       shopId,
      barber_id:     barberId,
      items,
      total,
      note:          note || null,
      contact_name:  contactName,
      contact_phone: contactPhone,
      status:        "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSupplierOrders(supplierId) {
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("*, barbershops(name)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from("supplier_orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// ── Supplier profile ───────────────────────────────────────
export async function getSupplierByProfileId(profileId) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFirstSupplier() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
