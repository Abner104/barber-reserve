import { create } from "zustand";

const INITIAL = {
  step: 1,
  shopId: null,
  shopConfig: null,  // { lat, lng, delivery_fee_base, delivery_fee_per_km }
  type: null,
  service: null,
  people: 1,
  barber: null,
  date: null,
  slot: null,
  address: { line: "", lat: null, lng: null, place_name: "" },
  clientInfo: { full_name: "", phone: "", notes: "" },
};

export const useBookingStore = create((set, get) => ({
  ...INITIAL,

  setShopId: (shopId) => set({ shopId }),
  setShopConfig: (shopConfig) => set({ shopConfig }),
  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) })),

  setType: (type) => set({ type, barber: null, slot: null, date: null }),
  setService: (service) => set({ service, people: 1, barber: null, slot: null, date: null }),
  setPeople: (people) => set({ people, barber: null, slot: null, date: null }),
  setBarber: (barber) => set({ barber, slot: null, date: null }),
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  setAddress: (address) => set({ address }),
  setClientInfo: (clientInfo) => set({ clientInfo }),

  reset: () => set(INITIAL),

  // precio total incluyendo domicilio si aplica
  getTotal: () => {
    const { service, type, people } = get();
    if (!service) return 0;
    const base = type === "delivery" && service.price_delivery != null
      ? service.price_delivery
      : service.price;
    return base * (people || 1);
  },
}));
