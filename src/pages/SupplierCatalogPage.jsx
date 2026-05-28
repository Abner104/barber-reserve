import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { applyTheme, resetTheme } from "../lib/applyTheme";
import SupplierCatalog from "../features/supplier/components/SupplierCatalog";

async function getSupplierBySlug(slug) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default function SupplierCatalogPage() {
  const { slug } = useParams();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier-slug", slug],
    queryFn:  () => getSupplierBySlug(slug),
    enabled:  !!slug,
  });

  useEffect(() => {
    if (!supplier) return;
    applyTheme({
      theme_mode:  supplier.theme_mode  || "dark",
      theme_color: supplier.theme_color || "#FF6B2C",
      theme_font:  supplier.theme_font  || "Inter",
    });
    return () => resetTheme();
  }, [supplier]);

  const brand = supplier?.theme_color || "#FF6B2C";

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0A0A0A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border, #2A2A2A)", borderTopColor: brand, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!supplier) return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0A0A0A)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 40 }}>📦</p>
      <p style={{ color: "#ef4444", fontSize: 16, fontWeight: 700 }}>Catálogo no encontrado</p>
      <p style={{ color: "var(--text-faint, #555)", fontSize: 13 }}>Este enlace no existe o el proveedor está inactivo.</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        {supplier.logo_url ? (
          <img src={supplier.logo_url} alt={supplier.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${brand}22`, border: `1px solid ${brand}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: brand }}>
            {supplier.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <p style={{ fontWeight: 800, color: "var(--text)", fontSize: 16 }}>{supplier.name}</p>
          {supplier.whatsapp && (
            <a href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "#25d166", textDecoration: "none", fontWeight: 600 }}>
              📱 Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>

      <SupplierCatalog supplierOverride={supplier} />
    </div>
  );
}
