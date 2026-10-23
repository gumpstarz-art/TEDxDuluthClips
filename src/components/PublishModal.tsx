/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Instagram,
  Linkedin,
  Facebook,
  CheckCircle2,
  HardDrive,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SavedClip, SocialCopySet } from '../types';
import { generatePlatformCopies, enforceMaxFiveHashtags } from '../utils/socialCopy';
import { uploadClipToDrive, getAccessToken } from '../services/googleDrive';

interface PublishModalProps {
  clip: SavedClip | null;
  onClose: () => void;
  onMarkPublished?: (id: string) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  clip,
  onClose,
}) => {
  const [platformTab, setPlatformTab] = useState<'instagram' | 'linkedin' | 'facebook'>('instagram');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);


  // Google Drive Upload State
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<string | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);

  if (!clip) return null;

  // Compute or reuse multi-platform copies (all guaranteed max 5 hashtags)
  const copies: SocialCopySet = clip.socialCopies || generatePlatformCopies({
    talkTitle: clip.talkTitle,
    speaker: clip.speaker,
    hookTitle: clip.title,
    summary: clip.socialCaption,
  });

  const activeCopy = copies[platformTab] || clip.socialCaption;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(activeCopy);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHashtags = () => {
    // Exactly 5 hashtags max
    const hashtags = '#TEDxDuluth #IdeasWorthSpreading #Innovation #Leadership #Resilience';
    navigator.clipboard.writeText(hashtags);
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const handleUploadToDrive = async () => {
    if (!clip.videoBlobUrl) {
      setDriveUploadError('No video file available for upload.');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setDriveUploadError('Please connect your Google Drive account first in Step 1 (Source Ingestion).');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveUploadError(null);
    setDriveUploadSuccess(null);

    try {
      const res = await fetch(clip.videoBlobUrl);
      const blob = await res.blob();
      const safeTitle = clip.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const fileName = `TEDxDuluth_${safeTitle}_9x16.webm`;

      const uploadRes = await uploadClipToDrive(
        blob,
        fileName,
        `TEDxDuluth 9:16 Social Clip - ${clip.speaker}: ${clip.title}`
      );

      setDriveUploadSuccess(uploadRes.webViewLink || 'Clip saved to your Google Drive successfully!');
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      setDriveUploadError(err.message || 'Failed to upload video clip to Google Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#141620] border border-neutral-800 rounded-2xl p-6 text-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2 rounded-xl bg-[#eb0028]/10 text-[#eb0028] border border-[#eb0028]/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                Export & Publish Social Media Copy
              </h3>
              <img
                src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
                alt="TEDxDuluth"
                className="h-5 w-auto object-contain hidden sm:inline-block"
              />
            </div>
            <p className="text-xs text-neutral-400">
              Targeted copy for LinkedIn, Facebook, and Instagram (Strict 5 hashtags max)
            </p>
          </div>
        </div>

        {/* Clip Overview */}
        <div className="p-3 rounded-xl bg-[#0f1118] border border-neutral-800 mb-3 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-[10px] text-[#eb0028] font-bold uppercase block">
              {clip.speaker}
            </span>
            <span className="font-bold text-white line-clamp-1">"{clip.title}"</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[11px]">
            {clip.duration}s • 9:16 Vertical
          </span>
        </div>

        {/* Platform Tabs: LinkedIn, Facebook, Instagram */}
        <div className="flex items-center gap-2 p-1 bg-[#1a1d29] rounded-xl border border-neutral-800 mb-3 shrink-0">
          <button
            type="button"
            onClick={() => setPlatformTab('instagram')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              platformTab === 'instagram'
                ? 'bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </button>

          <button
            type="button"
            onClick={() => setPlatformTab('linkedin')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              platformTab === 'linkedin'
                ? 'bg-[#0a66c2] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </button>

          <button
            type="button"
            onClick={() => setPlatformTab('facebook')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              platformTab === 'facebook'
                ? 'bg-[#1877f2] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Facebook className="w-3.5 h-3.5" />
            Facebook
          </button>
        </div>

        {/* Caption Box */}
        <div className="space-y-2 mb-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                {platformTab.toUpperCase()} Copy
              </label>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                5 Hashtags Max
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyHashtags}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                title="Copy 5 official hashtags"
              >
                {copiedHashtags ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                5 Tags Only
              </button>

              <button
                onClick={handleCopyCaption}
                className="text-xs text-[#eb0028] hover:underline font-bold flex items-center gap-1"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Full Post
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1a1d29] border border-neutral-700 text-xs text-neutral-200 whitespace-pre-line leading-relaxed font-sans max-h-48 overflow-y-auto select-all">
            {activeCopy}
          </div>
        </div>

        {/* Google Drive Upload Banner */}
        <div className="p-3 rounded-xl bg-[#111624] border border-blue-500/25 mb-4 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">Google Drive Backup & Sync</span>
            </div>

            <button
              type="button"
              onClick={handleUploadToDrive}
              disabled={isUploadingToDrive}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUploadingToDrive ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  Upload 9:16 Video to Drive
                </>
              )}
            </button>
          </div>

          {driveUploadSuccess && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Uploaded! File backed up to your Google Drive.</span>
            </div>
          )}

          {driveUploadError && (
            <div className="text-[11px] text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span>{driveUploadError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
