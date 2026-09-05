import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { Wallet, Transaction, Inmate } from '@/services/api/wardenApi';

export function TrustAccountPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [inmates, setInmates] = useState<Record<string, Inmate>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string|null>(null);

  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [statement, setStatement] = useState<{wallet: Wallet, transactions: Transaction[]} | null>(null);
  const [stmtLoading, setStmtLoading] = useState(false);
  const [tab, setTab] = useState<'all'|'charge'|'recharge'|'refund'>('all');

  const load = useCallback(async()=>{
    try{
      setError(null);
      const [w, im] = await Promise.all([
        wardenApi.getWallets(),
        wardenApi.getInmates().catch(()=>[] as Inmate[])
      ]);
      setWallets(w ?? []);
      const map: Record<string, Inmate> = {};
      im.forEach(i=> map[i.inmateId]=i);
      setInmates(map);
    } catch (e:any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load wallets');
      setWallets([]);
    } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{load();},[load]);

  // Fetch statement when inmate clicked
  useEffect(()=>{
    if(!selectedId) { setStatement(null); return; }
    setStmtLoading(true);
    wardenApi.getWalletStatement(selectedId)
      .then(data=>{
        const w = wallets.find(x=>x.inmateId===selectedId) || data?.wallet;
        if(!w) { setStatement(null); return; }
        setStatement({ wallet: w, transactions: data?.transactions ?? [] } as any);
      })
      .catch(()=>{
        const w = wallets.find(x=>x.inmateId===selectedId);
        if(w) setStatement({ wallet: w, transactions: [] });
        else setStatement(null);
      })
      .finally(()=> setStmtLoading(false));
  },[selectedId, wallets]);

  if(loading) return <Loading message="Loading trust accounts..." />;
  if(error) return <Card><div className="text-center py-12"><p className="text-error mb-4">{error}</p><button onClick={()=>{setLoading(true); load();}} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Retry</button></div></Card>;
  const filtered = wallets.filter(w=> !search || w.inmateId.toLowerCase().includes(search.toLowerCase()) || `${inmates[w.inmateId]?.firstName || ''} ${inmates[w.inmateId]?.lastName || ''}`.toLowerCase().includes(search.toLowerCase()));

  const selectedWallet = selectedId ? wallets.find(w=>w.inmateId===selectedId) || statement?.wallet || null : null;
  const selectedInmate = selectedId ? inmates[selectedId] : null;
  const txns = statement?.transactions ?? [];
  const filteredTxns = txns.filter(t=>{
    const type = String(t.type||'').toLowerCase();
    if(tab==='charge') return type==='charge' || type==='debit';
    if(tab==='recharge') return type==='recharge' || type==='credit';
    if(tab==='refund') return type==='refund';
    return true;
  });
  const totalCharges = txns.filter(t=> ['charge','debit'].includes(String(t.type).toLowerCase())).reduce((a,t)=>a+Number(t.amount||0),0);
  const totalRecharges = txns.filter(t=> ['recharge','credit'].includes(String(t.type).toLowerCase())).reduce((a,t)=>a+Number(t.amount||0),0);
  const totalRefunds = txns.filter(t=> String(t.type).toLowerCase()==='refund').reduce((a,t)=>a+Number(t.amount||0),0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Trust Account</h1><p className="text-neutral-600">Professional wallet & refund center — click inmate for statement</p></div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold flex items-center gap-2 text-lg">Wallets <span className="px-2.5 py-1 bg-neutral-900 text-white rounded-full text-xs font-bold">{filtered.length}</span> <span className="text-xs font-normal text-neutral-500">Click row for transaction history</span></h2>
          <div className="flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inmate..." className="px-4 py-2 border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm shadow-sm" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Inmate</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Balance</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Remaining</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"></th></tr></thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-neutral-500">{wallets.length===0 ? 'No trust accounts — backend returned empty. Add wallets via backend seed or inmates.' : `No wallets match "${search}"`}</td></tr>
              ) : filtered.map(w=>{
                const audioMin = w.remainingAudioMinutes ?? Math.floor(w.balance / 1);
                const videoMin = w.remainingVideoMinutes ?? w.remainingMinutes;
                const inmate = inmates[w.inmateId];
                return (
                <tr key={w.walletId} onClick={()=> setSelectedId(w.inmateId)} className={`border-b hover:bg-primary-50 transition-colors cursor-pointer ${selectedId===w.inmateId?'bg-primary-50 ring-1 ring-inset ring-primary-200':''}`}>
                  <td className="py-3 px-4 text-sm font-medium flex items-center gap-3">
                    <img src={inmate?.photoUrl || 'https://i.pravatar.cc/100?img=10'} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-200" onError={e=> (e.currentTarget.src='https://i.pravatar.cc/100')} />
                    <div>
                      <p className="font-mono font-medium flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${w.callEligibility==='none'?'bg-error animate-pulse':w.callEligibility==='audio_only'?'bg-amber-500 animate-pulse':w.videoCallEligible===false && w.balance < 25 ? 'bg-amber-500 animate-pulse' : w.audioCallEligible===false && w.balance < 10 ? 'bg-error animate-pulse' : w.balance<10?'bg-error animate-pulse':w.balance<25?'bg-amber-500 animate-pulse':'bg-success'}`} />{w.inmateId}</p>
                      <p className="text-xs text-neutral-500">{inmate ? `${inmate.firstName} ${inmate.lastName}` : '—'} • {inmate?.facility || ''} {(w.callEligibility==='none' || (!w.callEligibility && w.balance<10)) ? <span className="text-error font-medium">• No calls (min ₹{w.minAudioBalance ?? 10} required)</span> : (w.callEligibility==='audio_only' || (!w.callEligibility && w.balance<25)) ? <span className="text-amber-600 font-medium">• Audio only (video requires ₹{w.minVideoBalance ?? 25})</span> : <span className="text-success font-medium">• Audio & Video available</span>}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-sm ${(w.callEligibility==='none' || (!w.callEligibility && w.balance<10))?'bg-error text-white border-error':(w.callEligibility==='audio_only' || (!w.callEligibility && w.balance<25))?'bg-amber-500 text-white border-amber-500':'bg-success text-white border-success'}`}>₹{w.balance}</span></td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />{audioMin} min <span className="text-xs text-neutral-500 font-normal">Audio @ ₹1/min</span></span>
                      <span className="font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" />{videoMin} min <span className="text-xs text-neutral-500 font-normal">Video @ ₹2.5/min</span></span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right"><span className="text-xs text-primary-600 font-medium">View →</span></td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Interface: Transaction Drawer */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={()=> setSelectedId(null)}>
          <div className="bg-white w-full max-w-xl h-full overflow-auto" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Inmate Statement</h2>
                <p className="text-sm text-neutral-500">{selectedId} {selectedInmate ? `• ${selectedInmate.firstName} ${selectedInmate.lastName} • ${selectedInmate.facility}` : ''}</p>
              </div>
              <button onClick={()=> setSelectedId(null)} className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center">✕</button>
            </div>

            {stmtLoading ? <div className="p-12 text-center"><Loading message="Loading statement..." /></div> : !selectedWallet ? <p className="p-6 text-sm text-neutral-500">No wallet found</p> : (
              <div className="p-6 space-y-6">
                {/* Wallet summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-xl"><p className="text-xs uppercase font-semibold text-neutral-500">Balance</p><p className="text-2xl font-extrabold text-success">₹{selectedWallet.balance}</p><p className="text-xs text-neutral-500">{selectedWallet.currency}</p></div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl"><p className="text-xs uppercase font-semibold text-neutral-500">Total Debited</p><p className="text-2xl font-extrabold text-amber-700">₹{selectedWallet.totalSpent}</p><p className="text-xs text-neutral-500">from ledger</p></div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl"><p className="text-xs uppercase font-semibold text-neutral-500">Audio Remaining</p><p className="text-xl font-bold text-blue-600">{selectedWallet.remainingAudioMinutes ?? Math.floor(selectedWallet.balance/1)} min</p><p className="text-xs text-neutral-500">@ ₹1/min</p></div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl"><p className="text-xs uppercase font-semibold text-neutral-500">Video Remaining</p><p className="text-xl font-bold text-purple-600">{selectedWallet.remainingVideoMinutes ?? selectedWallet.remainingMinutes} min</p><p className="text-xs text-neutral-500">@ ₹2.5/min</p></div>
                </div>

                {/* Tabs — clean segmented */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 p-1 bg-neutral-100 rounded-2xl">
                    {(['all','charge','recharge','refund'] as const).map(t=> {
                      const label = t==='charge'?'Charges':t==='recharge'?'Recharges':t==='refund'?'Refunds':'All';
                      const count = t==='all' ? txns.length : txns.filter(x=> {
                        const ty=String(x.type).toLowerCase();
                        if(t==='charge') return ty==='charge'||ty==='debit';
                        if(t==='recharge') return ty==='recharge'||ty==='credit';
                        if(t==='refund') return ty==='refund';
                        return true;
                      }).length;
                      return (
                        <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t?'bg-white shadow-sm border border-neutral-200 text-neutral-900':'text-neutral-500 hover:text-neutral-700'}`}>
                          {label} <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${tab===t?'bg-neutral-900 text-white':'bg-white border'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-neutral-500 bg-white border px-3 py-1.5 rounded-full">{filteredTxns.length} txns</span>
                </div>

                {/* Transaction list — clean cards */}
                <div className="space-y-3">
                  {filteredTxns.length===0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                      <p className="text-sm font-medium text-neutral-600">No transactions</p>
                      <p className="text-xs text-neutral-400 mt-1">No {tab==='all'?'transactions':tab} found for this inmate</p>
                    </div>
                  ) : filteredTxns.map(tx=>{
                    const type = String(tx.type).toLowerCase();
                    const isCharge = type==='charge' || type==='debit';
                    const isRecharge = type==='recharge' || type==='credit';
                    const isRefund = type==='refund';
                    const date = new Date(tx.timestamp);
                    const dateStr = date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                    const timeStr = date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
                    return (
                      <div key={tx.transactionId} className="group flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:shadow-md hover:border-neutral-300 transition-all">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm shrink-0 ${isRefund?'bg-amber-500':isRecharge?'bg-emerald-500':'bg-red-500'}`}>
                          <span className="text-lg leading-none">{isRefund?'↩':isRecharge?'+':'−'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-neutral-900 leading-tight truncate">{tx.description || tx.reason || tx.callId || type}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isRefund?'bg-amber-50 text-amber-700 border-amber-200':isRecharge?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-600 border-red-200'}`}>{type}</span>
                            {tx.status && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-500 border">{tx.status}</span>}
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                            <span>{dateStr}</span><span className="w-1 h-1 bg-neutral-300 rounded-full" /><span>{timeStr}</span>{tx.callId && <><span className="w-1 h-1 bg-neutral-300 rounded-full" /><span className="font-mono text-[11px] bg-neutral-50 px-1.5 py-0.5 rounded border">{tx.callId}</span></>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-extrabold leading-none ${isRefund?'text-amber-600':isRecharge?'text-emerald-600':'text-red-600'}`}>{isRefund || isRecharge ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                          <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mt-1">{isCharge?'Debited':isRefund?'Refunded':'Credited'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t">
                  <button onClick={()=> setSelectedId(null)} className="w-full py-3 bg-white border-2 rounded-xl font-medium hover:bg-neutral-50">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
