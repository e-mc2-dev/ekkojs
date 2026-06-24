// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { atom } from "ekko:rune/mimir";

export const serverInfoAtom = atom({
  key: "app:server",
  default: { renderedAt: "", runtime: "EkkoJS" },
});

export const counterAtom = atom({ key: "app:counter", default: 0, persist: true });

export type Route = { origin: string; destination: string; date: string; train: string };
export type Pax = { adults: number; children: number };
export type Passenger = { name: string; type: "Adult" | "Child" };

export const stepAtom = atom({ key: "book:step", default: 0, persist: true });

export const routeAtom = atom<Route>({
  key: "book:route",
  default: { origin: "OSL", destination: "BGO", date: "", train: "EK-417" },
  persist: true,
});

export type Train = { id: string; depart: string; arrive: string; duration: string; price: number };
export const trainAtom = atom<Train | null>({ key: "book:train", default: null, persist: true });

export const paxAtom = atom<Pax>({ key: "book:pax", default: { adults: 1, children: 0 }, persist: true });

export const passengersAtom = atom<Passenger[]>({ key: "book:passengers", default: [], persist: true });

export const seatsAtom = atom<string[]>({ key: "book:seats", default: [], persist: true });

export const paymentAtom = atom<{ name: string; last4: string }>({
  key: "book:payment",
  default: { name: "", last4: "" },
  persist: true,
});

export const agreeAtom = atom({ key: "book:agree", default: false, persist: true });

export const refAtom = atom({ key: "book:ref", default: "", persist: true });
