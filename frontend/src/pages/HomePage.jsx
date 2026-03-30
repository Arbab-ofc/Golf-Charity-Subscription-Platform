import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const secondaryCta = user ? { to: '/dashboard', label: 'Dashboard' } : { to: '/login', label: 'Log In' };
  const primaryCta = user ? { to: '/dashboard', label: 'Go to Dashboard' } : { to: '/signup', label: 'Start Now' };

  return (
    <Layout>
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/6 p-8 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-300">Golf Charity Subscription</p>
              <h1 className="mb-4 text-4xl font-semibold leading-tight md:text-5xl">Play better. Win prizes. Fund real causes.</h1>
              <p className="mb-6 max-w-2xl text-slate-300">
                Submit your latest scores, enter monthly draws, and direct part of your subscription to charities you care about.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black" to={primaryCta.to}>{primaryCta.label}</Link>
                <Link className="rounded-xl border border-white/20 px-5 py-3" to={secondaryCta.to}>{secondaryCta.label}</Link>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-300/20 via-cyan-300/10 to-sky-300/10 p-6"
            >
              <h2 className="mb-3 text-xl font-semibold">How It Works</h2>
              <ol className="space-y-2 text-sm text-slate-300">
                <li>1. Subscribe monthly or yearly.</li>
                <li>2. Add your 5 latest golf scores.</li>
                <li>3. Participate in monthly 5-number draws.</li>
                <li>4. Allocate contributions to featured charities.</li>
              </ol>
            </motion.div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Prize Pool Split</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">40%</p>
            <p className="mt-1 text-sm text-slate-300">of monthly revenue allocated to draw rewards.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Score Rules</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-300">Top 5</p>
            <p className="mt-1 text-sm text-slate-300">latest Stableford scores retained per user.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Charity Contribution</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">10%+</p>
            <p className="mt-1 text-sm text-slate-300">minimum contribution with optional increase.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/8 via-white/5 to-white/8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Ready to run your next draw cycle?</h3>
              <p className="mt-1 text-sm text-slate-300">Track performance, manage winners, and fund meaningful causes in one workflow.</p>
            </div>
            <Link className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black" to={primaryCta.to}>
              {user ? 'Open Dashboard' : 'Create Account'}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
