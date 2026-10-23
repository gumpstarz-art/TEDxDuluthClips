/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Film,
  Download,
  Share2,
  Copy,
  Check,
  Trash2,
  FileText,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Edit3,
  Sliders,
} from 'lucide-react';
import { SavedClip } from '../types';
import { MarketingDocModal } from './MarketingDocModal';
import { EditClipModal } from './EditClipModal';

interface SavedLibraryProps {
  savedClips: SavedClip[];
  onDeleteClip: (id: string) => void;
  onUpdateStatus?: (id: string, status: any) => void;
  onSelectForPublish: (clip: SavedClip) => void;
  onEditClipInStudio: (clip: SavedClip) => void;
  onUpdateClip: (clip: SavedClip) => void;
}

export const SavedLibrary: React.FC<SavedLibraryProps> = ({
  savedClips,
  onDeleteClip,
  onSelectForPublish,
  onEditClipInStudio,
  onUpdateClip,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMarketingDocOpen, setIsMarketingDocOpen] = useState(false);
  const [editingModalClip, setEditingModalClip] = useState<SavedClip | null>(null);

  const handleCopyCaption = (clip: SavedClip) => {
    navigator.clipboard.writeText(clip.socialCaption);
    setCopiedId(clip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadVideo = (clip: SavedClip) => {
    if (!clip.videoBlobUrl) return;
    const a = document.createElement('a');
    a.href = clip.videoBlobUrl;
    const cleanHook = clip.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    a.download = `TEDxDuluth_${cleanHook}_${clip.duration}s.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb0028]/10 border border-[#eb0028]/25 text-xs font-semibold text-[#eb0028] mb-2">
            <Film className="w-3.5 h-3.5" />
            Step 4: Saved Clip Library
          </div>
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-8 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            TEDxDuluth Socials Library
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Rendered 9:16 vertical clips ready for export, multi-platform copy, and scheduled publishing.
          </p>
        </div>

        {/* Right Header: Marketing Doc & Clip Counter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsMarketingDocOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#1a1d29] hover:bg-[#222636] border border-neutral-700 hover:border-[#eb0028]/60 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-[#eb0028]" />
            <span>Social Media Marketing Doc</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#13151f] rounded-xl border border-neutral-800 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-[#eb0028]" />
            <span className="font-bold text-white">{savedClips.length}</span>
            <span>{savedClips.length === 1 ? 'Clip' : 'Clips'}</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {savedClips.length === 0 && (
        <div className="text-center py-16 px-4 bg-[#13151f] border border-neutral-800 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-[#eb0028]/10 text-[#eb0028] flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            No rendered clips in library yet
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
            Go to the Ingest & Highlights tabs to pick high-retention moments from any talk, adjust timestamps, and render 9:16 vertical video files.
          </p>
        </div>
      )}

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedClips.map((clip) => (
          <div
            key={clip.id}
            className="bg-[#13151f] border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden transition-all flex flex-col justify-between group shadow-lg shadow-black/40"
          >
            {/* Top Video Preview / Card Header */}
            <div>
              <div className="relative aspect-[9/16] max-h-[380px] bg-black overflow-hidden flex items-center justify-center">
                {clip.videoBlobUrl ? (
                  <video
                    src={clip.videoBlobUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Film className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                    <span className="text-xs text-neutral-400">Video Render Saved</span>
                  </div>
                )}

                {/* Status Badge: Clean "Ready to Export" with duration & Quick Edit button */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Ready
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] text-neutral-300 font-mono">
                      {clip.duration}s
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingModalClip(clip)}
                    className="pointer-events-auto px-2.5 py-1 rounded-full bg-black/75 hover:bg-[#eb0028] text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/20 hover:border-[#eb0028] transition-all cursor-pointer shadow-lg"
                    title="Quick Edit Title & Social Captions"
                  >
                    <Edit3 className="w-3 h-3 text-cyan-300" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Clip Details */}
              <div className="p-4 space-y-2">
                <div className="text-[11px] text-[#eb0028] font-bold uppercase tracking-wider">
                  {clip.speaker}
                </div>
                <h4 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                  "{clip.title}"
                </h4>
                <p className="text-[11px] text-neutral-400 line-clamp-1">
                  {clip.talkTitle}
                </p>

                {/* Subtitle style badge */}
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 pt-1">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    9:16 Vertical
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    {clip.subtitlePreset === 'ted-red' ? 'TED Red' : 'TED Classic'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    {clip.layout === 'center-crop' ? 'Center Crop' : 'Blurred Fit'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 pt-0 space-y-2.5">
              {/* Primary Action Row: Download 9:16 + Edit Options */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadVideo(clip)}
                  className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-[#eb0028] hover:bg-[#d40024] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-[#eb0028]/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download 9:16
                </button>

                <button
                  type="button"
                  onClick={() => setEditingModalClip(clip)}
                  className="py-2 px-3 rounded-xl bg-[#1b2030] hover:bg-[#252b40] border border-neutral-700/80 hover:border-neutral-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Edit Hook Title, Platform, & Social Captions"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditClipInStudio(clip)}
                  className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Re-Edit in Clip Studio (Trimming, Timestamps, & Subtitles)"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyCaption(clip)}
                  className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Copy Social Caption"
                >
                  {copiedId === clip.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectForPublish(clip)}
                  className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Multi-Platform Social Copy & Drive"
                >
                  <Share2 className="w-3.5 h-3.5 text-pink-400" />
                </button>
              </div>

              {/* Dedicated "Social Media Marketing Doc" Link Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsMarketingDocOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1a1d29] hover:bg-[#222636] border border-neutral-700 hover:border-[#eb0028]/60 text-neutral-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="View Social Media Marketing Doc & Timeline"
                >
                  <FileText className="w-3.5 h-3.5 text-[#eb0028]" />
                  <span>Social Media Marketing Doc</span>
                </button>

                <button
                  onClick={() => onDeleteClip(clip.id)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-800/50 transition cursor-pointer"
                  title="Delete clip from library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Edit Finished Clip Modal */}
      <EditClipModal
        clip={editingModalClip}
        isOpen={!!editingModalClip}
        onClose={() => setEditingModalClip(null)}
        onSave={(updated) => {
          onUpdateClip(updated);
          setEditingModalClip(null);
        }}
        onOpenInStudio={(clipToEdit) => {
          setEditingModalClip(null);
          onEditClipInStudio(clipToEdit);
        }}
      />

      {/* Social Media Marketing Doc Modal */}
      <MarketingDocModal
        isOpen={isMarketingDocOpen}
        onClose={() => setIsMarketingDocOpen(false)}
      />
    </div>
  );
};
