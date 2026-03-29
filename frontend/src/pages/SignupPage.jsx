import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(form.email, form.password, form.fullName);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <input className="field" placeholder="Full Name" required value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
        <input className="field" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="field" placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        <button className="btn-primary w-full" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Signup'}</button>
        <p className="text-sm text-slate-300">Already have an account? <Link to="/login" className="text-emerald-300">Login</Link></p>
      </form>
    </Layout>
  );
}
