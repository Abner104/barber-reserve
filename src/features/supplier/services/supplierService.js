import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";

function currentActor() {
  const profile = useAuthStore.getState().profile;
  return { performed_by: profile?.id ?? null, performed_by_name: profile?.full_name ?? null };
}

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

export async function getPublicProducts(supplierId) {
  let query = supabase
    .from("supplier_products")
    .select("*, suppliers(id, name, logo_url, whatsapp, description)")
    .eq("is_available", true)
    .order("category")
    .order("name");
  if (supplierId) query = query.eq("supplier_id", supplierId);
  const { data, error } = await query;
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

// El stock no se edita a mano — se mueve vía reposición/corrección auditada.
export async function adjustProductStock({ productId, supplierId, delta, reason = "" }) {
  const { data: product, error: fetchErr } = await supabase
    .from("supplier_products")
    .select("stock")
    .eq("id", productId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = product.stock ?? 0;
  const newStock = Math.max(0, current + delta);
  const { data: updated, error } = await supabase
    .from("supplier_products")
    .update({ stock: newStock })
    .eq("id", productId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("supplier_product_movements").insert({
    product_id:  productId,
    supplier_id: supplierId,
    delta,
    reason:      reason || (delta > 0 ? "Reposición" : "Ajuste"),
    ...currentActor(),
  });

  return updated;
}

export async function getProductMovements(productId) {
  const { data, error } = await supabase
    .from("supplier_product_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
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

export async function getAllSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, logo_url")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getSupplierById(id) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
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

// ── Referidos ──────────────────────────────────────────────
export async function getSupplierReferrals(supplierId) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id, name, slug, plan, created_at, trial_ends_at, subscribed_at")
    .eq("referred_by_supplier_id", supplierId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSupplierCommissions(supplierId) {
  const { data, error } = await supabase
    .from("referral_commissions")
    .select("*, barbershops(name, slug)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function slugify(text) {
  const base = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// Alta rápida de una barbería nueva desde el panel del proveedor.
// Crea la cuenta del dueño con contraseña temporal, para compartir por WhatsApp.
export async function createReferredShop({ supplierId, ownerName, ownerEmail, shopName, city, phone }) {
  const tempPassword = Math.random().toString(36).slice(-8) + "B1!";

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: ownerEmail.trim(),
    password: tempPassword,
    options: { data: { full_name: ownerName } },
  });
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("No se pudo crear el usuario");

  const { data: shopData, error: shopError } = await supabase
    .from("barbershops")
    .insert({
      name: shopName,
      slug: slugify(shopName),
      city, phone,
      plan: "trial",
      currency: "CLP",
      timezone: "America/Santiago",
      allows_delivery: true,
      delivery_fee_base: 3000,
      delivery_fee_per_km: 650,
      theme_mode: "dark",
      theme_color: "#FF6B2C",
      theme_font: "Inter",
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      referred_by_supplier_id: supplierId,
    })
    .select("id, slug").single();
  if (shopError) throw shopError;

  await supabase.from("profiles").upsert({
    id: userId, shop_id: shopData.id, role: "owner", full_name: ownerName, phone,
  }, { onConflict: "id" });

  await supabase.from("service_categories").insert([
    { shop_id: shopData.id, name: "Cortes",      sort_order: 1 },
    { shop_id: shopData.id, name: "Barba",       sort_order: 2 },
    { shop_id: shopData.id, name: "Combos",      sort_order: 3 },
    { shop_id: shopData.id, name: "Adicionales", sort_order: 4 },
  ]);

  await supabase.from("referral_commissions").insert({ supplier_id: supplierId, shop_id: shopData.id });

  return { slug: shopData.slug, email: ownerEmail.trim(), password: tempPassword, name: ownerName };
}
