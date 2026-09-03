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

  const loadCalls = useCallback(async () => {
    try {
      setLoadError(null);
      const [callHistory, recs] = await Promise.all([wardenApi.getCallHistory(), wardenApi.getRecordings()]);
      setCalls(callHistory);
      const map: Record<string, Recording> = {};
      recs.forEach((r) => { map[r.callId] = r; });
      setRecordings(map);
    } catch (error) {
      console.error('Failed to load call history:', error);
      setLoadError('Failed to load call history');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Call History</h1>
        <p className="text-neutral-600 mt-1">Complete history of all inmate calls</p>
      </div>

      <Card>
        {calls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">No call history available</p>
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
                {calls.map((call) => {
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
