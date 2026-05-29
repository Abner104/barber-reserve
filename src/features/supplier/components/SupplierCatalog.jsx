import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, X, Package, Loader2, Check, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { getPublicProducts, createOrder, getFirstSupplier } from "../services/supplierService";
import { formatCurrency } from "../../../lib/utils";

const WA_URL    = import.meta.env.VITE_WA_SERVICE_URL ?? "http://localhost:3001";
const WA_SECRET = import.meta.env.VITE_WA_SECRET ?? "barberos2026secret";

async function notifySupplierWA(supplierId, order, items) {
  try {
    const lines = items.map(i => `• ${i.name} × ${i.qty} = ${formatCurrency(i.price * i.qty)}`).join("\n");
    const msg = [
      `🛍️ *Nuevo pedido recibido*`,
      ``,
      `👤 Cliente: ${order.contact_name}`,
      `📱 Teléfono: ${order.contact_phone}`,
      ``,
      lines,
      ``,
      `💰 Total: ${formatCurrency(order.total)}`,
      order.note ? `📝 Nota: ${order.note}` : "",
    ].filter(Boolean).join("\n");

    await fetch(`${WA_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WA_SECRET}` },
      body: JSON.stringify({ barberId: `supplier_${supplierId}`, message: msg }),
    });
  } catch { /* silencioso — no romper el flujo si WA no está conectado */ }
}

const DEFAULT_COLOR = "#FF6B2C";

export default function SupplierCatalog({ supplierOverride } = {}) {
  const [cart, setCart]         = useState({}); // { [productId]: qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [form, setForm]         = useState({ name: "", phone: "", note: "" });
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess]   = useState(false);
  const [lightbox, setLightbox]   = useState(null); // { images: [], idx: number }
  const [imgIndexes, setImgIndexes] = useState({}); // { [productId]: currentImageIndex }
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const { data: supplierFetched } = useQuery({
    queryKey: ["public-supplier"],
    queryFn:  getFirstSupplier,
    enabled:  !supplierOverride,
  });
  const supplier = supplierOverride ?? supplierFetched;
  const O = supplier?.theme_color || DEFAULT_COLOR;
  const font = supplier?.theme_font || "Inter";

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-products", supplier?.id],
    queryFn:  () => getPublicProducts(supplier?.id),
    enabled:  !!supplier?.id,
  });

  const orderMut = useMutation({
    mutationFn: createOrder,
    onSuccess: (savedOrder) => {
      setSuccess(true);
      setCart({});
      // Notificar al proveedor por WA si tiene sesión activa
      if (supplier?.id) notifySupplierWA(supplier.id, savedOrder, savedOrder.items ?? []);
    },
    onError: () => toast.error("Error al enviar el pedido. Intenta de nuevo."),
  });

  function addToCart(p) {
    setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
  }
  function removeOne(id) {
    setCart(c => {
      const qty = (c[id] ?? 0) - 1;
      if (qty <= 0) { const next = { ...c }; delete next[id]; return next; }
      return { ...c, [id]: qty };
    });
  }
  function clearCart() { setCart({}); }

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === id);
    return p ? { ...p, qty } : null;
  }).filter(Boolean);

  const cartTotal  = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount  = cartItems.reduce((sum, i) => sum + i.qty, 0);

  function handleOrder() {
    const errors = {};
    if (!form.name.trim())  errors.name  = "Ingresa tu nombre";
    if (!form.phone.trim()) errors.phone = "Ingresa tu teléfono";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    const items = cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit ?? "unidad" }));
    orderMut.mutate({
      supplierId:   supplier.id,
      shopId:       null,
      barberId:     null,
      items,
      note:         form.note,
      contactName:  form.name,
      contactPhone: form.phone,
    });
  }

  // Enviar pedido por WhatsApp directo si hay número del proveedor
  function sendViaWA() {
    const phone = supplier?.whatsapp?.replace(/\D/g, "");
    if (!phone) return;
    const intl  = phone.startsWith("56") ? phone : `56${phone}`;
    const lines = cartItems.map(i => `• ${i.name} × ${i.qty} = ${formatCurrency(i.price * i.qty)}`).join("\n");
    const msg   = encodeURIComponent(
      `Hola! Soy ${form.name} y quisiera hacer el siguiente pedido:\n\n${lines}\n\nTotal: ${formatCurrency(cartTotal)}\n\nTeléfono de contacto: ${form.phone}${form.note ? `\nNota: ${form.note}` : ""}`
    );
    window.open(`https://wa.me/${intl}?text=${msg}`, "_blank");
  }

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (!supplier && !isLoading) return null;

  return (
    <section id="proveedor" style={{ padding: "80px 0", background: "var(--bg2)", fontFamily: `'${font}', system-ui, sans-serif` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ color: O, fontSize: 12, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
              Proveedor oficial
            </p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginBottom: 10 }}>
              {supplier?.name ?? "Catálogo de productos"}
            </h2>
            {supplier?.description && (
              <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 520, lineHeight: 1.6 }}>{supplier.description}</p>
            )}
          </div>

          {/* Carrito flotante */}
          {cartCount > 0 && (
            <button onClick={() => setCartOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
              borderRadius: 14, background: O, color: "var(--text)", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 15, boxShadow: "0 4px 20px rgba(255,107,44,0.35)",
            }}>
              <ShoppingCart size={18} />
              Ver carrito
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: "1px 8px", fontSize: 13, fontWeight: 800 }}>
                {cartCount}
              </span>
            </button>
          )}
        </div>

        {/* ── Barra de categorías (sticky, mobile-first) ── */}
        {Object.keys(grouped).length > 1 && (
          <>
            {/* Desktop: pills horizontales */}
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 28, paddingBottom: 4, scrollbarWidth: "none" }}>
              <button onClick={() => setActiveCategory(null)}
                style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${!activeCategory ? O : "var(--border)"}`, background: !activeCategory ? O : "transparent", color: !activeCategory ? "#fff" : "var(--text-faint)", fontWeight: !activeCategory ? 700 : 400, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Todo
              </button>
              {Object.keys(grouped).map(cat => (
                <button key={cat} onClick={() => { setActiveCategory(cat); document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${activeCategory === cat ? O : "var(--border)"}`, background: activeCategory === cat ? O : "transparent", color: activeCategory === cat ? "#fff" : "var(--text-faint)", fontWeight: activeCategory === cat ? 700 : 400, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Mobile: botón hamburguesa flotante (solo cuando hay carrito o siempre) */}
            <style>{`
              @media (max-width: 640px) {
                .cat-pills { display: none !important; }
                .cat-fab    { display: flex !important; }
              }
              @media (min-width: 641px) {
                .cat-fab { display: none !important; }
              }
            `}</style>
          </>
        )}

        {/* FAB de categorías — solo mobile */}
        {Object.keys(grouped).length > 1 && (
          <div className="cat-fab" style={{ display: "none", position: "fixed", bottom: cartCount > 0 ? 90 : 24, left: 20, zIndex: 79 }}>
            <button onClick={() => setCatMenuOpen(true)}
              style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface)", border: `2px solid ${O}`, cursor: "pointer", color: O, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Drawer categorías mobile */}
        {catMenuOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            onClick={() => setCatMenuOpen(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
            <div onClick={e => e.stopPropagation()}
              style={{ position: "relative", background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
              <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", marginBottom: 14 }}>Categorías</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button onClick={() => { setActiveCategory(null); setCatMenuOpen(false); }}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: !activeCategory ? `rgba(255,107,44,0.1)` : "transparent", color: !activeCategory ? O : "var(--text)", fontWeight: !activeCategory ? 700 : 400, fontSize: 15, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  Todos los productos
                  {!activeCategory && <span style={{ color: O, fontSize: 16 }}>✓</span>}
                </button>
                {Object.keys(grouped).map(cat => (
                  <button key={cat} onClick={() => { setActiveCategory(cat); setCatMenuOpen(false); setTimeout(() => document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }}
                    style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: activeCategory === cat ? `rgba(255,107,44,0.1)` : "transparent", color: activeCategory === cat ? O : "var(--text)", fontWeight: activeCategory === cat ? 700 : 400, fontSize: 15, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {cat}
                    <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{grouped[cat].length}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Catálogo */}
        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 260, borderRadius: 16, background: "#141414" }} />)}
          </div>
        )}

        {!isLoading && Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 16, paddingLeft: 4 }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {items.map(p => {
                const qty    = cart[p.id] ?? 0;
                // Armar lista de imágenes: images[] tiene prioridad, fallback a image_url
                const imgs   = (p.images && p.images.length > 0) ? p.images : (p.image_url ? [p.image_url] : []);
                const imgIdx = imgIndexes[p.id] ?? 0;
                const curImg = imgs[imgIdx] ?? null;
                return (
                  <div key={p.id} style={{ background: "var(--surface)", border: `1px solid ${qty > 0 ? O + "55" : "var(--surface2)"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>

                    {/* ── Galería de imágenes ── */}
                    <div style={{ position: "relative", width: "100%", height: 180, background: "var(--surface2)" }}>
                      {curImg ? (
                        <img
                          src={curImg}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in", background: "var(--surface2)" }}
                          onClick={() => setLightbox({ images: imgs, idx: imgIdx })}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Package size={40} color="var(--text-faint)" style={{ opacity: 0.3 }} />
                        </div>
                      )}

                      {/* Lupa */}
                      {curImg && (
                        <button onClick={() => setLightbox({ images: imgs, idx: imgIdx })}
                          style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 8, padding: 5, cursor: "pointer", color: "#fff", display: "flex" }}>
                          <ZoomIn size={14} />
                        </button>
                      )}

                      {/* Flechas navegación multi-imagen */}
                      {imgs.length > 1 && (
                        <>
                          <button onClick={() => setImgIndexes(ix => ({ ...ix, [p.id]: (imgIdx - 1 + imgs.length) % imgs.length }))}
                            style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", color: "#fff", display: "flex" }}>
                            <ChevronLeft size={16} />
                          </button>
                          <button onClick={() => setImgIndexes(ix => ({ ...ix, [p.id]: (imgIdx + 1) % imgs.length }))}
                            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", color: "#fff", display: "flex" }}>
                            <ChevronRight size={16} />
                          </button>
                          {/* Dots */}
                          <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
                            {imgs.map((_, i) => (
                              <div key={i} onClick={() => setImgIndexes(ix => ({ ...ix, [p.id]: i }))}
                                style={{ width: i === imgIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === imgIdx ? O : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 4 }}>{p.name}</p>
                      {p.description && <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 10, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ fontWeight: 800, color: O, fontSize: 17 }}>{formatCurrency(p.price)}</p>
                        {qty === 0 ? (
                          <button onClick={() => addToCart(p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: O, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                            <Plus size={14} /> Agregar
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => removeOne(p.id)} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Minus size={13} />
                            </button>
                            <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 16, minWidth: 16, textAlign: "center" }}>{qty}</span>
                            <button onClick={() => addToCart(p)} style={{ width: 30, height: 30, borderRadius: 8, background: O, border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Plus size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Botón flotante móvil */}
        {cartCount > 0 && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 80 }}>
            <button onClick={() => setCartOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderRadius: 50, background: O, color: "var(--text)", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 15, boxShadow: "0 6px 24px rgba(255,107,44,0.4)" }}>
              <ShoppingCart size={20} />
              {cartCount} · {formatCurrency(cartTotal)}
            </button>
          </div>
        )}
      </div>

      {/* Drawer carrito */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={() => setCartOpen(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: "relative", background: "var(--surface)", borderRadius: "24px 24px 0 0", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
            </div>

            <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Tu carrito ({cartCount})</p>
              <button onClick={() => setCartOpen(false)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg)", borderRadius: 12 }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={20} color="#333" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{item.name}</p>
                    <p style={{ color: O, fontSize: 13, fontWeight: 700 }}>{formatCurrency(item.price * item.qty)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => removeOne(item.id)} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 15, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => addToCart(item)} style={{ width: 28, height: 28, borderRadius: 7, background: O, border: "none", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: "16px 20px 32px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 18 }}>{formatCurrency(cartTotal)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setOrderOpen(true); }}
                style={{ width: "100%", padding: 16, borderRadius: 14, background: O, color: "var(--text)", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(255,107,44,0.3)" }}>
                Hacer pedido →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 10, cursor: "pointer", color: "#fff", display: "flex", zIndex: 10 }}>
            <X size={20} />
          </button>
          <img src={lightbox.images[lightbox.idx]} alt="zoom"
            style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          />
          {lightbox.images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: (lb.idx - 1 + lb.images.length) % lb.images.length })); }}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: 10, cursor: "pointer", color: "#fff", display: "flex" }}>
                <ChevronLeft size={24} />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: (lb.idx + 1) % lb.images.length })); }}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: 10, cursor: "pointer", color: "#fff", display: "flex" }}>
                <ChevronRight size={24} />
              </button>
              <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                {lightbox.images.map((_, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: i })); }}
                    style={{ width: i === lightbox.idx ? 20 : 8, height: 8, borderRadius: 4, background: i === lightbox.idx ? O : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal pedido */}
      {orderOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !orderMut.isPending && setOrderOpen(false)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}
            onClick={e => e.stopPropagation()}>

            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid #4ade80", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check size={28} color="#4ade80" />
                </div>
                <p style={{ fontWeight: 800, fontSize: 20, color: "var(--text)", marginBottom: 8 }}>¡Pedido enviado! 🎉</p>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  El proveedor recibirá tu pedido y te contactará pronto.
                </p>
                {supplier?.whatsapp && (
                  <button onClick={sendViaWA} style={{ width: "100%", padding: 14, borderRadius: 12, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25d166", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                    Enviar también por WhatsApp
                  </button>
                )}
                <button onClick={() => { setOrderOpen(false); setSuccess(false); }} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Confirmar pedido</p>
                  <button onClick={() => setOrderOpen(false)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Resumen */}
                <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                  {cartItems.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>{i.name} × {i.qty}</span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>{formatCurrency(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Total</span>
                    <span style={{ fontWeight: 800, color: O }}>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                {[
                  { key: "name",  label: "Tu nombre *",    placeholder: "Juan Pérez", type: "text" },
                  { key: "phone", label: "Teléfono *",     placeholder: "+56 9 1234 5678", type: "tel" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFormErrors(fe => ({ ...fe, [key]: null })); }}
                      placeholder={placeholder}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--bg)", border: `1px solid ${formErrors[key] ? "#ef4444" : "var(--border)"}`, color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                    {formErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{formErrors[key]}</p>}
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>NOTA (opcional)</label>
                  <textarea
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Ej: Necesito entrega urgente, dirección de envío..."
                    rows={2}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
                  />
                </div>

                <button onClick={handleOrder} disabled={orderMut.isPending}
                  style={{ width: "100%", padding: 16, borderRadius: 14, background: O, color: "var(--text)", fontWeight: 800, fontSize: 16, border: "none", cursor: orderMut.isPending ? "not-allowed" : "pointer", opacity: orderMut.isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {orderMut.isPending ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Enviando...</> : "Enviar pedido"}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
