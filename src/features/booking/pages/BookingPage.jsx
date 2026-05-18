import { useBookingStore } from "../../../store/bookingStore";
import { SHOP_ID } from "../../../lib/constants";
import { applyTheme } from "../../../lib/applyTheme";
import BookingWizard from "../components/BookingWizard";

// Setear shopId y tema default inmediatamente
if (!useBookingStore.getState().shopId) {
  useBookingStore.getState().setShopId(SHOP_ID);
  applyTheme({ theme_mode: "dark", theme_color: "#FF6B2C", theme_font: "Inter" });
}

export default function BookingPage() {
  return <BookingWizard />;
}
