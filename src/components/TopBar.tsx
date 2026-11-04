import React from 'react';
import { Menu, User, HardDrive, CheckCircle2 } from 'lucide-react';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  stationName: string;
  isCompanionOnline: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileMenu,
  stationName,
  isCompanionOnline,
}) => {
  return (
    <header className="h-16 bg-[#181818] border-b border-[#303030] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-[#A5A5A5] hover:text-white rounded-md bg-[#202020] border border-[#303030]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Station Name & Tagline */}
        <div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {stationName}
          </h1>
          <p className="text-[11px] text-[#A5A5A5] hidden sm:block">
            Professional Broadcast Playout & Music Automation
          </p>
        </div>
      </div>

      {/* Right: Connection Status & Operator Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-[#202020] border border-[#303030] rounded-md text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isCompanionOnline ? 'bg-[#FF7900]' : 'bg-[#FF7900]'
            }`}
          />
          <span className="text-white hidden md:inline">
            {isCompanionOnline ? 'Local Companion Agent Connected' : 'Local Storage Engine Active'}
          </span>
          <span className="text-white md:hidden">Local PC</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#303030]">
          <div className="w-8 h-8 rounded-full bg-[#202020] border border-[#303030] flex items-center justify-center text-white">
            <User className="w-4 h-4 text-[#FF7900]" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">
              Station Operator
            </div>
            <div className="text-[10px] text-[#A5A5A5] leading-tight">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
};
