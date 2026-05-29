import { createBrowserRouter } from "react-router-dom";

import AdminLayout       from "../layouts/AdminLayout";
import SuperAdminLayout  from "../layouts/SuperAdminLayout";
import BarberLayout      from "../layouts/BarberLayout";
import SupplierLayout    from "../layouts/SupplierLayout";
import SaasLandingPage   from "../pages/SaasLandingPage";
import NotFoundPage      from "../pages/NotFoundPage";
import ShopLandingPage  from "../pages/ShopLandingPage";
import ShopBookingPage  from "../pages/ShopBookingPage";
import LoginPage          from "../pages/LoginPage";
import RegisterPage       from "../pages/RegisterPage";
import SubscriptionPage   from "../pages/SubscriptionPage";
import ResetPasswordPage  from "../pages/ResetPasswordPage";

import DashboardPage from "../features/admin/pages/DashboardPage";
import BarbersPage   from "../features/admin/pages/BarbersPage";
import ServicesPage  from "../features/admin/pages/ServicesPage";
import BookingsPage  from "../features/admin/pages/BookingsPage";
import SettingsPage  from "../features/admin/pages/SettingsPage";
import CajaPage      from "../features/admin/pages/CajaPage";
import InventoryPage from "../features/admin/pages/InventoryPage";

import OverviewPage            from "../features/superadmin/pages/OverviewPage";
import ShopsPage               from "../features/superadmin/pages/ShopsPage";
import PricingPage             from "../features/superadmin/pages/PricingPage";
import SuppliersPage           from "../features/superadmin/pages/SuppliersPage";
import SuperAdminSettingsPage  from "../features/superadmin/pages/SuperAdminSettingsPage";

import SupplierDashboard     from "../features/supplier/pages/SupplierDashboard";
import SupplierProductsPage  from "../features/supplier/pages/SupplierProductsPage";
import SupplierOrdersPage    from "../features/supplier/pages/SupplierOrdersPage";
import SupplierSettingsPage  from "../features/supplier/pages/SupplierSettingsPage";
import SupplierSalesPage     from "../features/supplier/pages/SupplierSalesPage";
import SupplierCreditsPage   from "../features/supplier/pages/SupplierCreditsPage";
import SupplierCatalogPage   from "../pages/SupplierCatalogPage";

import AgendaPage     from "../features/barber/pages/AgendaPage";
import BarberCajaPage from "../features/barber/pages/CajaPage";
import PerfilPage     from "../features/barber/pages/PerfilPage";
import PortfolioPage  from "../features/barber/pages/PortfolioPage";
import HistorialPage  from "../features/barber/pages/HistorialPage";

export const router = createBrowserRouter([
  // ── SAAS LANDING ──
  { path: "/", element: <SaasLandingPage /> },

  // ── AUTH ── (rutas fijas ANTES de /:slug)
  { path: "/login",          element: <LoginPage />          },
  { path: "/register",       element: <RegisterPage />       },
  { path: "/subscription",   element: <SubscriptionPage />   },
  { path: "/reset-password", element: <ResetPasswordPage />  },

  // ── ADMIN ── (ruta fija ANTES de /:slug)
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true,       element: <DashboardPage /> },
      { path: "bookings",  element: <BookingsPage />  },
      { path: "barbers",   element: <BarbersPage />   },
      { path: "services",  element: <ServicesPage />  },
      { path: "settings",  element: <SettingsPage />  },
      { path: "caja",      element: <CajaPage />      },
      { path: "inventory", element: <InventoryPage /> },
    ],
  },

  // ── SUPER ADMIN ── (ruta fija ANTES de /:slug)
  {
    path: "/superadmin",
    element: <SuperAdminLayout />,
    children: [
      { index: true,          element: <OverviewPage />   },
      { path: "shops",        element: <ShopsPage />              },
      { path: "suppliers",    element: <SuppliersPage />          },
      { path: "pricing",      element: <PricingPage />            },
      { path: "settings",     element: <SuperAdminSettingsPage /> },
    ],
  },

  // ── PORTAL DEL PROVEEDOR ──
  {
    path: "/supplier",
    element: <SupplierLayout />,
    children: [
      { index: true,         element: <SupplierDashboard />     },
      { path: "products",    element: <SupplierProductsPage />  },
      { path: "orders",      element: <SupplierOrdersPage />    },
      { path: "sales",       element: <SupplierSalesPage />     },
      { path: "credits",     element: <SupplierCreditsPage />   },
      { path: "settings",    element: <SupplierSettingsPage />  },
    ],
  },

  // ── PORTAL DEL BARBERO ──
  {
    path: "/barber",
    element: <BarberLayout />,
    children: [
      { index: true,         element: <AgendaPage />    },
      { path: "historial",   element: <HistorialPage /> },
      { path: "caja",        element: <BarberCajaPage /> },
      { path: "portfolio",   element: <PortfolioPage /> },
      { path: "perfil",      element: <PerfilPage />    },
    ],
  },

  // ── CATÁLOGO PÚBLICO DEL PROVEEDOR ── (antes de /:slug)
  { path: "/catalogo/:slug", element: <SupplierCatalogPage /> },

  // ── BARBERÍAS por slug — AL FINAL para no interceptar rutas fijas ──
  { path: "/:slug",         element: <ShopLandingPage /> },
  { path: "/:slug/booking", element: <ShopBookingPage /> },

  // ── 404 ──
  { path: "*", element: <NotFoundPage /> },
]);
