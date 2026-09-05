/**
 * Jail-account integration layer.
 *
 * The kiosk wallet screen must reflect the inmate's REAL jail account balance
 * and the deductions applied to it. When JAIL_ACCOUNT_API_URL is configured
 * this module calls the external prison/jail accounting API. Otherwise it falls
 * back to the internal Postgres-backed collections (wallets.json /
 * transactions.json) so the kiosk keeps working during development.
 *
 * The wallet statement is the SINGLE source of truth for everything the app
 * shows about money (balance, total spent, last recharge). Derived values are
 * computed here once, from the transaction ledger, so the dashboard, profile
 * and wallet screens always agree and the frontend never has to re-derive them.
 */
const { readDb } = require('./db');

const JAIL_ACCOUNT_API_URL = process.env.JAIL_ACCOUNT_API_URL || '';
const JAIL_ACCOUNT_TIMEOUT_MS = parseInt(process.env.JAIL_ACCOUNT_TIMEOUT_MS || '4000', 10);

/** Resolve an inmate record by inmateId / assignedKioskId / prisonerNumber. */
async function resolveInmate(id) {
  const inmates = await readDb('inmates.json');
  return (
    inmates.find((i) => i.inmateId === id) ||
    inmates.find((i) => i.assignedKioskId === id) ||
    inmates.find((i) => i.prisonerNumber === id) ||
    null
  );
}

/** Find the internal wallet for an inmate, via walletId first, then inmateId. */
async function internalWallet(inmate) {
  const wallets = await readDb('wallets.json');
  return (
    wallets.find((w) => inmate.walletId && w.walletId === inmate.walletId) ||
    wallets.find((w) => w.inmateId === inmate.inmateId) ||
    wallets.find((w) => w.inmateId === `INM-${inmate.inmateId}`) ||
    null
  );
}

/** All internal transactions belonging to a wallet. */
async function internalTransactions(wallet) {
  const transactions = await readDb('transactions.json');
  return transactions.filter((t) => t.walletId === wallet.walletId);
}

/** Derive wallet summary (total spent, last recharge) from a settled ledger. */
function deriveSummary(transactions, wallet = {}) {
  const settled = transactions.filter((t) => {
    const s = String(t.status || '').toLowerCase();
    return s === 'success' || s === 'completed';
  });
  const charges = settled.filter((t) => String(t.type || '').toLowerCase() === 'charge');
  const recharges = settled.filter((t) => String(t.type || '').toLowerCase() === 'recharge');

  const totalSpent = charges.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const lastRecharge = recharges.sort((a, b) => {
    const at = new Date(a.timestamp || 0).getTime();
    const bt = new Date(b.timestamp || 0).getTime();
    return bt - at;
  })[0] || null;

  // Recompute the balance from the ledger (recharges minus charges) so the
  // stored counter and the ledger never drift apart. Zero stays zero.
  const deposit = recharges.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const balance = Math.max(0, deposit - totalSpent);

  return {
    balance: Number.isFinite(balance) ? balance : 0,
    totalSpent: Number.isFinite(totalSpent) ? totalSpent : 0,
    lastRecharge: lastRecharge ? lastRecharge.timestamp : null,
    lastRechargeAmount: lastRecharge ? (Number(lastRecharge.amount) || 0) : null,
    remainingMinutes: 0,
    transactionCount: settled.length
  };
}

async function getPricingRates() {
  try {
    const raw = await readDb('pricing.json');
    // pricing may be singleton object {audio, video} or array-wrapped [{audio, video}]
    const pricing = Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
    const videoRate = Number(pricing?.video?.ratePerMinute ?? pricing?.video?.price ?? 2.5);
    const audioRate = Number(pricing?.audio?.ratePerMinute ?? pricing?.audio?.price ?? 1.0);
    return {
      videoRate: Number.isFinite(videoRate) && videoRate > 0 ? videoRate : 2.5,
      audioRate: Number.isFinite(audioRate) && audioRate > 0 ? audioRate : 1.0,
    };
  } catch {
    return { videoRate: 2.5, audioRate: 1.0 };
  }
}

function computeRemainingMinutes(balance, rate) {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.floor(balance / rate);
}

function computeRemaining(balance, audioRate, videoRate) {
  const AUDIO_MIN_BALANCE = 10;
  const VIDEO_MIN_BALANCE = 25;
  return {
    remainingMinutes: computeRemainingMinutes(balance, videoRate), // legacy: video
    remainingAudioMinutes: computeRemainingMinutes(balance, audioRate),
    remainingVideoMinutes: computeRemainingMinutes(balance, videoRate),
    audioCallEligible: balance >= AUDIO_MIN_BALANCE,
    videoCallEligible: balance >= VIDEO_MIN_BALANCE,
    callEligibility: balance < AUDIO_MIN_BALANCE ? 'none' : balance < VIDEO_MIN_BALANCE ? 'audio_only' : 'both',
    minAudioBalance: AUDIO_MIN_BALANCE,
    minVideoBalance: VIDEO_MIN_BALANCE,
  };
}

/** Try the external jail accounting API. Returns null when not configured/failing. */
async function externalStatement(wallet) {
  if (!JAIL_ACCOUNT_API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JAIL_ACCOUNT_TIMEOUT_MS);
  try {
    const res = await fetch(`${JAIL_ACCOUNT_API_URL}/accounts/${encodeURIComponent(wallet.walletId)}/statement`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      console.error(`[jail-account] external API ${res.status}: ${await res.text().catch(() => '')}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[jail-account] external API fetch failed: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a wallet statement (balance + transactions) for an inmate.
 * Always returns { wallet, transactions } with internal data as fallback.
 */
async function getStatement(id) {
  const inmate = await resolveInmate(id);
  if (!inmate) return null;

  const wallet = await internalWallet(inmate);
  if (!wallet) return null;

  const external = await externalStatement(wallet);
  if (external && (external.wallet || external.balance != null) && Array.isArray(external.transactions)) {
    const summary = deriveSummary(external.transactions, external.wallet || wallet);
    const { videoRate, audioRate } = await getPricingRates();
    const remaining = computeRemaining(summary.balance, audioRate, videoRate);
    Object.assign(summary, remaining);
    return {
      wallet: {
        walletId: wallet.walletId,
        inmateId: wallet.inmateId || inmate.inmateId,
        balance: summary.balance,
        currency: external.currency || external.wallet?.currency || wallet.currency || 'INR',
        status: external.status || external.wallet?.status || wallet.status || 'active',
        totalSpent: summary.totalSpent,
        lastRecharge: summary.lastRecharge,
        lastRechargeAmount: summary.lastRechargeAmount,
        remainingMinutes: summary.remainingMinutes,
        remainingAudioMinutes: summary.remainingAudioMinutes,
        remainingVideoMinutes: summary.remainingVideoMinutes,
        audioCallEligible: summary.audioCallEligible,
        videoCallEligible: summary.videoCallEligible,
        callEligibility: summary.callEligibility,
        minAudioBalance: summary.minAudioBalance,
        minVideoBalance: summary.minVideoBalance
      },
      transactions: external.transactions
    };
  }

  const transactions = await internalTransactions(wallet);
  const summary = deriveSummary(transactions, wallet);
  const { videoRate, audioRate } = await getPricingRates();
  const remaining = computeRemaining(summary.balance, audioRate, videoRate);
  Object.assign(summary, remaining);
  return {
    wallet: {
      walletId: wallet.walletId,
      inmateId: wallet.inmateId || inmate.inmateId,
      balance: summary.balance,
      currency: wallet.currency || 'INR',
      status: wallet.status || 'active',
      totalSpent: summary.totalSpent,
      lastRecharge: summary.lastRecharge,
      lastRechargeAmount: summary.lastRechargeAmount,
      remainingMinutes: summary.remainingMinutes,
      remainingAudioMinutes: summary.remainingAudioMinutes,
      remainingVideoMinutes: summary.remainingVideoMinutes,
      audioCallEligible: summary.audioCallEligible,
      videoCallEligible: summary.videoCallEligible,
      callEligibility: summary.callEligibility,
      minAudioBalance: summary.minAudioBalance,
      minVideoBalance: summary.minVideoBalance
    },
    transactions
  };
}

module.exports = { getStatement, resolveInmate };