import React from 'react';
import {
  UploadCloud,
  Sparkles,
  Scissors,
  Film,
  LogOut,
  Radio,
  Share2,
  FileText,
} from 'lucide-react';
import { TeamMember, TalkProject } from '../types';

interface NavbarProps {
  activeTab: 'ingest' | 'highlights' | 'studio' | 'library';
  setActiveTab: (tab: 'ingest' | 'highlights' | 'studio' | 'library') => void;
  teamMember: TeamMember | null;
  onLogout: () => void;
  activeProject: TalkProject | null;
  savedClipsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  teamMember,
  onLogout,
  activeProject,
  savedClipsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0e1017]/95 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand & Live Tag */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setActiveTab('ingest')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-7 sm:h-8 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
            <span className="hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-[#eb0028]/15 border border-[#eb0028]/30 text-[#eb0028] uppercase tracking-wider ml-1">
              Socials Suite
            </span>
          </div>

          {activeProject && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-neutral-800 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-neutral-300 truncate max-w-[220px]">
                {activeProject.title}
              </span>
            </div>
          )}
        </div>

        {/* Central Workflow Navigation */}
        <nav className="flex items-center gap-1 bg-[#151821] p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('ingest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ingest'
                ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1.</span> Source
          </button>

          <button
            onClick={() => setActiveTab('highlights')}
            disabled={!activeProject}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'highlights'
                ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/20'
                : !activeProject
                ? 'text-neutral-600 cursor-not-allowed opacity-50'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2.</span> Highlights
            {activeProject?.highlights && activeProject.highlights.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {activeProject.highlights.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            disabled={!activeProject}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/20'
                : !activeProject
                ? 'text-neutral-600 cursor-not-allowed opacity-50'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3.</span> Studio
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4.</span> Library
            {savedClipsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#eb0028] text-white text-[10px] font-bold">
                {savedClipsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Marketing Doc Link & User Status */}
        <div className="flex items-center gap-2.5">
          <a
            href="/assets/aistudio/ACTIVE_Social_Media_Marketing_-_TEDxDuluth_d628af5c"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151821] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition"
            title="Open Social Media Marketing Doc"
          >
            <FileText className="w-3.5 h-3.5 text-[#eb0028]" />
            <span className="font-semibold">Marketing Doc</span>
          </a>

          {teamMember && (
            <div className="hidden sm:flex items-center gap-2 bg-[#151821] py-1 px-2.5 rounded-lg border border-neutral-800 text-xs">
              <img
                src={teamMember.avatar && teamMember.avatar.startsWith('http') ? teamMember.avatar : "/assets/aistudio/PFP_USE_ONLY_TEDxDuluth_Small_Logo_Black_2139462a.png"}
                alt={teamMember.name || "TEDxDuluth"}
                className="w-7 h-7 rounded-full bg-white object-cover p-0.5 shadow-sm"
              />
              <div className="leading-tight text-left">
                <span className="text-neutral-200 font-bold block">{teamMember.name || 'TEDxDuluth Official'}</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {teamMember.email || 'info@tedxduluth.com'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            title="Sign out of TEDxDuluth"
            className="p-2 rounded-lg bg-[#151821] hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition border border-neutral-800 text-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
