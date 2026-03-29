import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="grid items-stretch gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
            <ShieldCheck size={14} />
            Secure Access
          </p>
          <h1 className="text-3xl font-semibold">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-300">Manage subscriptions, track draws, and monitor your contribution impact.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Email</span>
              <input
                className="field"
                placeholder="you@example.com"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Password</span>
              <div className="relative">
                <input
                  className="field pr-10"
                  placeholder="Your password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-black"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Login'}
            </button>

            <p className="text-sm text-slate-300">
              No account? <Link to="/signup" className="font-semibold text-emerald-300">Create one</Link>
            </p>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-300/10 via-cyan-300/5 to-emerald-300/15 p-7">
          <h2 className="text-xl font-semibold">Why members stay</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 inline-flex items-center gap-2 font-semibold text-emerald-300"><Sparkles size={14} /> Live Subscription Control</p>
              <p className="text-slate-300">Upgrade, cancel, and track billing cycles with clear status visibility.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 font-semibold text-sky-300">Transparent Draw Participation</p>
              <p className="text-slate-300">Keep up with monthly draws and performance without friction.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 font-semibold text-cyan-300">Charity-First Revenue Flow</p>
              <p className="text-slate-300">Every subscription ties directly into charity allocations and outcomes.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
