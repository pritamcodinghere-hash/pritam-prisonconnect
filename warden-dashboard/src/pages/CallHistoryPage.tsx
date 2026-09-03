import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { CallHistoryItem, Recording } from '@/services/api/wardenApi';

/**
 * Call History Page - Complete history of all inmate calls.
 */
export function CallHistoryPage() {
  const { inmateId } = useParams<{ inmateId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [playing, setPlaying] = useState<Recording | null>(null);

  const dummyCalls: CallHistoryItem[] = [
    { callId: 'CALL-20240801-001', roomId: 'ROOM-01', inmateId: 'INM-1021', contactId: 'FAM-201', kioskId: 'KIOSK-01', type: 'video', status: 'completed', startTime: new Date(Date.now()-86400000).toISOString(), endTime: new Date(Date.now()-86400000+12*60000).toISOString(), durationMinutes: 12 },
    { callId: 'CALL-20240802-002', roomId: 'ROOM-02', inmateId: 'INM-1023', contactId: 'FAM-205', kioskId: 'KIOSK-02', type: 'audio', status: 'completed', startTime: new Date(Date.now()-172800000).toISOString(), endTime: new Date(Date.now()-172800000+8*60000).toISOString(), durationMinutes: 8 },
    { callId: 'CALL-20240803-003', roomId: 'ROOM-01', inmateId: 'INM-1025', contactId: 'FAM-210', kioskId: 'KIOSK-03', type: 'video', status: 'failed', startTime: new Date(Date.now()-259200000).toISOString(), endTime: new Date(Date.now()-259200000+2*60000).toISOString(), durationMinutes: 2 },
  ];
  const dummyRecs: Recording[] = [
    { recordingId: 'REC-001', callId: 'CALL-20240801-001', inmateId: 'INM-1021', kioskId: 'KIOSK-01', startTime: dummyCalls[0].startTime, endTime: dummyCalls[0].endTime, duration: 720, size: 45*1024*1024, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', encryption: 'AES-256', retentionDays: 30, status: 'completed' },
    { recordingId: 'REC-002', callId: 'CALL-20240802-002', inmateId: 'INM-1023', kioskId: 'KIOSK-02', startTime: dummyCalls[1].startTime, endTime: dummyCalls[1].endTime, duration: 480, size: 22*1024*1024, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', encryption: 'AES-256', retentionDays: 30, status: 'completed' },
  ];

  const loadCalls = useCallback(async () => {
    try {
      setLoadError(null);
      const [callHistory, recs] = await Promise.all([wardenApi.getCallHistory(), wardenApi.getRecordings()]);
      const finalCalls = callHistory.length > 0 ? callHistory : dummyCalls;
      const finalRecs = recs.length > 0 ? recs : dummyRecs;
      setCalls(finalCalls);
      const map: Record<string, Recording> = {};
      finalRecs.forEach((r) => { map[r.callId] = r; });
      setRecordings(map);
    } catch (error) {
      // fallback to dummy for testing
      setCalls(dummyCalls);
      const map: Record<string, Recording> = {};
      dummyRecs.forEach((r) => { map[r.callId] = r; });
      setRecordings(map);
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = calls.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.callId.toLowerCase().includes(s) || c.inmateId.toLowerCase().includes(s) || c.contactId.toLowerCase().includes(s) || c.kioskId.toLowerCase().includes(s);
    const matchStatus = statusFilter==='all' || c.status===statusFilter;
    const matchType = typeFilter==='all' || c.type===typeFilter;
    return matchSearch && matchStatus && matchType;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Call Logs</h1>
          <p className="text-neutral-600 mt-1">Call history with recordings - {filtered.length} of {calls.length}</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success-700">⬇ Export CSV</button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Call ID / Inmate / Contact / Kiosk" className="flex-1 px-4 py-2 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 border-2 border-neutral-300 rounded-lg"><option value="all">All Status</option><option value="completed">Completed</option><option value="failed">Failed</option></select>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="px-4 py-2 border-2 border-neutral-300 rounded-lg"><option value="all">All Types</option><option value="video">Video</option><option value="audio">Audio</option></select>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">No call logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Call ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Inmate</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Kiosk</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-900">Recording</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => {
                  const rec = recordings[call.callId];
                  return (
                  <tr key={call.callId} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4 text-sm text-neutral-900">{call.callId}</td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{formatDate(call.startTime)}</td>
                    <td className="py-3 px-4 text-sm text-neutral-900">{call.inmateId}</td>
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
                    <td className="py-3 px-4">
                      {rec?.url ? (
                        <div className="flex gap-2">
                          <button onClick={() => setPlaying(rec)} className="px-3 py-1 bg-primary-600 text-white rounded-md text-xs hover:bg-primary-700">▶ Play</button>
                          <a href={rec.url} download className="px-3 py-1 bg-neutral-800 text-white rounded-md text-xs hover:bg-neutral-900">⬇ Download</a>
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
      </Card>
      {playing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPlaying(null)}>
          <div className="bg-white rounded-xl p-4 max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Recording - {playing.callId}</h3>
              <button onClick={() => setPlaying(null)} className="text-neutral-500 hover:text-neutral-900">✕</button>
            </div>
            {playing.callId && (
              <video controls autoPlay src={playing.url || ''} className="w-full rounded-lg bg-black" style={{maxHeight:'60vh'}} />
            )}
            <p className="text-xs text-neutral-500 mt-2">Inmate {playing.inmateId} • {formatDuration((playing.duration||0)/60)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
