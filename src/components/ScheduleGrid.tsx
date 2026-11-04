import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Radio,
  CheckCircle2,
  User,
  Zap,
  Sliders
} from 'lucide-react';
import { ScheduleEvent } from '../types/radio';

interface ScheduleGridProps {
  currentShow: string;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ currentShow }) => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const [events, setEvents] = useState<ScheduleEvent[]>([
    {
      id: 'sch-1',
      day: 'Monday',
      start: '06:00',
      end: '10:00',
      name: 'The Morning Voltage Live',
      host: 'DJ Marcus & Maya',
      mode: 'manual',
      category: 'Power Currents & Talk',
      color: 'border-l-4 border-amber-500 bg-amber-950/20',
      description: 'High energy morning drive show with live mic commentary, news updates and power hits.',
    },
    {
      id: 'sch-2',
      day: 'Monday',
      start: '10:00',
      end: '14:00',
      name: 'Non-Stop Workday Flow',
      host: 'Automated RadioFlow',
      mode: 'autodj',
      category: 'Gold & Recurrents',
      color: 'border-l-4 border-cyan-500 bg-cyan-950/20',
      description: 'Zero chatter, continuous seamless music rotation for work and focus.',
    },
    {
      id: 'sch-3',
      day: 'Monday',
      start: '14:00',
      end: '18:00',
      name: 'Afternoon Drive Express',
      host: 'Elena Cruz',
      mode: 'assisted',
      category: 'Top 40 & Currents',
      color: 'border-l-4 border-emerald-500 bg-emerald-950/20',
      description: 'Upbeat electronic and pop hits with automated segues and traffic updates.',
    },
    {
      id: 'sch-4',
      day: 'Monday',
      start: '18:00',
      end: '22:00',
      name: 'Club Velocity Sessions',
      host: 'Guest DJ Residency',
      mode: 'manual',
      category: 'Club & Dance',
      color: 'border-l-4 border-rose-500 bg-rose-950/20',
      description: 'Live DJ mixer takeover via Harbor port 8005 with club mixes and live voiceover.',
    },
    {
      id: 'sch-5',
      day: 'Monday',
      start: '22:00',
      end: '06:00',
      name: 'Midnight Chill Lounge',
      host: 'Automated RadioFlow',
      mode: 'autodj',
      category: 'Ambient & Deep Gold',
      color: 'border-l-4 border-indigo-500 bg-indigo-950/20',
      description: 'Overnight relaxed synthwave, lofi beats and classic ambient radio.',
    },
  ]);

  const [newEvent, setNewEvent] = useState<Partial<ScheduleEvent>>({
    day: 'Monday',
    start: '12:00',
    end: '14:00',
    name: 'New Station Programme',
    host: 'Station Host',
    mode: 'autodj',
    category: 'Power Current',
    description: 'Scheduled broadcast block.',
  });

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.start || !newEvent.end) return;

    const event: ScheduleEvent = {
      id: `sch-${Date.now()}`,
      day: newEvent.day || selectedDay,
      start: newEvent.start,
      end: newEvent.end,
      name: newEvent.name,
      host: newEvent.host || 'Station Host',
      mode: (newEvent.mode as any) || 'autodj',
      category: newEvent.category || 'Power Current',
      color:
        newEvent.mode === 'manual'
          ? 'border-l-4 border-rose-500 bg-rose-950/20'
          : newEvent.mode === 'assisted'
          ? 'border-l-4 border-emerald-500 bg-emerald-950/20'
          : 'border-l-4 border-cyan-500 bg-cyan-950/20',
      description: newEvent.description || '',
    };

    setEvents((prev) => [...prev, event]);
    setIsAddModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const dayEvents = events.filter((e) => e.day === selectedDay);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Schedule Banner */}
      <div className="bg-[#0f141f] border border-cyan-500/30 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  24/7 Broadcast Grid & Show Scheduler
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-700/50">
                  AUTO-TIMED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure weekly automated programming. Liquidsoap & AutoDJ automatically switch rotation formats and allow remote live DJ harbor takeovers.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-black font-bold text-xs rounded-lg shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Show</span>
          </button>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
              selectedDay === day
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-[#0f141f] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Shows Timeline for the Selected Day */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              {selectedDay} Programme Lineup
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {dayEvents.length} Scheduled Shows
          </span>
        </div>

        <div className="space-y-2.5">
          {dayEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No specific programmes scheduled for {selectedDay}. Default AutoDJ 24/7 rotation will broadcast.
            </div>
          ) : (
            dayEvents.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${evt.color}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                      {evt.start} – {evt.end}
                    </span>
                    <h5 className="font-bold text-sm text-slate-100">{evt.name}</h5>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        evt.mode === 'manual'
                          ? 'bg-rose-900/60 text-rose-300'
                          : evt.mode === 'assisted'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-cyan-900/60 text-cyan-300'
                      }`}
                    >
                      {evt.mode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center space-x-2">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{evt.host}</span>
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">{evt.category}</span>
                  </p>

                  {evt.description && (
                    <p className="text-[11px] text-slate-500">{evt.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove from schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Show Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f141f] border border-amber-500/50 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm">Add Broadcast Programme</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Show Name</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Host / Presenter</label>
                <input
                  type="text"
                  value={newEvent.host}
                  onChange={(e) => setNewEvent({ ...newEvent, host: e.target.value })}
                  className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                    className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                    className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Broadcast Mode</label>
                  <select
                    value={newEvent.mode}
                    onChange={(e) => setNewEvent({ ...newEvent, mode: e.target.value as any })}
                    className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="autodj">AutoDJ (Automated)</option>
                    <option value="manual">Manual Live DJ</option>
                    <option value="assisted">Assisted Playout</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Day of Week</label>
                  <select
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({ ...newEvent, day: e.target.value })}
                    className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 shadow"
              >
                Add Show
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
