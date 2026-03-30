import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Shuffle, Heart, BadgeCheck } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { drawApi } from '../services/drawApi.js';
import { charityApi } from '../services/charityApi.js';
import { winnerApi } from '../services/winnerApi.js';
import { adminApi } from '../services/adminApi.js';

export default function AdminPage() {
  const { token } = useAuth();
  const maskEmail = (value) => {
    const email = String(value || '');
    const at = email.indexOf('@');
    if (at <= 2) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    if (local.length <= 6) return `${local.slice(0, 2)}...${domain}`;
    return `${local.slice(0, 6)}...${domain}`;
  };

  const [drawLogic, setDrawLogic] = useState('random');
  const [simulation, setSimulation] = useState(null);
  const [drawStats, setDrawStats] = useState(null);

  const [charities, setCharities] = useState([]);
  const [charityForm, setCharityForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    websiteUrl: '',
    email: '',
  });

  const [drawIdForWinners, setDrawIdForWinners] = useState('');
  const [winners, setWinners] = useState([]);
  const [overview, setOverview] = useState({ totalUsers: 0, activeSubscriptions: 0, totalPrizes: 0, totalCharities: 0 });
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const loadAdminData = async () => {
    if (!token) return;

    const [stats, charityData, overviewData, usersData, subscriptionsData] = await Promise.all([
      drawApi.statistics(token).catch(() => null),
      charityApi.list(false, '').catch(() => null),
      adminApi.overview(token).catch(() => null),
      adminApi.users(token).catch(() => null),
      adminApi.subscriptions(token).catch(() => null),
    ]);

    if (stats) setDrawStats(stats);
    if (charityData?.charities) setCharities(charityData.charities);
    if (overviewData) setOverview(overviewData);
    if (usersData?.users) setUsers(usersData.users);
    if (subscriptionsData?.subscriptions) setSubscriptions(subscriptionsData.subscriptions);
  };

  useEffect(() => {
    (async () => {
      await loadAdminData();
      await loadWinnersByDraw();
    })();
  }, [token]);

  const runSimulation = async () => {
    try {
      const result = await drawApi.simulate(token, drawLogic);
      setSimulation(result);
      toast.success('Draw simulation generated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Simulation failed');
    }
  };

  const publishDraw = async () => {
    try {
      const result = await drawApi.publish(token, drawLogic);
      toast.success(result.message || 'Draw published');
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Publish failed');
    }
  };

  const createCharity = async (e) => {
    e.preventDefault();
    try {
      const result = await charityApi.create(token, charityForm);
      toast.success(result.message || 'Charity created');
      setCharityForm({ name: '', description: '', imageUrl: '', websiteUrl: '', email: '' });
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to create charity');
    }
  };

  const toggleFeatured = async (charity) => {
    try {
      await charityApi.setFeatured(token, charity.id, !charity.featured);
      toast.success('Charity featured state updated');
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update charity');
    }
  };

  const deleteCharity = async (charityId) => {
    try {
      await charityApi.remove(token, charityId);
      toast.success('Charity deleted');
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete charity');
    }
  };

  const loadWinnersByDraw = async () => {
    try {
      let targetDrawId = (drawIdForWinners || '').trim();
      if (!targetDrawId) {
        const current = await drawApi.current().catch(() => null);
        targetDrawId = current?.draw?.id || '';
        if (targetDrawId) setDrawIdForWinners(targetDrawId);
      }

      if (!targetDrawId) {
        setWinners([]);
        return;
      }

      const data = await winnerApi.byDraw(targetDrawId);
      setWinners(data.winners || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load winners');
    }
  };

  const verifyWinner = async (winnerId, status) => {
    try {
      await winnerApi.verify(token, winnerId, status);
      toast.success(`Winner ${status}`);
      await loadWinnersByDraw();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update winner');
    }
  };

  const payoutWinner = async (winnerId) => {
    try {
      await winnerApi.payout(token, winnerId);
      toast.success('Winner marked as paid');
      await loadWinnersByDraw();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update payout');
    }
  };

  const toggleUserAdmin = async (targetUser) => {
    try {
      await adminApi.updateUser(token, targetUser.id, { isAdmin: !targetUser.is_admin });
      toast.success('User role updated');
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update user role');
    }
  };

  const markSubscriptionInactive = async (sub) => {
    try {
      await adminApi.updateSubscription(token, sub.id, { status: 'inactive' });
      toast.success('Subscription marked inactive');
      await loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update subscription');
    }
  };

  return (
    <Layout>
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
            <Shield size={14} /> Admin Control Center
          </p>
          <h1 className="text-3xl font-semibold">Platform Administration</h1>
          <p className="mt-2 text-sm text-slate-300">Manage draws, charities, winners, and core system stats.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">Users: <strong>{overview.totalUsers}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">Active Subscriptions: <strong>{overview.activeSubscriptions}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">Total Prizes: <strong>{overview.totalPrizes}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">Charities: <strong>{overview.totalCharities}</strong></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Shuffle size={16} /> Draw Management</h2>
            <div className="mt-4 flex gap-3">
              <select className="field" value={drawLogic} onChange={(e) => setDrawLogic(e.target.value)}>
                <option value="random">Random</option>
                <option value="algorithmic">Algorithmic</option>
              </select>
              <button className="btn-secondary" onClick={runSimulation}>Simulate</button>
              <button className="btn-primary" onClick={publishDraw}>Publish</button>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
              <p>Total Draws: <strong>{drawStats?.totalDraws ?? 0}</strong></p>
              <p>Total Prizes: <strong>{drawStats?.totalPrizes ?? 0}</strong></p>
              <p>Avg Winners: <strong>{drawStats?.avgWinners ?? 0}</strong></p>
            </div>

            {simulation ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <p>Simulated numbers: <strong>{(simulation.winningNumbers || []).join(', ')}</strong></p>
                <p>Winners: <strong>{(simulation.winners || []).length}</strong></p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Heart size={16} /> Charity Management</h2>
            <form className="mt-4 space-y-3" onSubmit={createCharity}>
              <input className="field" placeholder="Name" value={charityForm.name} onChange={(e) => setCharityForm((p) => ({ ...p, name: e.target.value }))} required />
              <textarea className="field" placeholder="Description" value={charityForm.description} onChange={(e) => setCharityForm((p) => ({ ...p, description: e.target.value }))} required />
              <input className="field" placeholder="Image URL" value={charityForm.imageUrl} onChange={(e) => setCharityForm((p) => ({ ...p, imageUrl: e.target.value }))} required />
              <input className="field" placeholder="Website URL" value={charityForm.websiteUrl} onChange={(e) => setCharityForm((p) => ({ ...p, websiteUrl: e.target.value }))} required />
              <input className="field" placeholder="Email" type="email" value={charityForm.email} onChange={(e) => setCharityForm((p) => ({ ...p, email: e.target.value }))} required />
              <button className="btn-primary w-full" type="submit">Create Charity</button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Charity List</h2>
          <div className="mt-4 space-y-2">
            {charities.map((charity) => (
              <div key={charity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span>{charity.name} {charity.featured ? '(Featured)' : ''}</span>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => toggleFeatured(charity)}>{charity.featured ? 'Unfeature' : 'Feature'}</button>
                  <button className="btn-secondary" onClick={() => deleteCharity(charity.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><BadgeCheck size={16} /> Winner Verification & Payouts</h2>
          <div className="mt-4 flex gap-3">
            <input className="field" placeholder="Enter Draw ID" value={drawIdForWinners} onChange={(e) => setDrawIdForWinners(e.target.value)} />
            <button className="btn-primary" onClick={loadWinnersByDraw}>Load Winners</button>
          </div>

          <div className="mt-4 space-y-2">
            {winners.map((winner) => (
              (() => {
                const isApproved = winner.verification_status === 'approved';
                const isPaid = winner.payout_status === 'paid';

                return (
              <div key={winner.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span>
                  {winner?.users?.email || winner.user_id} · Match {winner.match_type} · Prize {winner.prize_amount} · {winner.verification_status} · {winner.payout_status}
                </span>
                <div className="flex gap-2">
                  {!isApproved && !isPaid ? (
                    <button className="btn-secondary" onClick={() => verifyWinner(winner.id, 'approved')}>Approve</button>
                  ) : null}
                  {!isPaid ? (
                    <button className="btn-secondary" onClick={() => verifyWinner(winner.id, 'rejected')}>Reject</button>
                  ) : null}
                  {isApproved && !isPaid ? (
                    <button className="btn-secondary" onClick={() => payoutWinner(winner.id)}>Mark Paid</button>
                  ) : null}
                </div>
              </div>
                );
              })()
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">User Management</h2>
            <div className="mt-4 space-y-2">
              {users.slice(0, 20).map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate" title={`${u.email} · ${u.is_admin ? 'Admin' : 'User'}`}>
                    {maskEmail(u.email)} · {u.is_admin ? 'Admin' : 'User'}
                  </span>
                  <button className="btn-secondary" onClick={() => toggleUserAdmin(u)}>
                    {u.is_admin ? 'Make User' : 'Make Admin'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Subscription Management</h2>
            <div className="mt-4 space-y-2">
              {subscriptions.slice(0, 20).map((sub) => (
                <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={`${sub?.users?.email || sub.user_id} · ${sub.plan_type} · ${sub.status}`}
                  >
                    {maskEmail(sub?.users?.email || sub.user_id)} · {sub.plan_type} · {sub.status}
                  </span>
                  <button className="btn-secondary" onClick={() => markSubscriptionInactive(sub)}>Mark Inactive</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
