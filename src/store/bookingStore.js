import { create } from "zustand";

const INITIAL = {
  step: 1,
  shopId: null,      // se inyecta desde ShopBookingPage
  type: null,        // 'in_store' | 'delivery'
  service: null,     // objeto servicio completo
  barber: null,      // objeto barbero completo
  date: null,        // string 'YYYY-MM-DD'
  slot: null,        // string 'HH:mm'
  address: {
    line: "",
    lat: null,
    lng: null,
    place_name: "",
  },
  clientInfo: {
    full_name: "",
    phone: "",
    notes: "",
  },
};

export const useBookingStore = create((set, get) => ({
  ...INITIAL,

  setShopId: (shopId) => set({ shopId }),
  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) })),

  setType: (type) => set({ type, barber: null, slot: null, date: null }),
  setService: (service) => set({ service, barber: null, slot: null, date: null }),
  setBarber: (barber) => set({ barber, slot: null, date: null }),
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  setAddress: (address) => set({ address }),
  setClientInfo: (clientInfo) => set({ clientInfo }),

  reset: () => set(INITIAL),

  // precio total incluyendo domicilio si aplica
  getTotal: () => {
    const { service, type } = get();
    if (!service) return 0;
    const base = type === "delivery" && service.price_delivery != null
      ? service.price_delivery
      : service.price;
    return base;
  },
}));
