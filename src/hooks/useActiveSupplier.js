import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { getSupplierByProfileId, getSupplierById } from "../features/supplier/services/supplierService";

export const IMPERSONATE_KEY = "sa_impersonate_supplier_id";

// Notifica a todos los hooks useActiveSupplier montados que sessionStorage cambió
// (sessionStorage no es reactivo por sí solo, así que sin esto React nunca se
// entera de que otro componente eligió/cambió el proveedor impersonado).
const listeners = new Set();
export function notifyImpersonateChanged() {
  listeners.forEach(fn => fn());
}

// Resuelve qué proveedor está operando: el propio del usuario logueado, o el que
// un super_admin eligió impersonar (ver SupplierLayout). Todas las páginas del
// panel /supplier deben usar este hook en vez de consultar getSupplierByProfileId directo,
// para que "Cambiar proveedor" funcione en toda la sección.
export function useActiveSupplier() {
  const { user, profile } = useAuthStore();
  const isSuperAdmin = profile?.role === "super_admin";
  const [impersonateId, setImpersonateId] = useState(() => sessionStorage.getItem(IMPERSONATE_KEY) || "");

  useEffect(() => {
    const sync = () => setImpersonateId(sessionStorage.getItem(IMPERSONATE_KEY) || "");
    listeners.add(sync);
    return () => listeners.delete(sync);
  }, []);

  const effectiveId = isSuperAdmin ? impersonateId : "";

  return useQuery({
    queryKey: ["active-supplier", user?.id, effectiveId],
    queryFn:  () => (effectiveId ? getSupplierById(effectiveId) : getSupplierByProfileId(user.id)),
    enabled:  !!user?.id,
  });
}
