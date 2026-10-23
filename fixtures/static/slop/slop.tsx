// Static-scanner fixture: a React + Tailwind landing section and dashboard card, the way
// generators typically write them. Contract: each `tell: ID` comment marks the element or line
// right below it; several ids in one comment are space-separated. The file is never compiled
// or run, only scanned, so the imports need not resolve. Do not tidy it.
import { motion } from "framer-motion";

const features = [
  /* tell: L8 */
  { icon: "⚡", title: "Lightning-fast invoicing", body: "Create invoices in seconds." },
  { icon: "🔔", title: "Smart reminders", body: "Nudge clients at the right moment." },
  { icon: "📈", title: "Real-time insights", body: "Beautiful dashboards for smarter decisions." },
];

/* tell: M2 M3 */
const cardClass = "rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl";

export function Hero() {
  return (
    /* tell: C1 */
    <section className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 py-32 text-center">
      {/* tell: S9 */}
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/30 blur-3xl" />
      {/* tell: S9 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/40 via-transparent to-transparent" />

      {/* tell: S7 */}
      <nav className="fixed inset-x-0 top-4 mx-auto max-w-5xl rounded-full border border-white/10 bg-white/10 backdrop-blur-md">
        {/* tell: C3 */}
        <button className="rounded-full bg-[#6366f1] px-5 py-2 text-white">Get started</button>
      </nav>

      {/* tell: L8 */}
      <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 px-3 py-1 text-sm">✨ New: AI-powered reminders</span>

      {/* tell: T3 */}
      <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300">Features</p>

      <h1 className="text-6xl font-bold text-white">
        Supercharge your invoicing with{" "}
        {/* tell: C2 */}
        <span className="bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">AI</span>
      </h1>

      {/* tell: L11 */}
      <p className="text-sm text-slate-400">No credit card required · Free 14-day trial · Cancel anytime</p>

      {/* tell: S6 M1 M5 */}
      <button className="rounded-xl bg-violet-600 px-8 py-4 text-white shadow-[0_0_30px_rgba(139,92,246,0.6)] animate-pulse">
        Start free trial
      </button>

      {/* tell: M2 */}
      <button className="rounded-xl border border-white/20 px-8 py-4 text-white hover:scale-105">
        {/* tell: L11 */}
        Learn more →
      </button>
    </section>
  );
}

export function Features() {
  return (
    /* tell: M4 */
    <section data-aos="fade-up" className="bg-zinc-50 py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6">
        {features.map((f, i) => (
          /* tell: M4 */
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className={cardClass}
          >
            {/* tell: C1 */}
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl">
              {f.icon}
            </div>
            {/* tell: L8 */}
            <h3 className="text-xl font-bold">🚀 {f.title}</h3>
            <p className="text-slate-500">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function InvoiceCard({ customer, email, updated, count }: { customer: string; email: string; updated: string; count: number }) {
  return (
    /* tell: S3 */
    <div className="rounded-xl border-l-4 border-indigo-500 bg-white p-5 shadow-sm">
      {/* tell: C6 */}
      <h3 className="text-lg font-semibold text-slate-900">{customer}</h3>
      {/* tell: L11 */}
      <p className="text-xs text-gray-400">{[email, updated, `${count} invoices`].join(" · ")}</p>

      {/* tell: M1 */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
        Active
      </span>

      {/* tell: M3 */}
      <a href="#" className="text-indigo-600 transition-all hover:text-indigo-800">
        View invoice
      </a>

      {/* tell: A2 */}
      <input className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:outline-none" placeholder="Search..." />

      {/* tell: C6 */}
      <button className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">Submit</button>
    </div>
  );
}

export const Spinner = () => <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />;
