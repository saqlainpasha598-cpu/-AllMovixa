import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Settings,
  PlaySquare,
  Download,
  User as UserIcon,
  LogIn,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Lock,
  Share2,
  Copy,
  Plus,
  FolderPlus,
  Upload,
  Languages,
} from 'lucide-react';
import { Series, User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  logoUrl?: string;
  logoText?: string;
  seriesList: Series[];
  activeSeriesId: string;
  activeNavTab: 'player' | 'library' | 'downloads' | 'requests';
  isAdmin?: boolean;
  onLockAdmin?: () => void;
  onSelectNavTab: (tab: 'player' | 'library' | 'downloads' | 'requests') => void;
  onSelectSeries: (id: string) => void;
  onOpenAdmin: () => void;
  onOpenAddEpisode?: () => void;
  onOpenCreatePlaylist?: () => void;
  onOpenShareModal?: () => void;
  downloadsCount?: number;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  logoUrl,
  logoText = 'STREAM',
  seriesList,
  activeSeriesId,
  activeNavTab,
  isAdmin = false,
  onLockAdmin,
  onSelectNavTab,
  onSelectSeries,
  onOpenAdmin,
  onOpenAddEpisode,
  onOpenCreatePlaylist,
  onOpenShareModal,
  downloadsCount = 0,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-[#0d0f17]/95 border-b border-[#1f2333] sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo Section & Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div
            onClick={() => onSelectNavTab('player')}
            className="cursor-pointer flex items-center gap-2 sm:gap-2.5 shrink-0"
          >
            {logoUrl ? (
              <div className="flex items-center h-12 max-w-[130px] sm:max-w-[180px]">
                <img
                  src={logoUrl}
                  alt="Website Logo"
                  referrerPolicy="no-referrer"
                  className="h-8 sm:h-11 w-auto max-w-full object-contain filter drop-shadow"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-text')) {
                      const span = document.createElement('span');
                      span.className = 'fallback-text text-base sm:text-xl font-black tracking-wider text-white';
                      span.innerText = logoText || 'STREAM';
                      parent.appendChild(span);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-950/40 shrink-0">
                  <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-base sm:text-xl font-black tracking-wider text-white uppercase truncate">
                  {logoText || 'STREAM'}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Mode: Player vs Downloads */}
          <nav className="flex items-center p-1 bg-[#141826] rounded-xl border border-[#232b40] shrink-0 ml-1 sm:ml-2">
            <button
              type="button"
              onClick={() => onSelectNavTab('player')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeNavTab === 'player'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PlaySquare className="w-3.5 h-3.5" />
              <span>Player</span>
            </button>

            {/* Dedicated Downloads Tab */}
            <button
              type="button"
              id="header-nav-downloads-tab"
              onClick={() => onSelectNavTab('downloads')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeNavTab === 'downloads'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Downloads</span>
              {downloadsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  {downloadsCount}
                </span>
              )}
            </button>

            {/* Requests Tab */}
            <button
              type="button"
              onClick={() => onSelectNavTab('requests')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeNavTab === 'requests'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span>Requests</span>
            </button>
          </nav>
        </div>

        {/* Top Actions: Share / Copy URL, Admin Setup & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Admin Setup button */}
          <button
            type="button"
            id="admin-open-btn"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs font-semibold tracking-wide transition-all group ${
              isAdmin
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#151824] hover:bg-[#1f2438] active:bg-[#272e47] text-gray-300 hover:text-white border-[#272d42]'
            }`}
            title={
              isAdmin
                ? 'Admin Mode Active (Series, seasons, episodes, uploads, security & password)'
                : 'Open Admin setup (Password protected)'
            }
          >
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Settings className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400 group-hover:rotate-45 transition-transform duration-300" />
            )}
            <span className="hidden lg:inline">{isAdmin ? 'Admin Panel' : 'Admin'}</span>
          </button>

          {/* User Account / Login Button (Only shows logged-in user's own profile) */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                id="user-profile-menu-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-[#171d2e] hover:bg-[#222b42] border border-[#2a3652] rounded-lg text-xs font-semibold text-white transition-all shadow"
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-red-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-600/40 text-red-300 flex items-center justify-center text-[10px] font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[90px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#121625] border border-[#26314d] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-white">
                  <div className="p-2 border-b border-[#212b45] space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      {isAdmin && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/30">
                          Admin Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono truncate">{currentUser.email}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Download Authorized</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectNavTab('downloads');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Website Downloads ({downloadsCount})</span>
                    </button>
                    {isAdmin && onLockAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLockAdmin();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lock Admin Session</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenAuth();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Switch Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="login-header-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-950/40"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};



