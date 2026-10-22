/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Archive,
  Sparkles,
} from 'lucide-react';

interface MarketingDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketingDocModal: React.FC<MarketingDocModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'archive' | 'prep' | 'raw'>('timeline');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const docUrl = '/assets/aistudio/ACTIVE_Social_Media_Marketing_-_TEDxDuluth_d628af5c';

  const activeTimeline = [
    { title: 'Talk Spotlight 5', date: 'October 18', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 6', date: 'October 18', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 7', date: 'October 18', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 8', date: 'October 18', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 9', date: 'October 25', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 10', date: 'October 25', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 11', date: 'October 25', assignee: 'Tabithah', status: 'To Do' },
    { title: 'Talk Spotlight 12', date: 'October 25', assignee: 'Tabithah', status: 'To Do' },
    { title: 'Talk Spotlight 13', date: 'November 01', assignee: 'Tabithah', status: 'To Do' },
    { title: 'Talk Spotlight 14', date: 'November 01', assignee: 'Tabithah', status: 'To Do' },
  ];

  const midAugustTimeline = [
    { title: 'Talk Spotlight 2 (FB, IG, LinkedIn)', date: 'August 11', assignee: 'Team', status: 'Completed' },
    { title: 'Talk Spotlight 3', date: 'August 11', assignee: 'Star', status: 'To Do' },
    { title: 'Weekly Insight 6', date: 'August 11', assignee: 'Star', status: 'To Do' },
    { title: 'Talk Spotlight 4', date: 'August 18', assignee: 'Tabithah', status: 'To Do' },
    { title: 'Weekly Insight 7', date: 'August 18', assignee: 'Tabithah', status: 'To Do' },
    { title: 'Community Connection Question', date: 'August 18', assignee: 'Tabithah', status: 'To Do' },
  ];

  const archiveTimeline = [
    { title: 'Thank You + View Count Celebration', date: 'June 01', status: 'Completed' },
    { title: 'Weekly Insight 1', date: 'June 16', status: 'Completed' },
    { title: 'Weekly Insight 2', date: 'June 16', status: 'Completed' },
    { title: 'Talk Spotlight 1 (Mazz Marry)', date: 'June 23', status: 'Completed' },
    { title: 'Weekly Insight 3', date: 'June 23', status: 'Completed' },
    { title: 'Weekly Insight 4', date: 'June 23', status: 'Completed' },
  ];

  const prepSpace = [
    { title: 'TED Trivia w/ Star (moving back TBD)', date: 'June 26', status: 'Not Started' },
    { title: 'Talk Spotlight 7', date: 'June 23', status: 'Not Started' },
    { title: 'Weekly Insight 7', date: 'June 23', status: 'Not Started' },
    { title: 'Talk Spotlight 8', date: 'June 23', status: 'Not Started' },
    { title: 'Team Member Tabithah Interview #1', date: 'June 23', status: 'Not Started' },
    { title: 'Talk Spotlight 9', date: 'June 23', status: 'Not Started' },
    { title: 'Weekly Insight 8', date: 'June 23', status: 'Not Started' },
    { title: 'Talk Spotlight 10', date: 'June 23', status: 'Not Started' },
    { title: 'From Our TEDx to Yours: Event Organization Tips', date: 'June 23', status: 'Not Started' },
    { title: 'Talk Spotlight 11', date: 'June 23', status: 'Not Started' },
    { title: 'Weekly Insight 9', date: 'June 23', status: 'Not Started' },
  ];

  const rawDocumentText = `Plan\nPLATFORM LOGINS AND TUTORIALS\n\nSocial Media Timeline Mid-October to Early November\n• Talk Spotlight 5 - Oct 18 (Star To Do)\n• Talk Spotlight 6 - Oct 18 (Star To Do)\n• Talk Spotlight 7 - Oct 18 (Star To Do)\n• Talk Spotlight 8 - Oct 18 (Star To Do)\n• Talk Spotlight 9 - Oct 25 (Star To Do)\n• Talk Spotlight 10 - Oct 25 (Star To Do)\n• Talk Spotlight 11 - Oct 25 (Tabithah To Do)\n• Talk Spotlight 12 - Oct 25 (Tabithah To Do)\n• Talk Spotlight 13 - Nov 01 (Tabithah To Do)\n• Talk Spotlight 14 - Nov 01 (Tabithah To Do)\n\nArchive & Prior Weeks:\n• Talk Spotlight 2 (FB, IG, LinkedIn) - Aug 11 (Completed)\n• Talk Spotlight 1 (Mazz Marry) - June 23 (Completed)\n• Thank You + View Count Celebration - June 01 (Completed)`;

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawDocumentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#13151f] border border-[#eb0028]/35 rounded-2xl p-6 shadow-2xl text-white shadow-black/80 flex flex-col max-h-[90vh]">
        {/* Glow accent */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#eb0028]/20 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eb0028]/15 border border-[#eb0028]/30 flex items-center justify-center text-[#eb0028]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Social Media Marketing Doc
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#eb0028]/20 border border-[#eb0028]/30 text-[10px] text-[#eb0028] font-bold uppercase tracking-wider">
                  TEDxDuluth
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Active publishing timeline, spotlight assignments & content roadmap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white flex items-center gap-1.5 transition border border-neutral-700"
              title="Open raw document"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#eb0028]" />
              <span className="hidden sm:inline">Open Document</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-3 pb-2 border-b border-neutral-800/80 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'timeline'
                ? 'bg-[#eb0028] text-white shadow-sm shadow-[#eb0028]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Oct – Nov Timeline (Active)
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'archive'
                ? 'bg-[#eb0028] text-white shadow-sm shadow-[#eb0028]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            August & Archive
          </button>
          <button
            onClick={() => setActiveTab('prep')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'prep'
                ? 'bg-[#eb0028] text-white shadow-sm shadow-[#eb0028]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Prep Space
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'raw'
                ? 'bg-[#eb0028] text-white shadow-sm shadow-[#eb0028]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            Raw Document
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: Oct - Nov Active Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#171a25] border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#eb0028] block">
                    Current Focus: Mid-October to Early November
                  </span>
                  <span className="text-neutral-300 text-xs">
                    Talk Spotlights 5 through 14 across Instagram Reels, TikTok & YouTube Shorts
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Assigned Leads</span>
                  <span className="text-white font-semibold">Star & Tabithah</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {activeTimeline.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#181b26] hover:bg-[#1f2332] border border-neutral-800/80 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#eb0028]" />
                      <div>
                        <span className="font-bold text-white text-xs block">{item.title}</span>
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          Due: {item.date} (EOD)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] flex items-center gap-1 font-mono">
                        <User className="w-2.5 h-2.5 text-[#eb0028]" />
                        {item.assignee}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: August & Archive */}
          {activeTab === 'archive' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Mid-August Timeline
                </h4>
                <div className="space-y-1.5">
                  {midAugustTimeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#181b26] border border-neutral-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-neutral-200 block">{item.title}</span>
                        <span className="text-[10px] text-neutral-400">Due: {item.date}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Week 1 - 3 Archive
                </h4>
                <div className="space-y-1.5">
                  {archiveTimeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#151722] border border-neutral-800/60 flex items-center justify-between text-neutral-400"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <span className="text-[10px] font-mono">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Prep Space */}
          {activeTab === 'prep' && (
            <div className="space-y-2">
              <p className="text-[11px] text-neutral-400 mb-3">
                Content ideas, trivia, organizer tips, and upcoming team spotlight concepts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prepSpace.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#181b26] border border-neutral-800 text-xs"
                  >
                    <span className="font-semibold text-white block mb-1">{item.title}</span>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>{item.date}</span>
                      <span className="text-neutral-500">Not Started</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Raw Document */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  File: <code className="text-neutral-200">ACTIVE_Social_Media_Marketing_-_TEDxDuluth</code>
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-[#0c0d12] border border-neutral-800 text-[11px] text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {rawDocumentText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            Assigned to gump0010@d.umn.edu • TEDxDuluth Marketing Team
          </span>

          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-[#eb0028] hover:bg-[#d40024] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#eb0028]/25"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Marketing Doc</span>
          </a>
        </div>
      </div>
    </div>
  );
};
