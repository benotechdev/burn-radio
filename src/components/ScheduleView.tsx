import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Check } from 'lucide-react';
import { ScheduleEvent, Playlist } from '../types/radio';

interface ScheduleViewProps {
  playlists: Playlist[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ playlists }) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [programmes, setProgrammes] = useState<ScheduleEvent[]>([
    {
      id: 'sch-1',
      day: 'Monday',
      start: '06:00',
      end: '10:00',
      name: 'Morning Drive Time',
      host: 'DJ Marcus',
      mode: 'manual',
      category: 'Power Currents',
      color: '',
      description: 'Main morning rotation',
    },
    {
      id: 'sch-2',
      day: 'Monday',
      start: '10:00',
      end: '14:00',
      name: 'Workday Continuous Flow',
      host: 'Automated RadioFlow',
      mode: 'autodj',
      category: 'Workday Hits',
      color: '',
      description: 'Auto DJ continuous non-stop music',
    },
    {
      id: 'sch-3',
      day: 'Monday',
      start: '14:00',
      end: '18:00',
      name: 'Afternoon Express',
      host: 'Elena Cruz',
      mode: 'manual',
      category: 'Currents & Recurrents',
      color: '',
      description: 'Afternoon drive show',
    },
    {
      id: 'sch-4',
      day: 'Monday',
      start: '18:00',
      end: '22:00',
      name: 'Night Energy Mix',
      host: 'Guest DJ',
      mode: 'manual',
      category: 'Dance & Electronic',
      color: '',
      description: 'Evening club sessions',
    },
    {
      id: 'sch-5',
      day: 'Monday',
      start: '22:00',
      end: '06:00',
      name: 'Overnight Auto Playout',
      host: 'Automated RadioFlow',
      mode: 'autodj',
      category: 'Chillout & Gold',
      color: '',
      description: 'Late night automated rotation',
    },
  ]);

  const [newProg, setNewProg] = useState({
    name: '',
    start: '12:00',
    end: '14:00',
    playlist: playlists[0]?.name || 'Power Currents',
    repeatDay: 'Monday',
    mode: 'autodj' as 'manual' | 'autodj',
  });

  const handleAddProgramme = () => {
    if (!newProg.name.trim()) return;
    const item: ScheduleEvent = {
      id: `sch-${Date.now()}`,
      day: newProg.repeatDay,
      start: newProg.start,
      end: newProg.end,
      name: newProg.name.trim(),
      host: newProg.mode === 'autodj' ? 'Automated RadioFlow' : 'Live DJ Host',
      mode: newProg.mode,
      category: newProg.playlist,
      color: '',
      description: `Playlist: ${newProg.playlist}`,
    };
    setProgrammes((prev) => [...prev, item]);
    setIsModalOpen(false);
    setNewProg({
      name: '',
      start: '12:00',
      end: '14:00',
      playlist: playlists[0]?.name || 'Power Currents',
      repeatDay: selectedDay,
      mode: 'autodj',
    });
  };

  const handleDeleteProgramme = (id: string) => {
    setProgrammes((prev) => prev.filter((p) => p.id !== id));
  };

  const dayProgrammes = programmes.filter((p) => p.day === selectedDay);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Programme Schedule</h2>
          <p className="text-xs text-[#A5A5A5] mt-0.5">
            Weekly timetable for automated show switching and live DJ shifts.
          </p>
        </div>

        <button
          onClick={() => {
            setNewProg((prev) => ({ ...prev, repeatDay: selectedDay }));
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow-sm flex items-center space-x-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Programme</span>
        </button>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-md font-bold transition-colors whitespace-nowrap ${
              selectedDay === day
                ? 'bg-[#FF7900] text-white'
                : 'bg-[#202020] text-[#A5A5A5] hover:text-white border border-[#303030]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Clear Weekly Timetable */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#303030] flex items-center justify-between">
          <span className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
            {selectedDay} Broadcast Timetable
          </span>
          <span className="text-xs text-[#A5A5A5] font-mono">
            {dayProgrammes.length} Scheduled Blocks
          </span>
        </div>

        <div className="divide-y divide-[#303030]">
          {dayProgrammes.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A5A5A5]">
              No programmes scheduled for {selectedDay}. Auto DJ default rotation will play.
            </div>
          ) : (
            dayProgrammes.map((prog) => (
              <div
                key={prog.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#282828] transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="px-3 py-1.5 rounded bg-[#181818] border border-[#303030] font-mono font-bold text-xs text-[#FF7900] shrink-0">
                    {prog.start} – {prog.end}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{prog.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          prog.mode === 'autodj'
                            ? 'bg-[#181818] text-[#FF7900] border border-[#303030]'
                            : 'bg-[#FF7900] text-white'
                        }`}
                      >
                        {prog.mode === 'autodj' ? 'Auto DJ' : 'Live DJ'}
                      </span>
                    </div>
                    <div className="text-xs text-[#A5A5A5] mt-0.5">
                      {prog.host} • {prog.category}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteProgramme(prog.id)}
                  className="p-1.5 text-[#A5A5A5] hover:text-white transition-colors"
                  title="Delete programme"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Programme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Add Broadcast Programme</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#A5A5A5] block mb-1">Programme Name</label>
                <input
                  type="text"
                  placeholder="e.g. Afternoon Drive"
                  value={newProg.name}
                  onChange={(e) => setNewProg({ ...newProg, name: e.target.value })}
                  className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#FF7900]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#A5A5A5] block mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    value={newProg.start}
                    onChange={(e) => setNewProg({ ...newProg, start: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white font-mono focus:outline-none focus:border-[#FF7900]"
                  />
                </div>
                <div>
                  <label className="text-[#A5A5A5] block mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    value={newProg.end}
                    onChange={(e) => setNewProg({ ...newProg, end: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white font-mono focus:outline-none focus:border-[#FF7900]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#A5A5A5] block mb-1">Repeat Day</label>
                  <select
                    value={newProg.repeatDay}
                    onChange={(e) => setNewProg({ ...newProg, repeatDay: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white focus:outline-none focus:border-[#FF7900]"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#A5A5A5] block mb-1">Operating Mode</label>
                  <select
                    value={newProg.mode}
                    onChange={(e) =>
                      setNewProg({ ...newProg, mode: e.target.value as 'manual' | 'autodj' })
                    }
                    className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white focus:outline-none focus:border-[#FF7900]"
                  >
                    <option value="autodj">Auto DJ</option>
                    <option value="manual">Manual Live DJ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#A5A5A5] block mb-1">Selected Playlist</label>
                <select
                  value={newProg.playlist}
                  onChange={(e) => setNewProg({ ...newProg, playlist: e.target.value })}
                  className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-white focus:outline-none focus:border-[#FF7900]"
                >
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.name}>
                      {pl.name}
                    </option>
                  ))}
                  <option value="General Rotation">General Rotation</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#181818] text-[#A5A5A5] hover:text-white text-xs border border-[#303030]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProgramme}
                className="px-4 py-1.5 rounded bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs"
              >
                Save Programme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
