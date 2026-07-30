import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { getSupplierByProfileId, getSupplierById } from "../features/supplier/services/supplierService";

const IMPERSONATE_KEY = "sa_impersonate_supplier_id";

// Resuelve qué proveedor está operando: el propio del usuario logueado, o el que
// un super_admin eligió impersonar (ver SupplierLayout). Todas las páginas del
// panel /supplier deben usar este hook en vez de consultar getSupplierByProfileId directo,
// para que "Cambiar proveedor" funcione en toda la sección.
export function useActiveSupplier() {
  const { user, profile } = useAuthStore();
  const isSuperAdmin = profile?.role === "super_admin";
  const impersonateId = isSuperAdmin ? (sessionStorage.getItem(IMPERSONATE_KEY) || "") : "";

  return useQuery({
    queryKey: ["active-supplier", user?.id, impersonateId],
    queryFn:  () => (impersonateId ? getSupplierById(impersonateId) : getSupplierByProfileId(user.id)),
    enabled:  !!user?.id,
  });
}
