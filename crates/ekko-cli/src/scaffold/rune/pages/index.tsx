// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { useAtom, useAtomValue } from "ekko:rune/mimir";
import { Stepper, Select, DateTimeInput, TextBox, Button, Checkbox, Card, Alert } from "@ekko/asgard";
import {
  stepAtom, routeAtom, trainAtom, paxAtom, passengersAtom, seatsAtom, paymentAtom, agreeAtom, refAtom,
  serverInfoAtom, type Passenger, type Train,
} from "../atoms/app";

export function ssr() {
  return {
    title: "EkkoRail, a reload-tolerant booking demo",
    __atoms: { "app:server": { renderedAt: new Date().toISOString(), runtime: "EkkoJS" } },
  };
}

const STATIONS = [
  { code: "OSL", city: "Oslo" }, { code: "BGO", city: "Bergen" }, { code: "TRD", city: "Trondheim" },
  { code: "SVG", city: "Stavanger" }, { code: "BOO", city: "Bodø" }, { code: "KRS", city: "Kristiansand" },
];
const cityOf = (code: string) => STATIONS.find((s) => s.code === code)?.city || code;
const STATION_OPTS = STATIONS.map((s) => ({ value: s.code, label: `${s.city} (${s.code})` }));
const STEPS = ["Route", "Trains", "Passengers", "Details", "Seats", "Checkout", "Payment", "Ticket"];

const TRAINS: Train[] = [
  { id: "EK-417", depart: "06:25", arrive: "12:58", duration: "6h 33m", price: 79 },
  { id: "EK-431", depart: "08:40", arrive: "15:30", duration: "6h 50m", price: 69 },
  { id: "EK-455", depart: "12:05", arrive: "18:42", duration: "6h 37m", price: 89 },
  { id: "EK-489", depart: "16:20", arrive: "23:05", duration: "6h 45m", price: 59 },
];

const ROWS = 10;
const COLS = ["A", "B", "C", "D"];
const seatId = (r: number, c: string) => `${r + 1}${c}`;
function seatTaken(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 5 === 0;
}
const totalPrice = (train: Train | null, adults: number, children: number) =>
  train ? train.price * adults + Math.round(train.price / 2) * children : 0;

function Qr({ seed }: { seed: string }) {
  const size = 25, px = 6;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const bit = () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return (h >>> 16) & 1; };
  const finder = (R: number, C: number, r: number, c: number): number | null => {
    const dr = r - R, dc = c - C;
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
    return (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)) ? 1 : 0;
  };
  const rects: any[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const f = finder(0, 0, r, c) ?? finder(0, size - 7, r, c) ?? finder(size - 7, 0, r, c);
    if (f != null ? f : bit()) rects.push(<rect key={`${r}-${c}`} x={c * px} y={r * px} width={px} height={px} fill="#04140f" />);
  }
  return (
    <svg width={size * px} height={size * px} viewBox={`0 0 ${size * px} ${size * px}`} className="qr" role="img" aria-label="ticket QR code">
      <rect width={size * px} height={size * px} fill="#fff" />{rects}
    </svg>
  );
}

function Nav({ back, next, nextLabel, nextDisabled }: { back?: () => void; next?: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="step-nav">
      {back ? <Button variant="outlined" onClick={back}>Back</Button> : <span />}
      {next ? <Button onClick={next} disabled={nextDisabled}>{nextLabel || "Continue"}</Button> : null}
    </div>
  );
}

function StepRoute({ go }: { go: (n: number) => void }) {
  const [route, setRoute] = useAtom(routeAtom);
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Where to?</h2>
      <div className="route-row">
        <label className="field"><span>From</span>
          <Select value={route.origin} onChange={(v: string) => setRoute((r) => ({ ...r, origin: v }))} options={STATION_OPTS} /></label>
        <div className="field field-swap"><span aria-hidden>&nbsp;</span>
          <Button variant="outlined" onClick={() => setRoute((r) => ({ ...r, origin: r.destination, destination: r.origin }))} title="Swap origin and destination">⇄</Button></div>
        <label className="field"><span>To</span>
          <Select value={route.destination} onChange={(v: string) => setRoute((r) => ({ ...r, destination: v }))} options={STATION_OPTS} /></label>
      </div>
      <label className="field"><span>Departure date</span>
        <DateTimeInput
          mode="date" width="full" placeholder="Pick a date"
          value={route.date ? { date: new Date(route.date) } as any : undefined}
          onChange={(v: any) => setRoute((r) => ({ ...r, date: v?.date ? new Date(v.date).toISOString().slice(0, 10) : "" }))}
        />
      </label>
      <Nav next={() => go(1)} nextDisabled={route.origin === route.destination} nextLabel="Search trains" />
    </Card>
  );
}

function StepTrains({ go }: { go: (n: number) => void }) {
  const route = useAtomValue(routeAtom);
  const [train, setTrain] = useAtom(trainAtom);
  const pick = (t: Train) => { setTrain(t); go(2); };
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">{cityOf(route.origin)} → {cityOf(route.destination)} <span className="muted">{route.date || "any day"}</span></h2>
      <div className="train-list">
        {TRAINS.map((t) => (
          <div key={t.id} className={"train-row" + (train?.id === t.id ? " sel" : "")}>
            <div className="train-time"><strong>{t.depart}</strong><span className="muted">→ {t.arrive}</span></div>
            <div className="train-mid"><span className="train-id">{t.id}</span><span className="muted">{t.duration} · direct</span></div>
            <div className="train-price">NOK {t.price}</div>
            <Button size="small" onClick={() => pick(t)}>Select</Button>
          </div>
        ))}
      </div>
      <Nav back={() => go(0)} />
    </Card>
  );
}

function StepPax({ go }: { go: (n: number) => void }) {
  const [pax, setPax] = useAtom(paxAtom);
  const train = useAtomValue(trainAtom);
  const [, setPassengers] = useAtom(passengersAtom);
  const total = pax.adults + pax.children;
  const row = (label: string, value: number, set: (n: number) => void, min: number) => (
    <div className="counter-line">
      <span>{label}</span>
      <div className="counter-row">
        <Button variant="outlined" size="small" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min}>-</Button>
        <span className="counter-val">{value}</span>
        <Button size="small" onClick={() => set(value + 1)}>+</Button>
      </div>
    </div>
  );
  const next = () => {
    const list: Passenger[] = [];
    for (let i = 0; i < pax.adults; i++) list.push({ name: "", type: "Adult" });
    for (let i = 0; i < pax.children; i++) list.push({ name: "", type: "Child" });
    setPassengers(list);
    go(3);
  };
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Who's travelling?</h2>
      {row("Adults", pax.adults, (n) => setPax((p) => ({ ...p, adults: n })), 1)}
      {row("Children", pax.children, (n) => setPax((p) => ({ ...p, children: n })), 0)}
      <p className="muted">{total} passenger{total === 1 ? "" : "s"} · NOK {totalPrice(train, pax.adults, pax.children)}</p>
      <Nav back={() => go(1)} next={next} nextDisabled={total < 1} />
    </Card>
  );
}

function StepDetails({ go }: { go: (n: number) => void }) {
  const [passengers, setPassengers] = useAtom(passengersAtom);
  const set = (i: number, name: string) => setPassengers((list) => list.map((p, j) => (j === i ? { ...p, name } : p)));
  const ready = passengers.length > 0 && passengers.every((p) => p.name.trim().length > 1);
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Passenger details</h2>
      {passengers.map((p, i) => (
        <label className="field" key={i}><span>{p.type} {i + 1}</span>
          <TextBox placeholder="Full name" value={p.name} onChange={(v: string) => set(i, v)} /></label>
      ))}
      <Nav back={() => go(2)} next={() => go(4)} nextDisabled={!ready} />
    </Card>
  );
}

function StepSeats({ go }: { go: (n: number) => void }) {
  const passengers = useAtomValue(passengersAtom);
  const [seats, setSeats] = useAtom(seatsAtom);
  const need = passengers.length;
  const toggle = (id: string) => {
    if (seatTaken(id)) return;
    setSeats((cur) => cur.includes(id) ? cur.filter((s) => s !== id) : (cur.length < need ? [...cur, id] : cur));
  };
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Pick your seats <span className="muted">({seats.length}/{need})</span></h2>
      <div className="coach">
        <div className="coach-head">Coach 4 · → direction of travel →</div>
        {Array.from({ length: ROWS }, (_, r) => (
          <div className="seat-row" key={r}>
            {COLS.map((c, ci) => {
              const id = seatId(r, c); const taken = seatTaken(id); const sel = seats.includes(id);
              return (
                <span key={c} style={{ display: "contents" }}>
                  <button type="button" className={"seat" + (taken ? " taken" : sel ? " sel" : "")} disabled={taken} onClick={() => toggle(id)} title={id}>{id}</button>
                  {ci === 1 ? <span className="aisle" /> : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="legend"><span className="seat sel">A1</span> selected <span className="seat taken">A1</span> sold <span className="seat">A1</span> free</div>
      <Nav back={() => go(3)} next={() => go(5)} nextDisabled={seats.length !== need} />
    </Card>
  );
}

function StepCheckout({ go }: { go: (n: number) => void }) {
  const route = useAtomValue(routeAtom); const train = useAtomValue(trainAtom); const pax = useAtomValue(paxAtom);
  const passengers = useAtomValue(passengersAtom); const seats = useAtomValue(seatsAtom);
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Review</h2>
      <div className="summary">
        <div><span className="muted">Journey</span><strong>{cityOf(route.origin)} → {cityOf(route.destination)}</strong></div>
        <div><span className="muted">Train · date</span><strong>{train?.id} {train ? `(${train.depart})` : ""} · {route.date || "flexible"}</strong></div>
        <div><span className="muted">Passengers</span><strong>{passengers.map((p) => p.name).join(", ")}</strong></div>
        <div><span className="muted">Seats</span><strong>{seats.join(", ")}</strong></div>
        <div className="total"><span>Total</span><strong>NOK {totalPrice(train, pax.adults, pax.children)}.00</strong></div>
      </div>
      <Nav back={() => go(4)} next={() => go(6)} nextLabel="Go to payment" />
    </Card>
  );
}

function StepPayment({ go }: { go: (n: number) => void }) {
  const [payment, setPayment] = useAtom(paymentAtom);
  const [, setRef] = useAtom(refAtom);
  const [agree, setAgree] = useAtom(agreeAtom);
  const last4 = payment.last4.replace(/\D/g, "").slice(-4);
  const ready = payment.name.trim().length > 1 && last4.length === 4 && agree;
  const pay = () => { setRef("EKR-" + Date.now().toString(36).toUpperCase().slice(-6)); go(7); };
  return (
    <Card variant="filled" elevation={1}>
      <h2 className="panel-title">Payment</h2>
      <Alert severity="info">Demo only, no real card is processed.</Alert>
      <label className="field"><span>Name on card</span>
        <TextBox placeholder="Jane Traveller" value={payment.name} onChange={(v: string) => setPayment((p) => ({ ...p, name: v }))} /></label>
      <label className="field"><span>Card number</span>
        <TextBox placeholder="4242 4242 4242 4242" value={payment.last4} onChange={(v: string) => setPayment((p) => ({ ...p, last4: v }))} /></label>
      <Checkbox checked={agree} onChange={setAgree} label="I accept the fare conditions" />
      <Nav back={() => go(5)} next={pay} nextLabel="Pay now" nextDisabled={!ready} />
    </Card>
  );
}

function StepTicket({ go }: { go: (n: number) => void }) {
  const route = useAtomValue(routeAtom); const train = useAtomValue(trainAtom);
  const passengers = useAtomValue(passengersAtom); const seats = useAtomValue(seatsAtom);
  const bookingRef = useAtomValue(refAtom);
  const [, setStep] = useAtom(stepAtom);
  const [, setRoute] = useAtom(routeAtom); const [, setTrain] = useAtom(trainAtom); const [, setPax] = useAtom(paxAtom);
  const [, setPassengers] = useAtom(passengersAtom); const [, setSeats] = useAtom(seatsAtom);
  const [, setPayment] = useAtom(paymentAtom); const [, setRef] = useAtom(refAtom); const [, setAgree] = useAtom(agreeAtom);
  const again = () => {
    setRoute({ origin: "OSL", destination: "BGO", date: "", train: "EK-417" }); setTrain(null);
    setPax({ adults: 1, children: 0 }); setPassengers([]); setSeats([]);
    setPayment({ name: "", last4: "" }); setRef(""); setAgree(false); setStep(0);
  };
  return (
    <div className="ticket-wrap">
      <Alert severity="success" title="Booking confirmed">Confirmed for {passengers.map((p) => p.name).join(", ")}.</Alert>
      <div className="ticket">
        <div className="ticket-main">
          <div className="ticket-head"><span className="brand-title">EkkoRail</span><span className="ref">{bookingRef}</span></div>
          <div className="ticket-route">
            <div><div className="big">{route.origin}</div><div className="muted">{cityOf(route.origin)}</div></div>
            <div className="arrow">→</div>
            <div><div className="big">{route.destination}</div><div className="muted">{cityOf(route.destination)}</div></div>
          </div>
          <div className="ticket-meta">
            <div><span className="muted">Train</span><strong>{train?.id} · {train?.depart}</strong></div>
            <div><span className="muted">Date</span><strong>{route.date || "flexible"}</strong></div>
            <div><span className="muted">Seats</span><strong>{seats.join(", ")}</strong></div>
            <div><span className="muted">Passengers</span><strong>{passengers.length}</strong></div>
          </div>
        </div>
        <div className="ticket-stub"><Qr seed={bookingRef || "EKR-DEMO"} /><span className="muted mono">{bookingRef}</span></div>
      </div>
      <div className="step-nav" style={{ justifyContent: "center" }}>
        <Button variant="outlined" onClick={() => go(5)}>Back to review</Button>
        <Button onClick={again}>Book another</Button>
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useAtom(stepAtom);
  const server = useAtomValue(serverInfoAtom);
  const go = (n: number) => setStep(n);
  const Steps = [StepRoute, StepTrains, StepPax, StepDetails, StepSeats, StepCheckout, StepPayment, StepTicket];
  const Active = Steps[Math.max(0, Math.min(step, 7))];
  return (
    <section className="section">
      <div className="container booking">
        <Alert severity="info" title="Reload anywhere">
          Press F5 at any step, your journey, train, passengers, seats and progress are restored exactly,
          because the whole flow lives in Mimir atoms persisted across the server/client frontier.
          <span className="muted" style={{ display: "block", marginTop: 4 }}>Server-rendered at {server.renderedAt || "(client only)"}.</span>
        </Alert>
        <div className="booking-grid">
          <aside className="booking-steps">
            <Stepper steps={STEPS.map((s) => ({ label: s }))} activeStep={step} orientation="vertical" size="small" />
          </aside>
          <div className="booking-content"><Active go={go} /></div>
        </div>
      </div>
    </section>
  );
}
