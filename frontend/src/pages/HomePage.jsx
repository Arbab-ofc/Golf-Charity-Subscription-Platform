import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout.jsx';

export default function HomePage() {
  return (
    <Layout>
      <section className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-300">Golf Charity Subscription</p>
          <h1 className="mb-4 text-4xl font-semibold leading-tight">Play better. Win prizes. Fund real causes.</h1>
          <p className="mb-6 text-slate-300">
            Submit your latest scores, enter monthly draws, and direct part of your subscription to charities you care about.
          </p>
          <div className="flex gap-3">
            <Link className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black" to="/signup">Start Now</Link>
            <Link className="rounded-xl border border-white/20 px-5 py-3" to="/login">Log In</Link>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-300/20 to-sky-300/10 p-6"
        >
          <h2 className="mb-3 text-xl font-semibold">How It Works</h2>
          <ol className="space-y-2 text-sm text-slate-300">
            <li>1. Subscribe monthly or yearly.</li>
            <li>2. Add your 5 latest golf scores.</li>
            <li>3. Participate in monthly 5-number draws.</li>
            <li>4. Allocate contributions to featured charities.</li>
          </ol>
        </motion.div>
      </section>
    </Layout>
  );
}
