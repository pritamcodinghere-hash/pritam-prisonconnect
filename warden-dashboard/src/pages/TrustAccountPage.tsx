import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { Wallet } from '@/services/api/wardenApi';

export function TrustAccountPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const dummy: Wallet[] = [
    { walletId:'WAL-01', inmateId:'INM-1021', balance:420, currency:'INR', lastRechargeAmount:200, lastRechargeDate:new Date(Date.now()-86400000).toISOString(), totalSpent:580, remainingMinutes:84 },
    { walletId:'WAL-02', inmateId:'INM-1023', balance:45, currency:'INR', lastRechargeAmount:100, lastRechargeDate:new Date(Date.now()-172800000).toISOString(), totalSpent:455, remainingMinutes:9 },
  ];
  const transactions = [
    { id:'TXN-01', inmateId:'INM-1021', type:'debit', amount:60, reason:'Call CALL-20240801-001 12min video', date:new Date(Date.now()-86400000).toISOString() },
    { id:'TXN-02', inmateId:'INM-1023', type:'refund', amount:24, reason:'Refund - failed CALL-20240803-003', date:new Date(Date.now()-259200000).toISOString() },
    { id:'TXN-03', inmateId:'INM-1021', type:'credit', amount:200, reason:'Top-up via family', date:new Date(Date.now()-86400000).toISOString() },
  ];

  const load = useCallback(async()=>{
    try{
      const w = await wardenApi.getWallets().catch(()=>[] as Wallet[]);
      setWallets(w.length?w:dummy);
    }catch{ setWallets(dummy); } finally{ setLoading(false); }
  },[]);
  useEffect(()=>{load();},[load]);

  if(loading) return <Loading message="Loading trust accounts..." />;
  const filtered = wallets.filter(w=> !search || w.inmateId.toLowerCase().includes(search.toLowerCase()));
  const lowBalance = filtered.filter(w=> w.balance < 50);

  const totalBalance = filtered.reduce((a,w)=>a+w.balance,0);
  const totalSpent = filtered.reduce((a,w)=>a+w.totalSpent,0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Trust Account</h1><p className="text-neutral-600">Professional wallet & refund center</p></div>

      <div className="grid grid-cols-2 gap-4">
        <Card><div className="p-5 flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowBalance.length?'bg-error text-white':'bg-neutral-100 text-neutral-400'}`}>!</div><div><p className={`text-2xl font-extrabold leading-none ${lowBalance.length?'text-error':''}`}>{lowBalance.length}</p><p className="text-xs font-semibold uppercase text-neutral-500">Low Balance</p></div></div></Card>
        <Card><div className="p-5 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-600">↩</div><div><p className="text-2xl font-extrabold leading-none">{transactions.filter(t=>t.type==='refund').length}</p><p className="text-xs font-semibold uppercase text-neutral-500">Refunds</p></div></div></Card>
      </div>

      {lowBalance.length>0 && (
        <Card><div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 shadow-sm"><span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center animate-pulse">!</span><div><p className="font-bold text-amber-800">Low Balance Alert - {lowBalance.length} inmates</p><p className="text-sm text-amber-700">{lowBalance.map(w=>`${w.inmateId} (₹${w.balance})`).join(' • ')} • Top-up required</p></div></div></Card>
      )}

      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold flex items-center gap-2 text-lg">Wallets <span className="px-2.5 py-1 bg-neutral-900 text-white rounded-full text-xs font-bold">{filtered.length}</span></h2>
          <div className="flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inmate..." className="px-4 py-2 border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm shadow-sm" />
            <button onClick={()=>window.print()} className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-black">Print</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Inmate</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Balance</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Remaining</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Last Recharge</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Total Spent</th><th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Bar</th></tr></thead>
            <tbody>
              {filtered.map(w=>(
                <tr key={w.walletId} className="border-b hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono font-medium flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${w.balance<50?'bg-error animate-pulse':'bg-success'}`} />{w.inmateId}</td>
                  <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-sm ${w.balance<50?'bg-error text-white border-error':'bg-success text-white border-success'}`}>₹{w.balance}</span></td>
                  <td className="py-3 px-4 text-sm font-medium">{w.remainingMinutes} <span className="text-xs text-neutral-500">min</span></td>
                  <td className="py-3 px-4 text-sm"><span className="font-medium">₹{w.lastRechargeAmount}</span> <span className="text-neutral-500">• {new Date(w.lastRechargeDate).toLocaleDateString('en-IN')}</span></td>
                  <td className="py-3 px-4 text-sm font-medium">₹{w.totalSpent}</td>
                  <td className="py-3 px-4"><div className="w-20 h-1.5 bg-neutral-200 rounded-full overflow-hidden"><div className="h-1.5 bg-primary-600 rounded-full" style={{width: `${Math.min(100, (w.balance/500)*100)}%`}} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold flex items-center gap-2 text-lg"><span className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">↩</span> Transaction History - Refund Log</h2>
          <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-medium">{transactions.length} txns</span>
        </div>
        <div className="space-y-3">
          {transactions.map(t=>(
            <div key={t.id} className="flex items-center justify-between p-4 border-2 border-neutral-100 rounded-xl hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${t.type==='refund'?'bg-amber-500':t.type==='credit'?'bg-success':'bg-error'}`}>{t.type==='refund'?'↩':t.type==='credit'?'+':'−'}</div>
                <div>
                  <p className="text-sm font-semibold">{t.reason} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold border ${t.type==='refund'?'bg-amber-100 text-amber-700 border-amber-200':t.type==='credit'?'bg-success/10 text-success border-success/20':'bg-error/10 text-error border-error/20'}`}>{t.type}</span></p>
                  <p className="text-xs text-neutral-500 mt-0.5">{t.inmateId} • {new Date(t.date).toLocaleDateString('en-IN')} • {new Date(t.date).toLocaleTimeString('en-IN')}</p>
                </div>
              </div>
              <p className={`text-lg font-extrabold ${t.type==='refund'?'text-amber-600':t.type==='credit'?'text-success':'text-error'}`}>{t.type==='refund'?'+':t.type==='credit'?'+':'-'}₹{t.amount}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
