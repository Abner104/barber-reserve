import { create } from "zustand";

const INITIAL = {
  step: 1,
  shopId: null,
  shopConfig: null,  // { lat, lng, delivery_fee_base, delivery_fee_per_km, allows_delivery }
  type: null,
  services: [],      // array de servicios seleccionados
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
  setServices: (services) => set({ services, people: 1, barber: null, slot: null, date: null }),
  toggleService: (svc) => set((s) => {
    const exists = s.services.some(x => x.id === svc.id);
    const services = exists ? s.services.filter(x => x.id !== svc.id) : [...s.services, svc];
    return { services, barber: null, slot: null, date: null };
  }),
  setPeople: (people) => set({ people, barber: null, slot: null, date: null }),
  setBarber: (barber) => set({ barber, slot: null, date: null }),
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  setAddress: (address) => set({ address }),
  setClientInfo: (clientInfo) => set({ clientInfo }),

  reset: () => set(INITIAL),

  // precio total de todos los servicios × personas
  getTotal: () => {
    const { services, type, people } = get();
    if (!services?.length) return 0;
    const base = services.reduce((sum, svc) => {
      const price = type === "delivery" && svc.price_delivery != null ? svc.price_delivery : svc.price;
      return sum + price;
    }, 0);
    return base * (people || 1);
  },

  // duración total de todos los servicios × personas
  getTotalDuration: () => {
    const { services, people } = get();
    if (!services?.length) return 30;
    return services.reduce((sum, svc) => sum + (svc.duration_min || 30), 0) * (people || 1);
  },
}));
