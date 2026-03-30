import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  BadgeDollarSign,
  CircleCheck,
  CircleX,
  Trash2,
  PlusCircle,
  Trophy,
  HeartHandshake,
  Target,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { subscriptionApi } from '../services/subscriptionApi.js';
import { scoreApi } from '../services/scoreApi.js';
import { charityApi } from '../services/charityApi.js';
import { drawApi } from '../services/drawApi.js';
import { winnerApi } from '../services/winnerApi.js';
import { donationApi } from '../services/donationApi.js';

const formatSimpleDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};

const getLiveDaysRemaining = (expiresAt) => {
  if (!expiresAt) return 0;
  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return 0;
  return Math.max(0, Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24)));
};

export default function DashboardPage() {
  const { user, token } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [liveDaysRemaining, setLiveDaysRemaining] = useState(0);
  const [busyAction, setBusyAction] = useState('');

  const [scores, setScores] = useState([]);
  const [scoreStats, setScoreStats] = useState({ average: 0, best: null, worst: null, totalRounds: 0 });
  const [scoreForm, setScoreForm] = useState({ score: '', playedAt: '' });

  const [charities, setCharities] = useState([]);
  const [myCharity, setMyCharity] = useState({ charity: null, percentage: null });
  const [charitySelection, setCharitySelection] = useState({ charityId: '', percentage: 10 });

  const [myDraws, setMyDraws] = useState([]);
  const [currentDraw, setCurrentDraw] = useState(null);
  const [winnings, setWinnings] = useState({ winnings: [], totalWinnings: 0, count: 0 });
  const [donations, setDonations] = useState({ donations: [], totalAmount: 0, count: 0 });
  const [donationForm, setDonationForm] = useState({ charityId: '', amount: '', note: '' });
  const [proofByWinnerId, setProofByWinnerId] = useState({});

  const canUseSubscriberFeatures = Boolean(subscription?.isActive);
  const hasSubscriptionRecord = Boolean(subscription && (subscription.status || subscription.planType || subscription.expiresAt));

  const loadSubscriptionStatus = async () => {
    if (!token) return;
    try {
      const result = await subscriptionApi.status(token);
      setSubscription(result);
    } catch (_error) {
      setSubscription(null);
    }
  };

  const loadDashboardData = async () => {
    if (!token) return;

    await loadSubscriptionStatus();

    const [scoreData, charityData, myCharityData, drawData, currentDrawData, winningsData, donationData] = await Promise.all([
      scoreApi.list(token).catch(() => null),
      charityApi.list(false, '').catch(() => null),
      charityApi.myCharity(token).catch(() => null),
      drawApi.myDraws(token).catch(() => null),
      drawApi.current().catch(() => null),
      winnerApi.me(token).catch(() => null),
      donationApi.mine(token).catch(() => null),
    ]);

    if (scoreData?.scores) {
      setScores(scoreData.scores);
      setScoreStats(scoreData.statistics || { average: 0, best: null, worst: null, totalRounds: 0 });
    }

    if (charityData?.charities) {
      setCharities(charityData.charities);
      if (!charitySelection.charityId && charityData.charities[0]?.id) {
        setCharitySelection((prev) => ({ ...prev, charityId: charityData.charities[0].id }));
      }
      if (!donationForm.charityId && charityData.charities[0]?.id) {
        setDonationForm((prev) => ({ ...prev, charityId: charityData.charities[0].id }));
      }
    }

    if (myCharityData) {
      setMyCharity(myCharityData);
      if (myCharityData?.charity?.id) {
        setCharitySelection((prev) => ({
          ...prev,
          charityId: myCharityData.charity.id,
          percentage: myCharityData.percentage || prev.percentage,
        }));
      }
    }

    if (drawData?.participationHistory) setMyDraws(drawData.participationHistory);
    if (currentDrawData?.draw) setCurrentDraw(currentDrawData.draw);
    if (winningsData) setWinnings(winningsData);
    if (donationData) setDonations(donationData);
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  useEffect(() => {
    if (!subscription?.expiresAt) {
      setLiveDaysRemaining(0);
      return undefined;
    }

    const update = () => setLiveDaysRemaining(getLiveDaysRemaining(subscription.expiresAt));
    update();

    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, [subscription?.expiresAt]);

  const startCheckout = async (planType) => {
    try {
      setBusyAction('checkout');
      const result = await subscriptionApi.checkout(token, planType);
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to start checkout');
    } finally {
      setBusyAction('');
    }
  };

  const handleSubscriptionAction = async () => {
    try {
      setBusyAction('subscription');
      if (subscription?.isActive) {
        const cancelResult = await subscriptionApi.cancel(token);
        const removeResult = await subscriptionApi.remove(token);
        toast.success(removeResult.message || cancelResult.message || 'Subscription cancelled and removed');
      } else {
        const result = await subscriptionApi.remove(token);
        toast.success(result.message || 'Subscription removed');
      }
      await loadDashboardData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update subscription');
    } finally {
      setBusyAction('');
    }
  };

  const addScore = async (e) => {
    e.preventDefault();
    try {
      if (!scoreForm.score || !scoreForm.playedAt) {
        toast.error('Score and date are required');
        return;
      }
      const payload = await scoreApi.add(token, Number(scoreForm.score), new Date(scoreForm.playedAt).toISOString());
      setScores(payload.scores || []);
      setScoreStats(payload.statistics || scoreStats);
      setScoreForm({ score: '', playedAt: '' });
      toast.success('Score saved');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to save score');
    }
  };

  const deleteScore = async (scoreId) => {
    try {
      await scoreApi.remove(token, scoreId);
      const refreshed = await scoreApi.list(token);
      setScores(refreshed.scores || []);
      setScoreStats(refreshed.statistics || scoreStats);
      toast.success('Score deleted');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete score');
    }
  };

  const saveMyCharity = async (e) => {
    e.preventDefault();
    try {
      if (!charitySelection.charityId) {
        toast.error('Please select a charity');
        return;
      }
      const result = await charityApi.setMyCharity(token, charitySelection.charityId, Number(charitySelection.percentage));
      setMyCharity(result);
      toast.success('Charity preference updated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to save charity preference');
    }
  };

  const summary = useMemo(() => {
    const drawsEntered = myDraws.length;
    const upcomingDrawDate = currentDraw?.draw_date ? formatSimpleDate(currentDraw.draw_date) : 'TBA';
    return { drawsEntered, upcomingDrawDate };
  }, [myDraws, currentDraw]);

  const submitIndependentDonation = async (e) => {
    e.preventDefault();
    try {
      if (!donationForm.charityId || !donationForm.amount) {
        toast.error('Charity and amount are required');
        return;
      }
      const result = await donationApi.create(token, {
        charityId: donationForm.charityId,
        amount: Number(donationForm.amount),
        note: donationForm.note || '',
        currency: 'INR',
      });
      toast.success(result.message || 'Donation recorded');
      setDonationForm((prev) => ({ ...prev, amount: '', note: '' }));
      const donationData = await donationApi.mine(token);
      setDonations(donationData);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to record donation');
    }
  };

  const submitWinnerProof = async (winnerId) => {
    try {
      const proofUrl = String(proofByWinnerId[winnerId] || '').trim();
      if (!proofUrl) {
        toast.error('Proof URL is required');
        return;
      }
      await winnerApi.submitProof(token, winnerId, proofUrl);
      toast.success('Proof submitted');
      const latest = await winnerApi.me(token);
      setWinnings(latest);
      setProofByWinnerId((prev) => ({ ...prev, [winnerId]: '' }));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to submit proof');
    }
  };

  return (
    <Layout>
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/8 via-white/5 to-white/8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">Member Console</p>
              <h1 className="text-3xl font-semibold">Welcome, {user?.full_name || user?.email}</h1>
              <p className="mt-2 text-sm text-slate-300">Manage plans, track scores, participate in draws, and monitor your contribution impact.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 xl:col-span-2">
            <h2 className="text-lg font-semibold">Subscription Actions</h2>
            <p className="mt-1 text-sm text-slate-300">Only one active subscription is allowed per account.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="btn-primary" onClick={() => startCheckout('monthly')} disabled={busyAction !== ''}>
                {busyAction === 'checkout' ? 'Processing...' : 'Subscribe Monthly'}
              </button>
              <button className="btn-secondary" onClick={() => startCheckout('yearly')} disabled={busyAction !== ''}>
                {busyAction === 'checkout' ? 'Processing...' : 'Subscribe Yearly'}
              </button>
              {hasSubscriptionRecord ? (
                <button className="btn-secondary" onClick={handleSubscriptionAction} disabled={busyAction !== ''}>
                  {busyAction === 'subscription'
                    ? (subscription?.isActive ? 'Cancelling...' : 'Removing...')
                    : (subscription?.isActive ? 'Cancel Subscription' : 'Remove Subscription')}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Subscription Snapshot</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><CircleCheck size={14} /> Active</span>
                <strong>{String(Boolean(subscription?.isActive))}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><BadgeDollarSign size={14} /> Plan</span>
                <strong>{subscription?.planType || 'N/A'}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><CalendarClock size={14} /> Expires</span>
                <strong>{formatSimpleDate(subscription?.expiresAt)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><CircleX size={14} /> Days remaining</span>
                <strong>{liveDaysRemaining}</strong>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><Trash2 size={14} /> Raw status</span>
                <strong>{subscription?.status || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Target size={17} /> Score Entry</h2>
            <p className="mt-1 text-sm text-slate-300">Enter up to the latest 5 Stableford scores (1-45).</p>

            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addScore}>
              <input
                className="field"
                type="number"
                min="1"
                max="45"
                placeholder="Score (1-45)"
                value={scoreForm.score}
                onChange={(e) => setScoreForm((prev) => ({ ...prev, score: e.target.value }))}
                disabled={!canUseSubscriberFeatures}
              />
              <input
                className="field"
                type="date"
                value={scoreForm.playedAt}
                onChange={(e) => setScoreForm((prev) => ({ ...prev, playedAt: e.target.value }))}
                disabled={!canUseSubscriberFeatures}
              />
              <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={!canUseSubscriberFeatures}>
                <PlusCircle size={15} /> Add
              </button>
            </form>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Avg: <strong>{scoreStats.average ?? 0}</strong></div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Best: <strong>{scoreStats.best ?? 'N/A'}</strong></div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Rounds: <strong>{scoreStats.totalRounds ?? 0}</strong></div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {(scores || []).length === 0 ? (
                <p className="text-slate-400">No scores yet.</p>
              ) : (
                scores.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <span>Score <strong>{item.score}</strong> · {formatSimpleDate(item.played_at)}</span>
                    <button className="text-rose-300" onClick={() => deleteScore(item.id)} disabled={!canUseSubscriberFeatures}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><HeartHandshake size={17} /> Charity Selection</h2>
            <p className="mt-1 text-sm text-slate-300">Set your charity recipient and contribution percentage.</p>

            <form className="mt-4 space-y-3" onSubmit={saveMyCharity}>
              <select
                className="field"
                value={charitySelection.charityId}
                onChange={(e) => setCharitySelection((prev) => ({ ...prev, charityId: e.target.value }))}
              >
                {(charities || []).length === 0 ? (
                  <option value="">No charities available</option>
                ) : null}
                {(charities || []).map((charity) => (
                  <option key={charity.id} value={charity.id}>{charity.name}</option>
                ))}
              </select>
              <input
                className="field"
                type="number"
                min="10"
                max="100"
                value={charitySelection.percentage}
                onChange={(e) => setCharitySelection((prev) => ({ ...prev, percentage: e.target.value }))}
              />
              <button className="btn-primary w-full" type="submit" disabled={!charitySelection.charityId}>Save Charity Preference</button>
            </form>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
              <p>Selected: <strong>{myCharity?.charity?.name || 'N/A'}</strong></p>
              <p>Contribution: <strong>{myCharity?.percentage || 0}%</strong></p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><Trophy size={17} /> Participation Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Draws Entered</p>
                <p className="text-xl font-semibold">{summary.drawsEntered}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Upcoming Draw</p>
                <p className="text-xl font-semibold">{summary.upcomingDrawDate}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><BadgeDollarSign size={17} /> Winnings Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Total Wins</p>
                <p className="text-xl font-semibold">{winnings.count || 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-slate-400">Total Won</p>
                <p className="text-xl font-semibold">{formatCurrency(winnings.totalWinnings || 0)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {(winnings.winnings || []).length === 0 ? (
                <p className="text-slate-400">No winnings yet.</p>
              ) : (
                winnings.winnings.map((win) => (
                  <div key={win.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p>Draw #{win?.draws?.draw_number || 'N/A'} · Match {win.match_type} · Prize {formatCurrency(win.prize_amount)}</p>
                    <p className="text-slate-300">Verification: {win.verification_status} · Payout: {win.payout_status}</p>
                    {win.verification_status === 'pending' ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          className="field"
                          placeholder="Proof URL"
                          value={proofByWinnerId[win.id] || ''}
                          onChange={(e) => setProofByWinnerId((prev) => ({ ...prev, [win.id]: e.target.value }))}
                        />
                        <button className="btn-secondary" type="button" onClick={() => submitWinnerProof(win.id)}>Submit Proof</button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><HeartHandshake size={17} /> Independent Donations</h2>
          <p className="mt-1 text-sm text-slate-300">Make extra donations independent of gameplay.</p>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]" onSubmit={submitIndependentDonation}>
            <select
              className="field"
              value={donationForm.charityId}
              onChange={(e) => setDonationForm((prev) => ({ ...prev, charityId: e.target.value }))}
            >
              {(charities || []).map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
            <input
              className="field"
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount"
              value={donationForm.amount}
              onChange={(e) => setDonationForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
            <input
              className="field"
              placeholder="Note (optional)"
              value={donationForm.note}
              onChange={(e) => setDonationForm((prev) => ({ ...prev, note: e.target.value }))}
            />
            <button className="btn-primary" type="submit">Donate</button>
          </form>
          <div className="mt-4 text-sm text-slate-300">
            Total independent donations: <strong>{formatCurrency(donations.totalAmount || 0)}</strong>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {(donations.donations || []).slice(0, 10).map((d) => (
              <div key={d.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span>{d?.charities?.name || d.charity_id} · {formatCurrency(d.amount)} · {formatSimpleDate(d.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
