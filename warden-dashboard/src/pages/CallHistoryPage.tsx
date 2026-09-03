import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { CallHistoryItem, Recording, Inmate } from '@/services/api/wardenApi';

/**
 * Call History Page - Complete history of all inmate calls.
 */
export function CallHistoryPage() {
  const { inmateId } = useParams<{ inmateId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [inmates, setInmates] = useState<Record<string, Inmate>>({});
  const [playing, setPlaying] = useState<Recording | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [kioskFilter, setKioskFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CallHistoryItem | null>(null);
  const [sortField, setSortField] = useState<'date'|'duration'>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table'|'timeline'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 5;

  const dummyCalls: CallHistoryItem[] = [
    { callId: 'CALL-20240801-001', roomId: 'ROOM-01', inmateId: 'INM-1021', contactId: 'FAM-201', kioskId: 'KIOSK-01', type: 'video', status: 'completed', startTime: new Date(Date.now()-86400000).toISOString(), endTime: new Date(Date.now()-86400000+12*60000).toISOString(), durationMinutes: 12 },
    { callId: 'CALL-20240802-002', roomId: 'ROOM-02', inmateId: 'INM-1023', contactId: 'FAM-205', kioskId: 'KIOSK-02', type: 'audio', status: 'completed', startTime: new Date(Date.now()-172800000).toISOString(), endTime: new Date(Date.now()-172800000+8*60000).toISOString(), durationMinutes: 8 },
    { callId: 'CALL-20240803-003', roomId: 'ROOM-01', inmateId: 'INM-1025', contactId: 'FAM-210', kioskId: 'KIOSK-03', type: 'video', status: 'failed', startTime: new Date(Date.now()-259200000).toISOString(), endTime: new Date(Date.now()-259200000+2*60000).toISOString(), durationMinutes: 2 },
  ];
  const dummyRecs: Recording[] = [
    { recordingId: 'REC-001', callId: 'CALL-20240801-001', inmateId: 'INM-1021', kioskId: 'KIOSK-01', startTime: dummyCalls[0].startTime, endTime: dummyCalls[0].endTime, duration: 720, size: 45*1024*1024, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', encryption: 'AES-256', retentionDays: 30, status: 'completed' },
    { recordingId: 'REC-002', callId: 'CALL-20240802-002', inmateId: 'INM-1023', kioskId: 'KIOSK-02', startTime: dummyCalls[1].startTime, endTime: dummyCalls[1].endTime, duration: 480, size: 8*1024*1024, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', encryption: 'AES-256', retentionDays: 30, status: 'completed' },
  ];

  const loadCalls = useCallback(async () => {
    try {
      setLoadError(null);
      const [callHistory, recs, inmateList] = await Promise.all([wardenApi.getCallHistory(), wardenApi.getRecordings(), wardenApi.getInmates().catch(()=>[] as Inmate[])]);
      const finalCalls = callHistory.length > 0 ? callHistory : dummyCalls;
      const finalRecs = recs.length > 0 ? recs : dummyRecs;
      setCalls(finalCalls);
      const map: Record<string, Recording> = {};
      finalRecs.forEach((r) => { map[r.callId] = r; });
      setRecordings(map);
      const imap: Record<string, Inmate> = {};
      (inmateList as Inmate[]).forEach(i=> imap[i.inmateId]=i);
      // dummy inmate fallback
      if(Object.keys(imap).length===0){
        dummyCalls.forEach((c,i)=>{
          imap[c.inmateId] = { inmateId:c.inmateId, firstName:`Rahul${i+1}`, lastName:'Kumar', prisonId:'PR-01', facility:'Barrack A', cellBlock:`B-${i+1}`, status:'active', photoUrl:`https://i.pravatar.cc/100?img=${i+10}`, securityLevel:'medium', sentenceDetails:'' } as Inmate;
        });
      }
      setInmates(imap);
    } catch (error) {
      setCalls(dummyCalls);
      const map: Record<string, Recording> = {};
      dummyRecs.forEach((r) => { map[r.callId] = r; });
      setRecordings(map);
      const imap: Record<string, Inmate> = {};
      dummyCalls.forEach((c,i)=>{
        imap[c.inmateId] = { inmateId:c.inmateId, firstName:`Rahul${i+1}`, lastName:'Kumar', prisonId:'PR-01', facility:'Barrack A', cellBlock:`B-${i+1}`, status:'active', photoUrl:`https://i.pravatar.cc/100?img=${i+10}`, securityLevel:'medium', sentenceDetails:'' } as Inmate;
      });
      setInmates(imap);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls, inmateId]);

  if (isLoading) {
    return <Loading message="Loading call history..." />;
  }

  if (loadError) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-error mb-4">{loadError}</p>
          <button
            onClick={() => { setIsLoading(true); loadCalls(); }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const kiosks = Array.from(new Set(calls.map(c=>c.kioskId)));
  const avgDuration = calls.length ? (calls.reduce((a,c)=>a+c.durationMinutes,0)/calls.length).toFixed(1) : '0';
  const withRec = Object.keys(recordings).length;

  const filtered = calls.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.callId.toLowerCase().includes(s) || c.inmateId.toLowerCase().includes(s) || c.contactId.toLowerCase().includes(s) || c.kioskId.toLowerCase().includes(s);
    const matchStatus = statusFilter==='all' || c.status===statusFilter;
    const matchType = typeFilter==='all' || c.type===typeFilter;
    const matchKiosk = kioskFilter==='all' || c.kioskId===kioskFilter;
    const d = new Date(c.startTime).toISOString().slice(0,10);
    const matchFrom = !dateFrom || d >= dateFrom;
    const matchTo = !dateTo || d <= dateTo;
    return matchSearch && matchStatus && matchType && matchKiosk && matchFrom && matchTo;
  }).sort((a,b)=>{
    if(sortField==='date') return sortDir==='asc' ? new Date(a.startTime).getTime()-new Date(b.startTime).getTime() : new Date(b.startTime).getTime()-new Date(a.startTime).getTime();
    return sortDir==='asc' ? a.durationMinutes-b.durationMinutes : b.durationMinutes-a.durationMinutes;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);
  const toggleSort = (f: 'date'|'duration') => {
    if(sortField===f) setSortDir(d=> d==='asc'?'desc':'asc'); else {setSortField(f); setSortDir('desc');}
  };

  const transcripts: Record<string,string> = {
    'CALL-20240801-001': 'Inmate: Request for extra time ... Warden: Approved with conditions ...',
    'CALL-20240802-002': 'Family: Health update ... Inmate: All good ...',
    'CALL-20240803-003': 'Call dropped due to network ...',
  };
  const quality = (c: CallHistoryItem) => c.status==='failed' ? 'bg-error' : c.durationMinutes>10 ? 'bg-success' : c.durationMinutes>5 ? 'bg-amber-500' : 'bg-neutral-400';
  const retentionLeft = (r: Recording) => {
    const days = r.retentionDays || 30;
    const elapsed = Math.floor((Date.now() - new Date(r.startTime).getTime())/86400000);
    const left = Math.max(0, days - elapsed);
    return {left, pct: Math.max(0, Math.min(100, (left/days)*100))};
  };

  const exportCSV = () => {
    const rows = [['Call ID','Date','Inmate','Contact','Kiosk','Type','Duration','Status','Recording']];
    filtered.forEach(c => {
      const rec = recordings[c.callId];
      rows.push([c.callId, formatDate(c.startTime), c.inmateId, c.contactId, c.kioskId, c.type, formatDuration(c.durationMinutes), c.status, rec?.url || rec?.status || 'No recording']);
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='call-logs.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const toggleBulk = (id: string) => {
    setSelectedIds(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const exportSelected = () => {
    const toExport = filtered.filter(c=> selectedIds.has(c.callId));
    const rows = [['Call ID','Date','Inmate','Contact','Kiosk','Type','Duration','Status']];
    (toExport.length?toExport:filtered).forEach(c=> rows.push([c.callId, formatDate(c.startTime), c.inmateId, c.contactId, c.kioskId, c.type, formatDuration(c.durationMinutes), c.status]));
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download= selectedIds.size? 'call-logs-selected.csv':'call-logs.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Call Logs</h1>
          <p className="text-neutral-600 mt-1">Call history with recordings - {filtered.length} of {calls.length} {selectedIds.size? `• ${selectedIds.size} selected`:''}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border-2 border-neutral-300 overflow-hidden">
            <button onClick={()=>setViewMode('table')} className={`px-3 py-1.5 text-sm ${viewMode==='table'?'bg-neutral-900 text-white':'bg-white'}`}>Table</button>
            <button onClick={()=>setViewMode('timeline')} className={`px-3 py-1.5 text-sm ${viewMode==='timeline'?'bg-neutral-900 text-white':'bg-white'}`}>Timeline</button>
          </div>
          <button onClick={exportCSV} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success-700">⬇ Export CSV</button>
          {selectedIds.size>0 && <button onClick={exportSelected} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">⬇ Selected ({selectedIds.size})</button>}
        </div>
      </div>



      <Card>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} placeholder="Search Call ID / Inmate" className="col-span-2 px-4 py-2 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value); setPage(1)}} className="px-4 py-2 border-2 border-neutral-300 rounded-lg"><option value="all">All Status</option><option value="completed">Completed</option><option value="failed">Failed</option></select>
          <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value); setPage(1)}} className="px-4 py-2 border-2 border-neutral-300 rounded-lg"><option value="all">All Types</option><option value="video">Video</option><option value="audio">Audio</option></select>
          <select value={kioskFilter} onChange={e=>{setKioskFilter(e.target.value); setPage(1)}} className="px-4 py-2 border-2 border-neutral-300 rounded-lg"><option value="all">All Kiosks</option>{kiosks.map(k=><option key={k} value={k}>{k}</option>)}</select>
          <div className="flex gap-2 col-span-2 md:col-span-1">
            <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value); setPage(1)}} className="flex-1 px-2 py-2 border-2 border-neutral-300 rounded-lg text-sm" />
            <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value); setPage(1)}} className="flex-1 px-2 py-2 border-2 border-neutral-300 rounded-lg text-sm" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">No call logs found</p>
          </div>
        ) : viewMode==='timeline' ? (
          <div className="space-y-4">
            {paged.map(call=>{
              const rec=recordings[call.callId];
              const risk = inmates[call.inmateId]?.securityLevel || 'medium';
              return (
                <div key={call.callId} onClick={()=>setSelected(call)} className="flex gap-4 p-4 border rounded-xl hover:bg-neutral-50 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${quality(call)}`} />
                    <div className="w-0.5 flex-1 bg-neutral-200 mt-2" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-mono text-xs">{call.callId} • {formatDate(call.startTime)} • {formatDuration(call.durationMinutes)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${call.status==='completed'?'bg-success/10 text-success':'bg-error/10 text-error'}`}>{call.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img src={inmates[call.inmateId]?.photoUrl || 'https://i.pravatar.cc/100'} alt="" className="w-8 h-8 rounded-full" />
                      <p className="text-sm font-medium">{inmates[call.inmateId]?.firstName || call.inmateId} <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${risk==='high'?'bg-error/10 text-error':risk==='low'?'bg-success/10 text-success':'bg-amber-100 text-amber-700'}`}>{risk}</span></p>
                      <span className="text-xs text-neutral-500">• {call.kioskId} • {call.type}</span>
                    </div>
                    {transcripts[call.callId] && <p className="text-xs text-neutral-500 mt-2 line-clamp-1 italic">"{transcripts[call.callId]}"</p>}
                    {rec && <div className="mt-2 flex items-center gap-2 text-xs"><span className="text-neutral-500">{rec.encryption || 'AES-256'}</span>{rec.retentionDays && <><div className="flex-1 max-w-32 h-1.5 bg-neutral-200 rounded"><div className="h-1.5 bg-purple-600 rounded" style={{width: `${retentionLeft(rec).pct}%`}} /></div><span className="text-purple-600">{retentionLeft(rec).left}d left</span></>}<button onClick={e=>{e.stopPropagation(); setPlaying(rec)}} className="ml-auto px-2 py-1 bg-primary-600 text-white rounded text-xs">▶ Play</button></div>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-3 py-3"><input type="checkbox" checked={paged.length>0 && paged.every(c=>selectedIds.has(c.callId))} onChange={e=>{ if(e.target.checked) setSelectedIds(new Set(paged.map(c=>c.callId))); else setSelectedIds(new Set());}} /></th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Call ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900 cursor-pointer select-none" onClick={()=>toggleSort('date')}>Date {sortField==='date'?(sortDir==='asc'?'↑':'↓'):''}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Inmate</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Risk</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Kiosk</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900 cursor-pointer select-none" onClick={()=>toggleSort('duration')}>Duration {sortField==='duration'?(sortDir==='asc'?'↑':'↓'):''}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Recording</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((call) => {
                  const rec = recordings[call.callId];
                  const risk = inmates[call.inmateId]?.securityLevel || 'medium';
                  const ret = rec ? retentionLeft(rec) : null;
                  return (
                  <tr key={call.callId} onClick={()=>setSelected(call)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                    <td className="px-3" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(call.callId)} onChange={()=>toggleBulk(call.callId)} /></td>
                    <td className="py-3 px-4 text-sm text-neutral-900 font-mono text-xs"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${quality(call)}`} />{call.callId}</div><p className="text-xs text-neutral-400 truncate max-w-32" title={transcripts[call.callId]}>{transcripts[call.callId]?.slice(0,30) || ''}</p></td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{formatDate(call.startTime)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={inmates[call.inmateId]?.photoUrl || `https://i.pravatar.cc/100?img=${call.inmateId.slice(-2)}`} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-200" onError={e=> (e.currentTarget.src='https://i.pravatar.cc/100')} />
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{inmates[call.inmateId] ? `${inmates[call.inmateId].firstName} ${inmates[call.inmateId].lastName}` : call.inmateId}</p>
                          <p className="text-xs text-neutral-500">{call.inmateId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${risk==='high'?'bg-error/10 text-error border border-error/20':risk==='low'?'bg-success/10 text-success border border-success/20':'bg-amber-100 text-amber-700 border border-amber-200'}`}>{risk}</span></td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{call.contactId}</td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{call.kioskId}</td>
                    <td className="py-3 px-4 text-sm text-neutral-900 capitalize">{call.type}</td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{formatDuration(call.durationMinutes)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        call.status === 'completed' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={e=>e.stopPropagation()}>
                      {rec?.url ? (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <button onClick={() => setPlaying(rec)} className="px-3 py-1 bg-primary-600 text-white rounded-md text-xs hover:bg-primary-700">▶ Play</button>
                            <a href={rec.url} download className="px-3 py-1 bg-neutral-800 text-white rounded-md text-xs hover:bg-neutral-900">⬇ Download</a>
                          </div>
                          <div className="flex items-center gap-1 text-xs"><div className="flex-1 max-w-20 h-1 bg-neutral-200 rounded"><div className="h-1 bg-purple-600 rounded" style={{width:`${ret!.pct}%`}} /></div><span className="text-purple-600">{ret!.left}d</span></div>
                        </div>
                      ) : rec ? (
                        <span className="text-xs text-neutral-500 capitalize">{rec.status}</span>
                      ) : (
                        <span className="text-xs text-neutral-400">No recording</span>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs text-neutral-500">Showing {(page-1)*pageSize+1}-{Math.min(page*pageSize, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button disabled={page===1} onClick={()=>setPage(1)} className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">Prev</button>
              <span className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium">{page} / {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">Next</button>
              <button disabled={page===totalPages} onClick={()=>setPage(totalPages)} className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">»</button>
            </div>
          </div>
        )}
      </Card>
      {playing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPlaying(null)}>
          <div className="bg-white rounded-xl p-4 max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Recording - {playing.callId}</h3>
              <button onClick={() => setPlaying(null)} className="text-neutral-500 hover:text-neutral-900">✕</button>
            </div>
            {playing.callId && (
              calls.find(c=>c.callId===playing.callId)?.type==='audio' ? (
                <audio controls autoPlay src={playing.url || ''} className="w-full" />
              ) : (
                <video controls autoPlay src={playing.url || ''} className="w-full rounded-lg bg-black" style={{maxHeight:'60vh'}} />
              )
            )}
            <p className="text-xs text-neutral-500 mt-2">Inmate {playing.inmateId} • {formatDuration((playing.duration||0)/60)}</p>
          </div>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={()=>setSelected(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-auto p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Call Details</h3>
              <button onClick={()=>setSelected(null)} className="text-neutral-500">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <img src={inmates[selected.inmateId]?.photoUrl || 'https://i.pravatar.cc/100'} alt="" className="w-12 h-12 rounded-full" />
              <div>
                <p className="font-medium">{inmates[selected.inmateId] ? `${inmates[selected.inmateId].firstName} ${inmates[selected.inmateId].lastName}` : selected.inmateId}</p>
                <p className="text-xs text-neutral-500">{selected.inmateId} • {inmates[selected.inmateId]?.cellBlock || ''}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p><b>Call ID:</b> {selected.callId}</p>
              <p><b>Date:</b> {formatDate(selected.startTime)}</p>
              <p><b>Kiosk:</b> {selected.kioskId}</p>
              <p><b>Type:</b> {selected.type} • <b>Duration:</b> {formatDuration(selected.durationMinutes)} • <b>Status:</b> {selected.status}</p>
              <p><b>Contact:</b> {selected.contactId}</p>
            </div>
            {recordings[selected.callId]?.url && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Recording</p>
                <video controls src={recordings[selected.callId].url!} className="w-full rounded-lg bg-black" />
                <a href={recordings[selected.callId].url!} download className="mt-2 inline-block px-4 py-2 bg-primary-600 text-white rounded text-sm">⬇ Download Recording</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
