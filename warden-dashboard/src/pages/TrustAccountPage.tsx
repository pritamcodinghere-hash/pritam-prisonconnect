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

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Trust Account</h1><p className="text-neutral-600">Wallet, top-up, refund - jail trust</p></div>

      {lowBalance.length>0 && (
        <Card><div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">!</span><div><p className="font-semibold text-amber-800">Low Balance Alert</p><p className="text-sm text-amber-700">{lowBalance.map(w=>w.inmateId).join(', ')} - balance &lt; ₹50</p></div></div></Card>
      )}

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold flex items-center gap-2">Wallets <span className="px-2 py-0.5 bg-neutral-900 text-white rounded-full text-xs">{filtered.length}</span></h2>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inmate..." className="px-3 py-2 border-2 border-neutral-200 rounded-lg text-sm" />
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Inmate</th><th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Balance</th><th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Remaining Min</th><th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Last Recharge</th><th className="text-left py-2.5 px-3 text-xs font-semibold uppercase">Total Spent</th></tr></thead>
            <tbody>
              {filtered.map(w=>(
                <tr key={w.walletId} className="border-b hover:bg-neutral-50">
                  <td className="py-2.5 px-3 text-sm font-mono">{w.inmateId}</td>
                  <td className="py-2.5 px-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${w.balance<50?'bg-error/10 text-error border-error/20':'bg-success/10 text-success border-success/20'}`}>₹{w.balance}</span></td>
                  <td className="py-2.5 px-3 text-sm">{w.remainingMinutes} min</td>
                  <td className="py-2.5 px-3 text-sm">₹{w.lastRechargeAmount} • {new Date(w.lastRechargeDate).toLocaleDateString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-sm">₹{w.totalSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold mb-4 flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm">↩</span> Transaction History - Refund Log</h2>
        <div className="space-y-2">
          {transactions.map(t=>(
            <div key={t.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-neutral-50">
              <div>
                <p className="text-sm font-medium">{t.reason} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${t.type==='refund'?'bg-amber-100 text-amber-700':t.type==='credit'?'bg-success/10 text-success':'bg-neutral-100'}`}>{t.type}</span></p>
                <p className="text-xs text-neutral-500">{t.inmateId} • {new Date(t.date).toLocaleDateString('en-IN')}</p>
              </div>
              <p className={`font-bold ${t.type==='refund'?'text-success':t.type==='credit'?'text-success':'text-error'}`}>{t.type==='refund'?'+':t.type==='credit'?'+':'-'}₹{t.amount}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
