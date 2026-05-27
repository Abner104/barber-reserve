import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
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

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ["supplier-slug", slug],
    queryFn:  () => getSupplierBySlug(slug),
    enabled:  !!slug,
  });

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #2A2A2A", borderTopColor: "#FF6B2C", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!supplier) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 40 }}>📦</p>
      <p style={{ color: "#ef4444", fontSize: 16, fontWeight: 700 }}>Catálogo no encontrado</p>
      <p style={{ color: "#555", fontSize: 13 }}>Este enlace no existe o el proveedor está inactivo.</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A" }}>
      {/* Header del proveedor */}
      <div style={{ background: "#0F0F0F", borderBottom: "1px solid #1E1E1E", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        {supplier.logo_url ? (
          <img src={supplier.logo_url} alt={supplier.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,107,44,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
        )}
        <div>
          <p style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>{supplier.name}</p>
          {supplier.whatsapp && (
            <a href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "#25d166", textDecoration: "none", fontWeight: 600 }}>
              📱 Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Reutiliza el mismo componente de catálogo */}
      <SupplierCatalog supplierOverride={supplier} />
    </div>
  );
}
