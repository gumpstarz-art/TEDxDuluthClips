import React from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Play,
  Scissors,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Award,
  Video,
  ArrowRight,
} from 'lucide-react';
import { TalkProject, HighlightClip } from '../types';
import { generatePlatformCopies } from '../utils/socialCopy';

interface AIHighlightsProps {
  project: TalkProject;
  onSelectHighlightForEdit: (clip: HighlightClip) => void;
  onBackToSource: () => void;
}

export const AIHighlights: React.FC<AIHighlightsProps> = ({
  project,
  onSelectHighlightForEdit,
  onBackToSource,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyCaption = (clip: HighlightClip) => {
    navigator.clipboard.writeText(clip.socialCaption);
    setCopiedId(clip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb0028]/10 border border-[#eb0028]/25 text-xs font-semibold text-[#eb0028] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Step 2: AI Selected Highlights
          </div>
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-8 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Key Moments for Instagram & Socials
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Gemini analyzed the transcript and identified {project.highlights.length} high-retention moments. Pick any clip to adjust times, tweak subtitles, and render 9:16 vertical video.
          </p>
        </div>

        <button
          onClick={onBackToSource}
          className="self-start md:self-auto text-xs font-semibold px-4 py-2 rounded-xl bg-[#171a25] hover:bg-[#202434] text-neutral-300 border border-neutral-700 transition"
        >
          ← Change Source / Video
        </button>
      </div>

      {/* AI Talk Summary Card */}
      {project.summary && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-[#171a26] via-[#1b1c2b] to-[#20151c] border border-neutral-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#eb0028]/10 blur-3xl pointer-events-none rounded-full" />
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#eb0028]/15 border border-[#eb0028]/30 text-[#eb0028] flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                <span>Executive Talk Summary</span>
                <span className="text-[#eb0028]">•</span>
                <span className="text-neutral-400 font-normal">{project.speaker}</span>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed font-medium">
                {project.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.highlights.map((clip, index) => {
          const isTopPick = index === 0;

          return (
            <div
              key={clip.id}
              className={`rounded-2xl p-6 transition-all relative flex flex-col justify-between ${
                isTopPick
                  ? 'bg-[#151722] border-2 border-[#eb0028]/50 shadow-xl shadow-[#eb0028]/10'
                  : 'bg-[#13151e] border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Top Tag & Viral Score */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {isTopPick && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#eb0028] text-white text-[10px] font-black tracking-wider uppercase">
                        Top Viral Pick
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                      <span className="text-neutral-500">•</span>
                      <span className="text-neutral-300 font-bold">{Math.round(clip.duration)}s</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black">
                    <Flame className="w-3.5 h-3.5 fill-orange-400" />
                    <span>{clip.viralityScore}%</span>
                  </div>
                </div>

                {/* Hook Title */}
                <h3 className="text-lg font-extrabold text-white leading-snug group-hover:text-[#eb0028] transition-colors mb-2">
                  "{clip.hookTitle}"
                </h3>

                {/* Summary & Hook Reason */}
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  {clip.summary}
                </p>

                <div className="p-2.5 rounded-xl bg-[#0f1118] border border-neutral-800 text-[11px] text-neutral-400 mb-4">
                  <span className="font-bold text-neutral-300 block mb-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#eb0028]" /> Why this works on {clip.bestPlatform}:
                  </span>
                  {clip.hookFactor}
                </div>

                {/* Subtitles Preview */}
                {clip.subtitles && clip.subtitles.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                      Spoken Subtitle Excerpt ({clip.subtitles.length} lines)
                    </span>
                    <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 font-mono text-[11px] text-neutral-300 italic line-clamp-3">
                      "{clip.subtitles.map((s) => s.text).join(' ')}"
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              {/* Multi-Platform Social Copy (LinkedIn, Facebook, Instagram with 5 hashtags max) */}
              <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-semibold flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-[#eb0028]" /> Copy Post (5 tags max):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const copies = clip.socialCopies || generatePlatformCopies({
                          talkTitle: project.title,
                          speaker: project.speaker,
                          hookTitle: clip.hookTitle,
                          summary: clip.summary,
                        });
                        navigator.clipboard.writeText(copies.instagram);
                        setCopiedId(`${clip.id}-ig`);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                        copiedId === `${clip.id}-ig`
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                      title="Copy Instagram Caption"
                    >
                      {copiedId === `${clip.id}-ig` ? <Check className="w-3 h-3 text-white" /> : 'IG'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const copies = clip.socialCopies || generatePlatformCopies({
                          talkTitle: project.title,
                          speaker: project.speaker,
                          hookTitle: clip.hookTitle,
                          summary: clip.summary,
                        });
                        navigator.clipboard.writeText(copies.linkedin);
                        setCopiedId(`${clip.id}-li`);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                        copiedId === `${clip.id}-li`
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                      title="Copy LinkedIn Post"
                    >
                      {copiedId === `${clip.id}-li` ? <Check className="w-3 h-3 text-white" /> : 'LinkedIn'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const copies = clip.socialCopies || generatePlatformCopies({
                          talkTitle: project.title,
                          speaker: project.speaker,
                          hookTitle: clip.hookTitle,
                          summary: clip.summary,
                        });
                        navigator.clipboard.writeText(copies.facebook);
                        setCopiedId(`${clip.id}-fb`);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                        copiedId === `${clip.id}-fb`
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                      title="Copy Facebook Post"
                    >
                      {copiedId === `${clip.id}-fb` ? <Check className="w-3 h-3 text-white" /> : 'FB'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectHighlightForEdit(clip)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#d40024] active:scale-[0.99] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md shadow-[#eb0028]/20 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Open in Studio & Render 9:16
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
