import { createBrowserRouter } from "react-router-dom";

import AdminLayout       from "../layouts/AdminLayout";
import SuperAdminLayout  from "../layouts/SuperAdminLayout";
import BarberLayout      from "../layouts/BarberLayout";
import SaasLandingPage   from "../pages/SaasLandingPage";
import NotFoundPage      from "../pages/NotFoundPage";
import ShopLandingPage  from "../pages/ShopLandingPage";
import ShopBookingPage  from "../pages/ShopBookingPage";
import LoginPage          from "../pages/LoginPage";
import RegisterPage       from "../pages/RegisterPage";
import SubscriptionPage   from "../pages/SubscriptionPage";

import DashboardPage from "../features/admin/pages/DashboardPage";
import BarbersPage   from "../features/admin/pages/BarbersPage";
import ServicesPage  from "../features/admin/pages/ServicesPage";
import BookingsPage  from "../features/admin/pages/BookingsPage";
import SettingsPage  from "../features/admin/pages/SettingsPage";
import CajaPage      from "../features/admin/pages/CajaPage";

import OverviewPage  from "../features/superadmin/pages/OverviewPage";
import ShopsPage     from "../features/superadmin/pages/ShopsPage";
import PricingPage   from "../features/superadmin/pages/PricingPage";

import AgendaPage     from "../features/barber/pages/AgendaPage";
import BarberCajaPage from "../features/barber/pages/CajaPage";
import PerfilPage     from "../features/barber/pages/PerfilPage";
import PortfolioPage  from "../features/barber/pages/PortfolioPage";
import HistorialPage  from "../features/barber/pages/HistorialPage";

export const router = createBrowserRouter([
  // ── SAAS LANDING ──
  { path: "/", element: <SaasLandingPage /> },

  // ── AUTH ── (rutas fijas ANTES de /:slug)
  { path: "/login",        element: <LoginPage />        },
  { path: "/register",     element: <RegisterPage />     },
  { path: "/subscription", element: <SubscriptionPage /> },

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
    ],
  },

  // ── SUPER ADMIN ── (ruta fija ANTES de /:slug)
  {
    path: "/superadmin",
    element: <SuperAdminLayout />,
    children: [
      { index: true,      element: <OverviewPage /> },
      { path: "shops",    element: <ShopsPage />    },
      { path: "pricing",  element: <PricingPage />  },
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

  // ── BARBERÍAS por slug — AL FINAL para no interceptar rutas fijas ──
  { path: "/:slug",         element: <ShopLandingPage /> },
  { path: "/:slug/booking", element: <ShopBookingPage /> },

  // ── 404 ──
  { path: "*", element: <NotFoundPage /> },
]);
