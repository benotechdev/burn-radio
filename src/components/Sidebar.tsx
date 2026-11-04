import React from 'react';
import {
  LayoutDashboard,
  Mic,
  Music,
  ListMusic,
  Radio,
  Calendar,
  Wifi,
  Settings,
  X
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'recording'
  | 'music'
  | 'playlists'
  | 'dj'
  | 'schedule'
  | 'broadcast'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  setCurrentSection: (section: NavSection) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isOnAir: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  setCurrentSection,
  isOpenMobile,
  setIsOpenMobile,
  isOnAir,
}) => {
  const navItems: { id: NavSection; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recording', label: 'Mic & Record', icon: Mic },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'dj', label: 'DJ & Auto DJ', icon: Radio },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'broadcast', label: 'Broadcast', icon: Wifi },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#181818] border-r border-[#303030] z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div>
          <div className="h-16 px-6 border-b border-[#303030] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {/* Custom Orange Radio-Wave Logo Symbol */}
              <div className="w-8 h-8 rounded bg-[#FF7900] flex items-center justify-center text-white shrink-0 shadow-sm">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                  <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
                </svg>
              </div>

              <div>
                <span className="text-base font-bold tracking-wider text-white">
                  RADIO<span className="text-[#FF7900]">FLOW</span>
                </span>
                <span className="text-[10px] text-[#A5A5A5] block font-medium -mt-1">
                  Radio Automation
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden text-[#A5A5A5] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FF7900] text-white shadow-sm'
                      : 'text-[#A5A5A5] hover:text-white hover:bg-[#202020]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Station Status in Sidebar */}
        <div className="p-4 border-t border-[#303030] bg-[#141414]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A5A5A5]">Broadcast Status</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isOnAir
                  ? 'bg-[#FF7900] text-white'
                  : 'bg-[#202020] text-[#A5A5A5] border border-[#303030]'
              }`}
            >
              {isOnAir ? 'ON AIR' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-[11px] text-[#A5A5A5] mt-1.5 truncate">
            Station: <span className="text-white">RADIOFLOW 104.5 HD</span>
          </div>
        </div>
      </aside>
    </>
  );
};
