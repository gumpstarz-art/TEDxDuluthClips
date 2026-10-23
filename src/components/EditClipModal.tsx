/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  Instagram,
  Linkedin,
  Facebook,
  Share2,
  FileText,
  Save,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { SavedClip, SocialCopySet } from '../types';
import { enforceMaxFiveHashtags } from '../utils/socialCopy';

interface EditClipModalProps {
  clip: SavedClip | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClip: SavedClip) => void;
  onOpenInStudio: (clip: SavedClip) => void;
}

export const EditClipModal: React.FC<EditClipModalProps> = ({
  clip,
  isOpen,
  onClose,
  onSave,
  onOpenInStudio,
}) => {
  if (!isOpen || !clip) return null;

  const [title, setTitle] = useState(clip.title);
  const [platform, setPlatform] = useState<SavedClip['platform']>(clip.platform || 'All');
  const [activePlatformTab, setActivePlatformTab] = useState<'instagram' | 'linkedin' | 'facebook'>('instagram');
  const [socialCopies, setSocialCopies] = useState<SocialCopySet>({
    instagram: clip.socialCopies?.instagram || clip.socialCaption || '',
    linkedin: clip.socialCopies?.linkedin || clip.socialCaption || '',
    facebook: clip.socialCopies?.facebook || clip.socialCaption || '',
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (clip) {
      setTitle(clip.title);
      setPlatform(clip.platform || 'All');
      setSocialCopies({
        instagram: clip.socialCopies?.instagram || clip.socialCaption || '',
        linkedin: clip.socialCopies?.linkedin || clip.socialCaption || '',
        facebook: clip.socialCopies?.facebook || clip.socialCaption || '',
      });
      setIsSaved(false);
    }
  }, [clip]);

  const handleCopyChange = (plat: keyof SocialCopySet, text: string) => {
    setSocialCopies((prev) => ({
      ...prev,
      [plat]: text,
    }));
    setIsSaved(false);
  };

  const handleEnforceHashtags = (plat: keyof SocialCopySet) => {
    const cleaned = enforceMaxFiveHashtags(socialCopies[plat]);
    handleCopyChange(plat, cleaned);
  };

  const handleSave = () => {
    const activeCaption = socialCopies[activePlatformTab] || socialCopies.instagram;
    const updatedClip: SavedClip = {
      ...clip,
      title: title.trim() || clip.title,
      platform,
      socialCaption: activeCaption,
      socialCopies,
    };
    onSave(updatedClip);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  // Count hashtags in current text
  const currentText = socialCopies[activePlatformTab];
  const hashtagCount = (currentText.match(/#[a-zA-Z0-9_]+/g) || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12141c] border border-neutral-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#151824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eb0028]/15 text-[#eb0028] flex items-center justify-center border border-[#eb0028]/25">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Edit Finished Clip</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {clip.speaker} • {clip.talkTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Re-Edit in Clip Studio Promo Banner */}
          <div className="p-3.5 rounded-xl bg-[#171b28] border border-[#eb0028]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#eb0028]" />
                <span>Need to adjust trim points or subtitle timing?</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Open in Clip Studio to zoom into the video track, modify line-by-line sync, change layouts, and re-export.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInStudio(clip);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#eb0028] hover:bg-[#d40024] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-md shadow-[#eb0028]/20"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Open in Clip Studio</span>
            </button>
          </div>

          {/* Hook Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
              <span>Hook Headline / Clip Title</span>
              <span className="text-[10px] text-neutral-400 font-normal">
                Appears in library, files, and top headline
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsSaved(false);
              }}
              placeholder="Enter compelling hook title..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d14] border border-neutral-700 focus:border-[#eb0028] text-sm text-white placeholder-neutral-500 focus:outline-none transition font-medium"
            />
          </div>

          {/* Target Platform Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-[#eb0028]" />
              <span>Primary Publishing Target</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Instagram Reels', 'TikTok', 'YouTube Shorts', 'All'] as const).map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => {
                    setPlatform(plat);
                    setIsSaved(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    platform === plat
                      ? 'bg-[#eb0028]/20 text-[#eb0028] border-[#eb0028] shadow-sm'
                      : 'bg-[#151824] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Platform Social Captions Editor */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#eb0028]" />
                <span>Multi-Platform Social Copy</span>
              </label>

              {/* Hashtag Warning */}
              {hashtagCount > 5 && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{hashtagCount} hashtags (Rule: Max 5)</span>
                  <button
                    type="button"
                    onClick={() => handleEnforceHashtags(activePlatformTab)}
                    className="underline hover:text-white font-semibold cursor-pointer ml-1"
                  >
                    Trim to 5
                  </button>
                </div>
              )}
            </div>

            {/* Platform Sub-tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#151824] rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActivePlatformTab('instagram')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatformTab === 'instagram'
                    ? 'bg-[#eb0028] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('linkedin')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatformTab === 'linkedin'
                    ? 'bg-[#0077b5] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('facebook')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activePlatformTab === 'facebook'
                    ? 'bg-[#1877f2] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Facebook className="w-3.5 h-3.5" />
                <span>Facebook</span>
              </button>
            </div>

            {/* Active Platform Caption Textarea */}
            <div className="relative">
              <textarea
                rows={5}
                value={socialCopies[activePlatformTab]}
                onChange={(e) => handleCopyChange(activePlatformTab, e.target.value)}
                placeholder={`Enter optimized ${activePlatformTab} caption with hook, emojis, and hashtags...`}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0b0d14] border border-neutral-700 focus:border-[#eb0028] text-xs text-white placeholder-neutral-500 focus:outline-none transition leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 pt-1">
                <span>
                  Hashtags: <strong className={hashtagCount > 5 ? 'text-amber-400' : 'text-neutral-300'}>{hashtagCount}/5</strong>
                </span>
                <span className="font-mono">
                  {socialCopies[activePlatformTab].length} chars
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-[#151824] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#eb0028] hover:bg-[#d40024] text-white shadow-lg shadow-[#eb0028]/25'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Changes Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Finished Clip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
