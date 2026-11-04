import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  Filter,
  ShieldCheck,
  Disc
} from 'lucide-react';
import { BroadcastLogItem } from '../types/radio';

interface LogsAndRoyaltyProps {
  logs: BroadcastLogItem[];
}

export const LogsAndRoyalty: React.FC<LogsAndRoyaltyProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.album.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const exportCSV = () => {
    const headers = ['Timestamp (UTC)', 'Artist', 'Title', 'Album', 'Duration (Sec)', 'Source Channel'];
    const rows = filteredLogs.map((log) => [
      `"${log.playedAt}"`,
      `"${log.artist.replace(/"/g, '""')}"`,
      `"${log.title.replace(/"/g, '""')}"`,
      `"${log.album.replace(/"/g, '""')}"`,
      log.duration,
      `"${log.source}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radioflow_broadcast_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Banner */}
      <div className="bg-[#0f141f] border border-cyan-500/30 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Station Broadcast Logs & Royalty Compliance
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
                  ASCAP / BMI / SOUNDEXCHANGE COMPLIANT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every track, commercial and jingle played on air is logged with millisecond timestamps for music licensing audits and sponsor verification.
              </p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-black font-bold text-xs rounded-lg shadow-md flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logged tracks or artists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090d14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Source:</span>
          {['all', 'autodj', 'deckA', 'deckB', 'cart'].map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-2.5 py-1 rounded capitalize font-medium ${
                sourceFilter === src
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {src === 'all' ? 'All' : src}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090d14] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Played At (UTC)</th>
                <th className="py-2.5 px-3">Title & Artist</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Album</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3 text-right">Channel Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No play history logged yet for this query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#141b29] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.playedAt).toLocaleTimeString()} ({new Date(log.playedAt).toLocaleDateString()})
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-100">{log.title}</div>
                      <div className="text-[11px] text-slate-400">{log.artist}</div>
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-slate-400">
                      {log.album || 'Single'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                      {formatDuration(log.duration)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          log.source === 'deckA'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                            : log.source === 'deckB'
                            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50'
                            : log.source === 'cart'
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-700/50'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {log.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
