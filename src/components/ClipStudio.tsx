import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Download,
  Sparkles,
  Type,
  Layout,
  Sliders,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  Share2,
  Wand2,
  Target,
  ArrowRight,
  ListRestart,
  Gauge,
  Film,
  Linkedin,
  Facebook,
  Instagram,
  Copy,
  Check,
  HardDrive,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import {
  TalkProject,
  HighlightClip,
  SubtitleLine,
  SubtitleStyle,
  VideoSettings,
  SavedClip,
  SocialCopySet,
} from '../types';
import { renderVerticalClip } from './VideoRenderer';
import { generatePlatformCopies, enforceMaxFiveHashtags } from '../utils/socialCopy';
import { uploadClipToDrive, getAccessToken } from '../services/googleDrive';


interface ClipStudioProps {
  project: TalkProject;
  activeClip: HighlightClip | null;
  editingSavedClip?: SavedClip | null;
  onClipSaved: (savedClip: SavedClip) => void;
  onClipUpdated?: (savedClip: SavedClip) => void;
  onCancelEdit?: () => void;
  onNavigateToLibrary: () => void;
}

export const ClipStudio: React.FC<ClipStudioProps> = ({
  project,
  activeClip,
  editingSavedClip,
  onClipSaved,
  onClipUpdated,
  onCancelEdit,
  onNavigateToLibrary,
}) => {
  // Trim timestamps in seconds
  const [startTime, setStartTime] = useState<number>(
    editingSavedClip?.startTime ?? activeClip?.startTime ?? 0
  );
  const [endTime, setEndTime] = useState<number>(
    editingSavedClip?.endTime ?? activeClip?.endTime ?? Math.min(30, project.duration || 30)
  );
  const [currentTime, setCurrentTime] = useState<number>(
    editingSavedClip?.startTime ?? activeClip?.startTime ?? 0
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Micro timing offset (in seconds) to shift captions forward or backward
  const [syncOffset, setSyncOffset] = useState<number>(
    editingSavedClip?.syncOffset ?? 0
  );

  // Hook headline & caption
  const [hookTitle, setHookTitle] = useState<string>(
    editingSavedClip?.title || activeClip?.hookTitle || project.title || 'TEDxDuluth Key Highlight'
  );
  const [socialCaption, setSocialCaption] = useState<string>(
    editingSavedClip?.socialCaption || activeClip?.socialCaption || `${project.speaker ? `${project.speaker} at ` : ''}TEDxDuluth #TEDxDuluth #IdeasWorthSpreading`
  );

  // Multi-platform Copy for LinkedIn, Facebook, and Instagram (Strict 5 hashtags max)
  const [socialCopies, setSocialCopies] = useState<SocialCopySet>(() => {
    if (editingSavedClip?.socialCopies) return editingSavedClip.socialCopies;
    if (activeClip?.socialCopies) return activeClip.socialCopies;
    return generatePlatformCopies({
      talkTitle: project.title,
      speaker: project.speaker,
      hookTitle: editingSavedClip?.title || activeClip?.hookTitle || hookTitle,
      summary: activeClip?.summary || project.summary,
    });
  });
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<'instagram' | 'linkedin' | 'facebook'>('instagram');
  const [copiedSocialPost, setCopiedSocialPost] = useState(false);
  const [savedDetailsToast, setSavedDetailsToast] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>(() => {
    if (editingSavedClip?.subtitles && editingSavedClip.subtitles.length > 0) {
      return editingSavedClip.subtitles.map((sub, i) => ({
        id: sub.id || `sub-${i}-${Date.now()}`,
        start: sub.start,
        end: sub.end,
        videoStart: sub.videoStart !== undefined ? sub.videoStart : (editingSavedClip.startTime + sub.start),
        videoEnd: sub.videoEnd !== undefined ? sub.videoEnd : (editingSavedClip.startTime + sub.end),
        text: sub.text,
      }));
    }
    if (activeClip?.subtitles && activeClip.subtitles.length > 0) {
      return activeClip.subtitles.map((sub, i) => ({
        id: `sub-${i}-${Date.now()}`,
        start: sub.start,
        end: sub.end,
        videoStart: sub.videoStart !== undefined ? sub.videoStart : (activeClip.startTime + sub.start),
        videoEnd: sub.videoEnd !== undefined ? sub.videoEnd : (activeClip.startTime + sub.end),
        text: sub.text,
      }));
    }
    if (project.transcript) {
      const lines = project.transcript
        .split('\n')
        .map((l) => l.replace(/^\[\d{2}:\d{2}\]\s*/, '').trim())
        .filter((l) => l.length > 10)
        .slice(0, 3);
      if (lines.length > 0) {
        return lines.map((line, idx) => ({
          id: `sub-${idx}`,
          start: idx * 4.0,
          end: (idx + 1) * 4.0,
          videoStart: idx * 4.0,
          videoEnd: (idx + 1) * 4.0,
          text: line,
        }));
      }
    }
    return [
      {
        id: 'sub-1',
        start: 0.0,
        end: 4.0,
        videoStart: 0.0,
        videoEnd: 4.0,
        text: 'Ideas worth spreading from TEDxDuluth.',
      },
    ];
  });

  // Subtitle styling - TED Classic and TED Red exclusively with Helvetica
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    if (editingSavedClip?.subtitleStyle) return editingSavedClip.subtitleStyle;
    return {
      preset: (editingSavedClip?.subtitlePreset as any) || 'ted-classic',
      fontVariant: 'helvetica-bold',
      fontSize: 34,
      positionY: 82, // Moved down so text doesn't cut off speaker's feet
      textTransform: 'none',
      highlightColor: '#ffffff',
      showBackgroundBox: true,
      boxColor: 'rgba(12, 14, 20, 0.88)',
    };
  });

  // Video settings & Layout: Blurred Fit & Center Crop only; logo default off & bottom corner
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(() => {
    if (editingSavedClip?.videoSettings) return editingSavedClip.videoSettings;
    return {
      aspectRatio: '9:16',
      layout: (editingSavedClip?.layout as any) || 'blurred-fit',
      showTedLogo: false, // Default off as requested
      logoPosition: 'bottom-right', // Bottom corner as requested
      showHeadline: true,
      customHeadline: editingSavedClip?.title || activeClip?.hookTitle || hookTitle,
      showProgressBar: true,
      resolution: '720x1280',
    };
  });

  // Rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [isAligning, setIsAligning] = useState(false);

  const [timelineZoom, setTimelineZoom] = useState<'clip' | '2x' | '4x' | 'full'>('clip');
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);

  // Active tab in sidebar
  const [sidebarTab, setSidebarTab] = useState<'trim' | 'subtitles' | 'brand' | 'caption'>('trim');

  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png';
    logoImageRef.current = img;
  }, []);

  const duration = Math.max(0.5, endTime - startTime);
  const totalVideoDuration = project.duration || 37.5;

  // Sync state if activeClip changes
  useEffect(() => {
    if (activeClip) {
      setStartTime(activeClip.startTime);
      setEndTime(activeClip.endTime);
      setCurrentTime(activeClip.startTime);
      setHookTitle(activeClip.hookTitle);
      setSocialCaption(activeClip.socialCaption);
      setSyncOffset(0);

      if (activeClip.subtitles && activeClip.subtitles.length > 0) {
        setSubtitles(
          activeClip.subtitles.map((sub, i) => ({
            id: `sub-${i}-${Date.now()}`,
            start: sub.start,
            end: sub.end,
            videoStart: sub.videoStart !== undefined ? sub.videoStart : activeClip.startTime + sub.start,
            videoEnd: sub.videoEnd !== undefined ? sub.videoEnd : activeClip.startTime + sub.end,
            text: sub.text,
          }))
        );
      }
      setVideoSettings((prev) => ({
        ...prev,
        customHeadline: activeClip.hookTitle,
      }));
    }
  }, [activeClip]);

  // Sync state if editingSavedClip changes
  useEffect(() => {
    if (editingSavedClip) {
      setStartTime(editingSavedClip.startTime);
      setEndTime(editingSavedClip.endTime);
      setCurrentTime(editingSavedClip.startTime);
      setHookTitle(editingSavedClip.title);
      setSocialCaption(editingSavedClip.socialCaption);
      setSyncOffset(editingSavedClip.syncOffset || 0);

      if (editingSavedClip.socialCopies) {
        setSocialCopies(editingSavedClip.socialCopies);
      }

      if (editingSavedClip.subtitles && editingSavedClip.subtitles.length > 0) {
        setSubtitles(
          editingSavedClip.subtitles.map((sub, i) => ({
            id: sub.id || `sub-${i}-${Date.now()}`,
            start: sub.start,
            end: sub.end,
            videoStart: sub.videoStart !== undefined ? sub.videoStart : editingSavedClip.startTime + sub.start,
            videoEnd: sub.videoEnd !== undefined ? sub.videoEnd : editingSavedClip.startTime + sub.end,
            text: sub.text,
          }))
        );
      }

      if (editingSavedClip.subtitleStyle) {
        setSubtitleStyle(editingSavedClip.subtitleStyle);
      }

      if (editingSavedClip.videoSettings) {
        setVideoSettings(editingSavedClip.videoSettings);
      } else {
        setVideoSettings((prev) => ({
          ...prev,
          customHeadline: editingSavedClip.title,
        }));
      }
    }
  }, [editingSavedClip]);

  // Video timeupdate handler with precision looping
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);

    // Loop within [startTime, endTime]
    if (ct >= endTime || ct < startTime - 0.2) {
      videoRef.current.currentTime = startTime;
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  // Seek video
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, totalVideoDuration));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Play a specific subtitle line
  const handlePlaySubtitle = (sub: SubtitleLine) => {
    const targetTime = sub.videoStart !== undefined ? sub.videoStart : startTime + sub.start;
    handleSeek(targetTime);
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Snap subtitle start to current playhead
  const handleSnapSubStart = (index: number) => {
    const ct = Number(currentTime.toFixed(1));
    const relStart = Number(Math.max(0, ct - startTime).toFixed(1));

    setSubtitles((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          const oldDur = (s.videoEnd || (startTime + s.end)) - (s.videoStart || (startTime + s.start));
          const newDur = Math.max(1.0, oldDur);
          return {
            ...s,
            videoStart: ct,
            videoEnd: Number((ct + newDur).toFixed(1)),
            start: relStart,
            end: Number((relStart + newDur).toFixed(1)),
          };
        }
        return s;
      })
    );
  };

  // Snap subtitle end to current playhead
  const handleSnapSubEnd = (index: number) => {
    const ct = Number(currentTime.toFixed(1));
    const relEnd = Number(Math.max(0.5, ct - startTime).toFixed(1));

    setSubtitles((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          const vStart = s.videoStart !== undefined ? s.videoStart : startTime + s.start;
          const safeEnd = Math.max(vStart + 0.5, ct);
          return {
            ...s,
            videoEnd: safeEnd,
            end: Math.max(s.start + 0.5, relEnd),
          };
        }
        return s;
      })
    );
  };

  // Nudge individual subtitle line
  const nudgeSubtitleLine = (index: number, delta: number) => {
    setSubtitles((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          const oldVStart = s.videoStart !== undefined ? s.videoStart : startTime + s.start;
          const oldVEnd = s.videoEnd !== undefined ? s.videoEnd : startTime + s.end;
          const newVStart = Math.max(0, Number((oldVStart + delta).toFixed(1)));
          const newVEnd = Math.max(newVStart + 0.5, Number((oldVEnd + delta).toFixed(1)));
          return {
            ...s,
            videoStart: newVStart,
            videoEnd: newVEnd,
            start: Number(Math.max(0, newVStart - startTime).toFixed(1)),
            end: Number(Math.max(0.5, newVEnd - startTime).toFixed(1)),
          };
        }
        return s;
      })
    );
  };

  // Nudge controls for In-Point
  const nudgeStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(startTime + delta, endTime - 1.5));
    const finalStart = Number(newStart.toFixed(1));
    setStartTime(finalStart);

    // Recompute relative offsets for subtitles so they stay anchored to their video timestamps!
    setSubtitles((prev) =>
      prev.map((sub) => {
        const vStart = sub.videoStart !== undefined ? sub.videoStart : startTime + sub.start;
        const vEnd = sub.videoEnd !== undefined ? sub.videoEnd : startTime + sub.end;
        return {
          ...sub,
          videoStart: vStart,
          videoEnd: vEnd,
          start: Number(Math.max(0, vStart - finalStart).toFixed(1)),
          end: Number(Math.max(0.5, vEnd - finalStart).toFixed(1)),
        };
      })
    );

    handleSeek(finalStart);
  };

  // Nudge controls for Out-Point
  const nudgeEnd = (delta: number) => {
    const newEnd = Math.max(startTime + 1.5, Math.min(endTime + delta, totalVideoDuration));
    setEndTime(Number(newEnd.toFixed(1)));
  };

  // Auto-align subtitles to current trim window from transcript using Gemini
  const handleAutoAlignSubtitles = async () => {
    if (!project.transcript) return;
    setIsAligning(true);

    try {
      const res = await fetch('/api/align-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: project.transcript,
          startTime,
          endTime,
        }),
      });

      const data = await res.json();
      if (res.ok && data.subtitles && Array.isArray(data.subtitles) && data.subtitles.length > 0) {
        setSubtitles(
          data.subtitles.map((s: any, idx: number) => ({
            id: `aligned-${idx}-${Date.now()}`,
            text: s.text,
            videoStart: Number(s.videoStart ?? (startTime + s.start)),
            videoEnd: Number(s.videoEnd ?? (startTime + s.end)),
            start: Number(s.start ?? Math.max(0, s.videoStart - startTime)),
            end: Number(s.end ?? Math.max(1, s.videoEnd - startTime)),
          }))
        );
        setSyncOffset(0);
      }
    } catch (err) {
      console.error('Auto-align failed:', err);
    } finally {
      setIsAligning(false);
    }
  };

  // Live Canvas 9:16 Preview Loop
  useEffect(() => {
    let animId: number;

    const renderPreview = () => {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetWidth = canvas.width;
      const targetHeight = canvas.height;

      // 1. Clear Canvas
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 2. Video frame rendering based on layout
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      const vRatio = vWidth / vHeight;

      if (videoSettings.layout === 'center-crop') {
        const targetRatio = targetWidth / targetHeight;
        let sWidth = vWidth;
        let sHeight = vHeight;
        let sX = 0;
        let sY = 0;

        if (vRatio > targetRatio) {
          sWidth = vHeight * targetRatio;
          sX = (vWidth - sWidth) / 2;
        } else {
          sHeight = vWidth / targetRatio;
          sY = (vHeight - sHeight) / 2;
        }
        try {
          ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        } catch {}
      } else {
        // Blurred background (default and recommended)
        ctx.save();
        ctx.filter = 'blur(20px) brightness(0.35)';
        const bgScale = Math.max(targetWidth / vWidth, targetHeight / vHeight) * 1.25;
        const bgW = vWidth * bgScale;
        const bgH = vHeight * bgScale;
        try {
          ctx.drawImage(video, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
        } catch {}
        ctx.restore();

        // Sharp centered 16:9 video
        const fgW = targetWidth;
        const fgH = targetWidth / vRatio;
        const fgY = (targetHeight - fgH) / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, fgY, fgW, fgH);
        try {
          ctx.drawImage(video, 0, 0, vWidth, vHeight, 0, fgY, fgW, fgH);
        } catch {}
        ctx.restore();
      }

      // 3. TEDxDuluth Official Logo (Bottom Corner)
      if (videoSettings.showTedLogo) {
        ctx.save();
        const logoImg = logoImageRef.current;
        const lWidth = 110;
        const lHeight = (logoImg && logoImg.naturalHeight && logoImg.naturalWidth)
          ? (logoImg.naturalHeight / logoImg.naturalWidth) * lWidth
          : 25;

        const isBottomLeft = videoSettings.logoPosition === 'bottom-left';
        const logoX = isBottomLeft ? 14 : (targetWidth - lWidth - 14);
        const logoY = videoSettings.showProgressBar
          ? (targetHeight - lHeight - 24)
          : (targetHeight - lHeight - 14);

        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          // Frosted glass backing in bottom corner
          ctx.fillStyle = 'rgba(11, 12, 16, 0.82)';
          ctx.beginPath();
          ctx.roundRect(logoX - 6, logoY - 5, lWidth + 12, lHeight + 10, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.drawImage(logoImg, logoX, logoY, lWidth, lHeight);
        } else {
          ctx.fillStyle = 'rgba(11, 12, 16, 0.82)';
          ctx.beginPath();
          ctx.roundRect(logoX - 6, logoY - 5, lWidth + 12, 32, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = '800 13px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('TED', logoX, logoY + 14);
          const tw = ctx.measureText('TED').width;

          ctx.fillStyle = '#eb0028';
          ctx.font = '900 15px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillText('x', logoX + tw + 1, logoY + 14);
          const xw = ctx.measureText('x').width;

          ctx.fillStyle = '#ffffff';
          ctx.font = '700 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillText('Duluth', logoX + tw + xw + 2, logoY + 13);

          ctx.font = '600 5.5px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText('x = independently organized TED event', logoX, logoY + 23);
        }
        ctx.restore();
      }

      // 4. Hook Headline Banner
      if (videoSettings.showHeadline && (videoSettings.customHeadline || hookTitle)) {
        ctx.save();
        const bannerY = 82;
        const bannerPaddingX = 20;
        const headline = (videoSettings.customHeadline || hookTitle).toUpperCase();

        ctx.font = '900 17px "Space Grotesk", sans-serif';
        const words = headline.split(' ');
        const lines: string[] = [];
        let curr = '';
        for (const w of words) {
          const test = curr ? `${curr} ${w}` : w;
          if (ctx.measureText(test).width > targetWidth - bannerPaddingX * 2) {
            lines.push(curr);
            curr = w;
          } else {
            curr = test;
          }
        }
        if (curr) lines.push(curr);

        const lineHeight = 22;
        const bannerH = lines.length * lineHeight + 12;

        ctx.fillStyle = 'rgba(10, 10, 14, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bannerPaddingX - 8, bannerY - 8, targetWidth - (bannerPaddingX - 8) * 2, bannerH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(235, 0, 40, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        lines.forEach((line, i) => {
          ctx.fillText(line, targetWidth / 2, bannerY + 12 + i * lineHeight);
        });
        ctx.restore();
      }

      // 5. (Bottom speaker/source tag removed as requested)

      // 6. PRECISION SUBTITLE MATCHING
      // Look up subtitle by absolute video time + syncOffset
      const currentSec = video.currentTime;
      const clipElapsed = currentSec - startTime;

      const activeSub = subtitles.find((sub) => {
        if (sub.videoStart !== undefined && sub.videoEnd !== undefined) {
          return currentSec >= (sub.videoStart + syncOffset) && currentSec <= (sub.videoEnd + syncOffset);
        }
        return clipElapsed >= (sub.start + syncOffset) && clipElapsed <= (sub.end + syncOffset);
      });

      if (activeSub && activeSub.text) {
        ctx.save();
        let subText = activeSub.text.trim();
        if (subtitleStyle.textTransform === 'uppercase') {
          subText = subText.toUpperCase();
        }

        const posY = (targetHeight * (subtitleStyle.positionY || 82)) / 100;
        const fontSize = Math.round((subtitleStyle.fontSize || 34) * 0.52);

        // Exclusive Helvetica font family variants
        let fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
        let fontWeight = '800';

        if (subtitleStyle.fontVariant === 'helvetica-medium') {
          fontWeight = '600';
        } else if (subtitleStyle.fontVariant === 'helvetica-condensed') {
          fontStack = '"Helvetica Neue Condensed", "Arial Narrow", "Helvetica Neue", Helvetica, sans-serif';
          fontWeight = '700';
        }

        ctx.font = `${fontWeight} ${fontSize}px ${fontStack}`;
        ctx.textAlign = 'center';

        const words = subText.split(' ');
        const subLines: string[] = [];
        let curr = '';
        for (const w of words) {
          const test = curr ? `${curr} ${w}` : w;
          if (ctx.measureText(test).width > targetWidth - 45) {
            subLines.push(curr);
            curr = w;
          } else {
            curr = test;
          }
        }
        if (curr) subLines.push(curr);

        const subLineHeight = fontSize * 1.35;
        const totalSubH = subLines.length * subLineHeight;

        // ONLY TWO PRESETS: TED Classic and TED Red
        if (subtitleStyle.preset === 'ted-red') {
          subLines.forEach((line, i) => {
            const lw = ctx.measureText(line).width;
            const lineY = posY - totalSubH / 2 + i * subLineHeight;

            // Signature TED Red pill background
            ctx.fillStyle = '#eb0028';
            ctx.beginPath();
            ctx.roundRect(
              targetWidth / 2 - lw / 2 - 10,
              lineY - fontSize * 0.88,
              lw + 20,
              fontSize * 1.28,
              6
            );
            ctx.fill();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 3;
            ctx.fillText(line, targetWidth / 2, lineY);
          });
        } else {
          // TED Classic
          subLines.forEach((line, i) => {
            const lw = ctx.measureText(line).width;
            const lineY = posY - totalSubH / 2 + i * subLineHeight;

            ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
            ctx.beginPath();
            ctx.roundRect(
              targetWidth / 2 - lw / 2 - 9,
              lineY - fontSize * 0.88,
              lw + 18,
              fontSize * 1.28,
              5
            );
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 3;
            ctx.fillText(line, targetWidth / 2, lineY);
          });
        }
        ctx.restore();
      }

      // 7. Dynamic Progress Bar
      if (videoSettings.showProgressBar) {
        ctx.save();
        const barY = targetHeight - 16;
        const barH = 4;
        const barPad = 16;
        const totalW = targetWidth - barPad * 2;
        const progressFrac = Math.min(1, Math.max(0, clipElapsed / duration));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(barPad, barY, totalW, barH, 2);
        ctx.fill();

        ctx.fillStyle = '#eb0028';
        ctx.beginPath();
        ctx.roundRect(barPad, barY, Math.max(4, totalW * progressFrac), barH, 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(renderPreview);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animId);
  }, [
    startTime,
    endTime,
    duration,
    subtitles,
    subtitleStyle,
    videoSettings,
    hookTitle,
    project.speaker,
    syncOffset,
  ]);

  // Edit individual subtitle
  const updateSubtitle = (index: number, updated: Partial<SubtitleLine>) => {
    setSubtitles((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          const item = { ...s, ...updated };
          // If videoStart was modified, sync relative start
          if (updated.videoStart !== undefined) {
            item.start = Number(Math.max(0, updated.videoStart - startTime).toFixed(1));
          }
          if (updated.videoEnd !== undefined) {
            item.end = Number(Math.max(0.5, updated.videoEnd - startTime).toFixed(1));
          }
          return item;
        }
        return s;
      })
    );
  };

  const addSubtitleLine = () => {
    const lastSub = subtitles[subtitles.length - 1];
    const newVStart = lastSub
      ? Number(((lastSub.videoEnd || startTime) + 0.2).toFixed(1))
      : Number(startTime.toFixed(1));
    const newVEnd = Number((newVStart + 3.0).toFixed(1));
    const newStart = Number(Math.max(0, newVStart - startTime).toFixed(1));
    const newEnd = Number((newStart + 3.0).toFixed(1));

    setSubtitles([
      ...subtitles,
      {
        id: `sub-${Date.now()}`,
        start: newStart,
        end: newEnd,
        videoStart: newVStart,
        videoEnd: newVEnd,
        text: 'New spoken phrase...',
      },
    ]);
  };

  const removeSubtitleLine = (index: number) => {
    setSubtitles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Quick-save subtitle text, hook title, and copy changes directly to existing finished clip without re-rendering
  const handleQuickSaveDetails = () => {
    if (!editingSavedClip || !onClipUpdated) return;
    const updated: SavedClip = {
      ...editingSavedClip,
      title: hookTitle,
      socialCaption: socialCopies[activeSocialPlatform] || socialCaption,
      socialCopies: socialCopies,
      subtitles: subtitles,
      syncOffset: syncOffset,
      subtitleStyle: subtitleStyle,
      videoSettings: videoSettings,
      startTime: startTime,
      endTime: endTime,
      duration: Math.round(duration),
    };
    onClipUpdated(updated);
    setSavedDetailsToast(true);
    setTimeout(() => setSavedDetailsToast(false), 2500);
  };

  // Render & Export Video (support updating finished clip or saving as new)
  const handleRenderVideo = async (exportMode: 'update' | 'new' = 'update') => {
    if (!videoRef.current) return;
    setIsRendering(true);
    setRenderProgress(0);
    setRenderStatus('Initializing synchronized 9:16 vertical video renderer...');

    try {
      videoRef.current.pause();
      setIsPlaying(false);

      const result = await renderVerticalClip({
        videoElement: videoRef.current,
        startTime,
        endTime,
        subtitles,
        subtitleStyle,
        videoSettings,
        hookTitle,
        speakerName: project.speaker,
        syncOffset,
        onProgress: (pct, status) => {
          setRenderProgress(pct);
          setRenderStatus(status);
        },
      });

      const isUpdating = editingSavedClip && exportMode === 'update';
      const saved: SavedClip = {
        id: isUpdating ? editingSavedClip.id : `clip-${Date.now()}`,
        title: hookTitle,
        talkTitle: project.title,
        speaker: project.speaker,
        duration: Math.round(duration),
        startTime,
        endTime,
        videoBlobUrl: result.url,
        socialCaption: socialCopies[activeSocialPlatform] || socialCaption,
        socialCopies: socialCopies,
        platform: editingSavedClip?.platform || 'All',
        status: 'Ready',
        createdAt: isUpdating ? editingSavedClip.createdAt : new Date().toISOString(),
        subtitlePreset: subtitleStyle.preset,
        layout: videoSettings.layout,
        subtitles: subtitles,
        syncOffset: syncOffset,
        subtitleStyle: subtitleStyle,
        videoSettings: videoSettings,
        talkProjectId: project.id,
      };

      if (isUpdating && onClipUpdated) {
        onClipUpdated(saved);
      } else {
        onClipSaved(saved);
      }

      // Trigger automatic file download
      const a = document.createElement('a');
      a.href = result.url;
      const cleanHook = hookTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      a.download = `TEDxDuluth_${cleanHook}_${Math.round(duration)}s.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Video render failed:', err);
      alert(`Render error: ${err.message || 'Could not export video.'}`);
    } finally {
      setIsRendering(false);
    }
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const frac = Math.floor((s % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${frac}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hidden master video element for synced playback & canvas frame extraction */}
      <video
        ref={videoRef}
        src={project.videoUrl}
        preload="auto"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        muted={isMuted}
        playsInline
        className="hidden"
      />

      {/* Editing Finished Clip Mode Banner */}
      {editingSavedClip && (
        <div className="mb-5 p-4 rounded-2xl bg-[#1c1815] border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg shadow-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-amber-200 flex items-center gap-2">
                <span>Editing Finished Clip:</span>
                <span className="text-white font-extrabold">"{editingSavedClip.title}"</span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                {editingSavedClip.speaker} • {editingSavedClip.duration}s • Re-trimmed timestamps & edited subtitles can update this clip or be saved as a new version.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleQuickSaveDetails}
              className="px-3 py-1.5 rounded-xl bg-[#252b40] hover:bg-[#313955] text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Save text and timing changes directly back to library without re-rendering"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Details</span>
            </button>
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
              >
                Exit Edit Mode
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToLibrary}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
            >
              Saved Library
            </button>
          </div>
        </div>
      )}

      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#eb0028] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#eb0028] animate-pulse" />
            {editingSavedClip ? 'TEDxDuluth Studio • Editing Finished Clip' : 'TEDxDuluth Studio • Precise Audio & Caption Timing'}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>"{hookTitle}"</span>
          </h2>
          <p className="text-xs text-neutral-400">
            {project.speaker} • {project.title}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNavigateToLibrary}
            className="px-3.5 py-2 rounded-xl bg-[#171a25] hover:bg-[#202434] text-neutral-300 text-xs font-semibold border border-neutral-700 transition"
          >
            View Saved Library
          </button>

          {editingSavedClip ? (
            <>
              <button
                onClick={() => handleRenderVideo('update')}
                disabled={isRendering}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-amber-600/25 cursor-pointer disabled:opacity-50"
                title="Update this finished clip in library with new video & timing"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Update Finished Clip
                  </>
                )}
              </button>
              <button
                onClick={() => handleRenderVideo('new')}
                disabled={isRendering}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition border border-neutral-700 cursor-pointer disabled:opacity-50"
                title="Save as a brand new clip in library"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save New</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleRenderVideo('new')}
              disabled={isRendering}
              className="px-5 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#d40024] active:scale-[0.99] text-white text-xs font-black flex items-center gap-2 transition shadow-lg shadow-[#eb0028]/25 cursor-pointer disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Render & Download 9:16 Video
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 9:16 Canvas Live Preview & Playback Controls */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border-2 border-neutral-800 shadow-2xl shadow-black/80 flex items-center justify-center group">
            {/* Live 9:16 vertical canvas */}
            <canvas
              ref={previewCanvasRef}
              width={360}
              height={640}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Play/Pause overlay indicator */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-[#eb0028] text-white flex items-center justify-center shadow-lg shadow-[#eb0028]/40 hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 fill-white translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Top resolution & sync badge */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-neutral-300 pointer-events-none flex items-center gap-1">
              {syncOffset !== 0 ? (
                <span className="text-yellow-400 font-bold">Sync: {syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`}</span>
              ) : (
                <span>9:16 Synced</span>
              )}
            </div>
          </div>

          {/* Quick Playback Bar */}
          <div className="w-full max-w-[340px] mt-4 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#13151f] border border-neutral-800 text-xs">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-[#eb0028] text-white hover:bg-[#d40024] transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => handleSeek(startTime)}
              title="Restart from clip start"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="text-center font-mono text-xs">
              <span className="text-white font-bold">{formatSecs(currentTime)}</span>
              <span className="text-neutral-500"> / </span>
              <span className="text-neutral-400">{formatSecs(endTime)}</span>
              <div className="text-[10px] text-neutral-500">
                Clip: {duration.toFixed(1)}s
              </div>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right: Studio Controls (Timeline Trimmer, Visual Waveform Track, Subtitle Sync, Branding) */}
        <div className="lg:col-span-7 bg-[#13151f] border border-neutral-800 rounded-2xl p-5 space-y-4">
          
          {/* ZOOMED INTERACTIVE VIDEO & SUBTITLE TIMELINE EDITOR */}
          <div className="p-4 rounded-2xl bg-[#0b0d14] border border-neutral-800 space-y-3 shadow-inner">
            {/* Timeline Header: Title + Time Info + Zoom Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-neutral-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#eb0028] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Interactive Video & Subtitle Track
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-[10px] font-mono text-neutral-300">
                    {timelineZoom === 'full' ? 'Overview' : `${timelineZoom.toUpperCase()} Zoom`}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  Clip: <strong className="text-white">{startTime.toFixed(1)}s</strong> → <strong className="text-white">{endTime.toFixed(1)}s</strong> ({duration.toFixed(1)}s) • Playhead: <span className="text-yellow-400 font-bold">{currentTime.toFixed(1)}s</span>
                </div>
              </div>

              {/* Zoom Buttons: Fit Clip (1x), 2x, 4x, Full Talk */}
              <div className="flex items-center gap-1 bg-[#171a25] p-1 rounded-xl border border-neutral-800 text-xs shrink-0">
                <span className="text-[10px] text-neutral-400 px-1 font-semibold">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setTimelineZoom('clip')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    timelineZoom === 'clip'
                      ? 'bg-[#eb0028] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Fit active clip in view (Recommended for editing)"
                >
                  Fit Clip
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineZoom('2x')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer ${
                    timelineZoom === '2x'
                      ? 'bg-[#eb0028] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Zoom in 2x for word-level precision"
                >
                  <ZoomIn className="w-3 h-3" />
                  2x
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineZoom('4x')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer ${
                    timelineZoom === '4x'
                      ? 'bg-[#eb0028] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Zoom in 4x for micro split-second timing"
                >
                  <ZoomIn className="w-3 h-3" />
                  4x
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineZoom('full')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    timelineZoom === 'full'
                      ? 'bg-[#eb0028] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="View full talk overview"
                >
                  Talk
                </button>
              </div>
            </div>

            {/* Scrollable Track Container */}
            <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
              <div
                style={{ width: `${timelineZoom === '4x' ? 400 : timelineZoom === '2x' ? 200 : 100}%` }}
                className="relative select-none min-w-[480px]"
              >
                {/* 1. Time Ruler Marks */}
                <div className="relative h-4 mb-1 text-[9px] font-mono text-neutral-500 border-b border-neutral-800">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const pct = (i / 6) * 100;
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = isFull ? totalVideoDuration : duration;
                    const markTime = winStart + (winDur * i) / 6;
                    return (
                      <div
                        key={i}
                        className="absolute -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${pct}%` }}
                      >
                        <span>{isFull ? formatSecs(markTime) : `+${((winDur * i) / 6).toFixed(1)}s`}</span>
                        <div className="w-px h-1.5 bg-neutral-700" />
                      </div>
                    );
                  })}
                </div>

                {/* 2. Interactive Video Scrub Track */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = isFull ? totalVideoDuration : duration;
                    handleSeek(winStart + ratio * winDur);
                  }}
                  className="relative h-6 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700/80 cursor-pointer shadow-inner mb-2"
                >
                  <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,#444,#444_10px,#222_10px,#222_20px)]" />

                  {/* Highlight clip window when in Full Talk mode */}
                  {timelineZoom === 'full' && (
                    <div
                      className="absolute top-0 bottom-0 bg-[#eb0028]/35 border-x-2 border-[#eb0028] flex items-center justify-between px-1.5 pointer-events-none"
                      style={{
                        left: `${(startTime / totalVideoDuration) * 100}%`,
                        width: `${(duration / totalVideoDuration) * 100}%`,
                      }}
                    >
                      <span className="text-[9px] font-mono text-white font-bold bg-[#eb0028] px-1 rounded">
                        IN
                      </span>
                      <span className="text-[9px] font-mono text-white font-bold bg-[#eb0028] px-1 rounded">
                        OUT
                      </span>
                    </div>
                  )}

                  {/* Playhead marker in video track */}
                  {(() => {
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = Math.max(0.5, isFull ? totalVideoDuration : duration);
                    const playheadPct = Math.max(0, Math.min(100, ((currentTime - winStart) / winDur) * 100));
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-yellow-400 z-30 pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      >
                        <div className="w-3 h-3 -ml-1 -top-1 rounded-full bg-yellow-400 shadow-md border border-black/40" />
                      </div>
                    );
                  })()}

                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-neutral-400 pointer-events-none font-semibold">
                    Click to scrub video • {formatSecs(currentTime)}
                  </div>
                </div>

                {/* 3. Dedicated Subtitles Track (Zoomed, Taller & Clickable) */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = isFull ? totalVideoDuration : duration;
                    handleSeek(winStart + ratio * winDur);
                  }}
                  className="relative h-11 bg-[#0a0c12] rounded-xl border border-neutral-700/70 p-1 cursor-pointer overflow-hidden shadow-inner"
                >
                  {/* Subtle track guide lines */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Subtitle blocks along track */}
                  {subtitles.map((sub, i) => {
                    const vStart = sub.videoStart !== undefined ? sub.videoStart : startTime + sub.start;
                    const vEnd = sub.videoEnd !== undefined ? sub.videoEnd : startTime + sub.end;
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = Math.max(0.5, isFull ? totalVideoDuration : duration);

                    // Skip if outside zoom window
                    if (vEnd < winStart || vStart > (winStart + winDur)) return null;

                    const leftPct = Math.max(0, Math.min(100, ((vStart - winStart) / winDur) * 100));
                    const rightPct = Math.max(0, Math.min(100, ((vEnd - winStart) / winDur) * 100));
                    const widthPct = Math.max(2, rightPct - leftPct);

                    const isPlaying = currentTime >= (vStart + syncOffset) && currentTime <= (vEnd + syncOffset);
                    const isSelected = selectedSubIndex === i;

                    return (
                      <div
                        key={sub.id || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubIndex(i);
                          handleSeek(vStart);
                        }}
                        title={`Line ${i + 1}: "${sub.text}" (${vStart.toFixed(1)}s → ${vEnd.toFixed(1)}s)`}
                        className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between transition-all border text-xs cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#eb0028] text-white border-white z-20 ring-2 ring-white/60 shadow-lg shadow-[#eb0028]/30 font-bold'
                            : isPlaying
                            ? 'bg-[#ffde00] text-black border-yellow-200 font-extrabold z-10 scale-[1.02] shadow-md'
                            : 'bg-[#1b1f2e] hover:bg-[#252b3e] text-neutral-200 border-neutral-600/60 hover:border-neutral-400'
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden truncate">
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                              isSelected
                                ? 'bg-black/40 text-white'
                                : isPlaying
                                ? 'bg-black text-yellow-300'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate text-[11px]">{sub.text}</span>
                        </div>
                        <span className="text-[9px] opacity-75 font-mono shrink-0 ml-1.5 hidden sm:inline">
                          {(vEnd - vStart).toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}

                  {/* Playhead needle extending down across subtitle track */}
                  {(() => {
                    const isFull = timelineZoom === 'full';
                    const winStart = isFull ? 0 : startTime;
                    const winDur = Math.max(0.5, isFull ? totalVideoDuration : duration);
                    const playheadPct = Math.max(0, Math.min(100, ((currentTime - winStart) / winDur) * 100));
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-yellow-400 z-30 pointer-events-none"
                        style={{ left: `${playheadPct}%` }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 4. Quick-Edit Subtitle Box (For Selected or Active Subtitle) */}
            {(() => {
              const activeIdx = selectedSubIndex !== null
                ? selectedSubIndex
                : subtitles.findIndex((s) => {
                    const vs = s.videoStart !== undefined ? s.videoStart : startTime + s.start;
                    const ve = s.videoEnd !== undefined ? s.videoEnd : startTime + s.end;
                    return currentTime >= (vs + syncOffset) && currentTime <= (ve + syncOffset);
                  });

              const targetSub = activeIdx >= 0 ? subtitles[activeIdx] : null;
              if (!targetSub) {
                return (
                  <div className="p-2.5 rounded-xl bg-[#141722] border border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Click any subtitle block above to inspect, adjust timing, and edit text.</span>
                    <button
                      type="button"
                      onClick={addSubtitleLine}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#eb0028]" />
                      Add Subtitle
                    </button>
                  </div>
                );
              }

              const vStart = targetSub.videoStart !== undefined ? targetSub.videoStart : startTime + targetSub.start;
              const vEnd = targetSub.videoEnd !== undefined ? targetSub.videoEnd : startTime + targetSub.end;

              return (
                <div className="p-3.5 rounded-xl bg-[#151824] border border-neutral-700 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#eb0028] text-white text-[10px] font-bold uppercase tracking-wider">
                        Selected Line {activeIdx + 1}
                      </span>
                      <span className="text-xs text-neutral-300 font-mono">
                        {vStart.toFixed(1)}s → {vEnd.toFixed(1)}s ({(vEnd - vStart).toFixed(1)}s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSeek(vStart)}
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-[#eb0028]" />
                        Play Line
                      </button>
                      <button
                        type="button"
                        onClick={addSubtitleLine}
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        Add Line
                      </button>
                    </div>
                  </div>

                  {/* Subtitle text live editing */}
                  <input
                    type="text"
                    value={targetSub.text}
                    onChange={(e) => updateSubtitle(activeIdx, { text: e.target.value })}
                    placeholder="Type spoken sentence here..."
                    className="w-full bg-[#0d0f17] border border-neutral-700 focus:border-[#eb0028] rounded-xl px-3 py-2 text-xs text-white"
                  />

                  {/* Precision timing adjustment & Snap buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-neutral-400 font-semibold mr-1">Start:</span>
                      <button
                        type="button"
                        onClick={() => nudgeSubtitleLine(activeIdx, -0.2)}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                        title="Shift start 0.2s earlier"
                      >
                        -0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSubtitleLine(activeIdx, -0.1)}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                        title="Shift start 0.1s earlier"
                      >
                        -0.1s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSubtitleLine(activeIdx, 0.1)}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                        title="Shift start 0.1s later"
                      >
                        +0.1s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSubtitleLine(activeIdx, 0.2)}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                        title="Shift start 0.2s later"
                      >
                        +0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnapSubStart(activeIdx)}
                        className="px-2 py-1 rounded bg-[#eb0028]/15 hover:bg-[#eb0028]/25 text-[#eb0028] border border-[#eb0028]/30 text-[10px] font-bold flex items-center gap-1 ml-1 cursor-pointer"
                        title="Set start time to current video playhead"
                      >
                        <Target className="w-3 h-3" />
                        Snap Start ({currentTime.toFixed(1)}s)
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSnapSubEnd(activeIdx)}
                        className="px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Set end time to current video playhead"
                      >
                        <Target className="w-3 h-3" />
                        Snap End ({currentTime.toFixed(1)}s)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeSubtitleLine(activeIdx);
                          setSelectedSubIndex(null);
                        }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition ml-2 cursor-pointer"
                        title="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#181b26] rounded-xl border border-neutral-800 overflow-x-auto">
            <button
              onClick={() => setSidebarTab('trim')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'trim'
                  ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Trim & Sync
            </button>

            <button
              onClick={() => setSidebarTab('subtitles')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'subtitles'
                  ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Subtitles ({subtitles.length})
            </button>

            <button
              onClick={() => setSidebarTab('brand')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'brand'
                  ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Layout & Brand
            </button>

            <button
              onClick={() => setSidebarTab('caption')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'caption'
                  ? 'bg-[#eb0028] text-white shadow-md shadow-[#eb0028]/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Instagram Copy
            </button>
          </div>

          {/* TAB 1: TRIM TIMES & SYNCHRONIZATION TOOLS */}
          {sidebarTab === 'trim' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Precision Timeline Trimmer & Caption Alignment
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Captions stay locked to their spoken video moments when you trim.
                  </span>
                </div>
                <button
                  onClick={handleAutoAlignSubtitles}
                  disabled={isAligning}
                  className="px-3 py-1.5 rounded-lg bg-[#eb0028]/15 hover:bg-[#eb0028]/25 text-[#eb0028] border border-[#eb0028]/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  title="Auto-extract and align subtitles spoken within this exact trimmed window"
                >
                  {isAligning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Re-Align to Trim Window
                </button>
              </div>

                {/* GLOBAL CAPTION TIMING NUDGE / SYNC OFFSET TOOL */}
                <div className="mt-3 p-3 rounded-xl bg-[#151824] border border-neutral-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Gauge className="w-3.5 h-3.5 text-[#eb0028]" />
                      Caption Audio-Sync Offset:
                      <span className={`font-mono px-2 py-0.5 rounded text-xs ${
                        syncOffset === 0
                          ? 'bg-neutral-800 text-neutral-300'
                          : syncOffset > 0
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-yellow-950/80 text-yellow-300 border border-yellow-500/30'
                      }`}>
                        {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}
                      </span>
                    </div>

                    {syncOffset !== 0 && (
                      <button
                        onClick={() => setSyncOffset(0)}
                        className="text-[11px] text-neutral-400 hover:text-white underline"
                      >
                        Reset Offset
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    If speech leads or lags the subtitles, nudge all captions simultaneously forward or backward:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev - 0.5).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev - 0.2).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      -0.2s
                    </button>
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev - 0.1).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      -0.1s
                    </button>
                    <button
                      onClick={() => setSyncOffset(0)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                    >
                      0.0s (Reset)
                    </button>
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev + 0.1).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      +0.1s
                    </button>
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev + 0.2).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      +0.2s
                    </button>
                    <button
                      onClick={() => setSyncOffset((prev) => Number((prev + 0.5).toFixed(1)))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                {/* Dual In & Out Point Adjusters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-[#181b26] border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase">
                        Clip In-Point (Start)
                      </span>
                      <span className="text-sm font-mono font-black text-white">
                        {formatSecs(startTime)} ({startTime.toFixed(1)}s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => nudgeStart(-1.0)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => nudgeStart(-0.1)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        -0.1s
                      </button>
                      <button
                        onClick={() => nudgeStart(+0.1)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => nudgeStart(+1.0)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        +1s
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#181b26] border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase">
                        Clip Out-Point (End)
                      </span>
                      <span className="text-sm font-mono font-black text-white">
                        {formatSecs(endTime)} ({endTime.toFixed(1)}s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => nudgeEnd(-1.0)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => nudgeEnd(-0.1)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        -0.1s
                      </button>
                      <button
                        onClick={() => nudgeEnd(+0.1)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => nudgeEnd(+1.0)}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* TAB 2: BURNED-IN SUBTITLES STUDIO & LINE-BY-LINE TIMING */}
          {sidebarTab === 'subtitles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Burned-In Subtitle Styles & Line Sync
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Click "Set to Playhead" on any line to lock its timing to the exact spoken second.
                  </p>
                </div>
                <button
                  onClick={handleAutoAlignSubtitles}
                  disabled={isAligning}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 border border-neutral-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#eb0028]" />
                  Auto-Align
                </button>
              </div>

              {/* Style Presets: Only TED Classic and TED Red */}
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
                  Style Preset (TED Classic & TED Red)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'ted-classic',
                      label: 'TED Classic',
                      sub: 'Clean white typography on frosted charcoal backing',
                      preview: 'bg-[#0f1118] text-white border-white/20',
                    },
                    {
                      id: 'ted-red',
                      label: 'TED Red',
                      sub: 'Iconic TED crimson (#eb0028) banner with crisp white text',
                      preview: 'bg-[#eb0028] text-white border-transparent',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() =>
                        setSubtitleStyle((prev) => ({
                          ...prev,
                          preset: preset.id as any,
                        }))
                      }
                      className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                        subtitleStyle.preset === preset.id
                          ? 'bg-[#eb0028]/15 border-[#eb0028] shadow-md shadow-[#eb0028]/20'
                          : 'bg-[#181b26] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white block">{preset.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${preset.preview}`}>
                          Aa
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block line-clamp-1">
                        {preset.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography: Helvetica Variants Only */}
              <div className="p-3 rounded-xl bg-[#0f1118] border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase font-bold text-neutral-300">
                    Typography (Helvetica & Variants Only)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Official TED Font
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'helvetica-bold', label: 'Helvetica Neue Bold', desc: 'Heavy 800' },
                    { id: 'helvetica-medium', label: 'Helvetica Medium', desc: 'Medium 600' },
                    { id: 'helvetica-condensed', label: 'Helvetica Condensed', desc: 'Condensed 700' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() =>
                        setSubtitleStyle((prev) => ({
                          ...prev,
                          fontVariant: font.id as any,
                        }))
                      }
                      className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                        subtitleStyle.fontVariant === font.id
                          ? 'bg-[#eb0028]/20 border-[#eb0028] text-white'
                          : 'bg-[#181b26] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold block truncate">{font.label}</span>
                      <span className="text-[10px] text-neutral-500 block">{font.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Size, Position Y, Uppercase */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#0f1118] border border-neutral-800 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Font Size ({subtitleStyle.fontSize}px)
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={48}
                    value={subtitleStyle.fontSize}
                    onChange={(e) =>
                      setSubtitleStyle({ ...subtitleStyle, fontSize: parseInt(e.target.value) })
                    }
                    className="w-full h-1.5 bg-neutral-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Vertical Position ({subtitleStyle.positionY}%)
                  </label>
                  <input
                    type="range"
                    min={55}
                    max={88}
                    value={subtitleStyle.positionY}
                    onChange={(e) =>
                      setSubtitleStyle({ ...subtitleStyle, positionY: parseInt(e.target.value) })
                    }
                    className="w-full h-1.5 bg-neutral-700 rounded-lg accent-[#eb0028]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Capitalization
                  </label>
                  <button
                    onClick={() =>
                      setSubtitleStyle({
                        ...subtitleStyle,
                        textTransform:
                          subtitleStyle.textTransform === 'uppercase' ? 'none' : 'uppercase',
                      })
                    }
                    className={`w-full py-1 px-2 rounded-lg text-xs font-bold border transition ${
                      subtitleStyle.textTransform === 'uppercase'
                        ? 'bg-[#eb0028]/20 border-[#eb0028] text-[#eb0028]'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {subtitleStyle.textTransform === 'uppercase' ? 'ALL CAPS' : 'Sentence Case'}
                  </button>
                </div>
              </div>

              {/* Subtitle Lines Editor with Precision Timing Controls */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {subtitles.map((sub, idx) => {
                  const vStart = sub.videoStart !== undefined ? sub.videoStart : startTime + sub.start;
                  const vEnd = sub.videoEnd !== undefined ? sub.videoEnd : startTime + sub.end;
                  const isCurrent = currentTime >= vStart && currentTime <= vEnd;

                  return (
                    <div
                      key={sub.id || idx}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                        isCurrent
                          ? 'bg-[#1e2333] border-[#eb0028]/70 shadow-md shadow-[#eb0028]/10'
                          : 'bg-[#181b26] border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePlaySubtitle(sub)}
                            className="p-1 rounded bg-[#eb0028]/20 hover:bg-[#eb0028] text-[#eb0028] hover:text-white transition cursor-pointer"
                            title="Play this spoken sentence"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          <span className="font-bold text-neutral-300">Line {idx + 1}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-[#eb0028] text-white text-[9px] font-bold uppercase animate-pulse">
                              Playing Now
                            </span>
                          )}
                        </div>

                        {/* Timing Tools */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSnapSubStart(idx)}
                            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 border border-neutral-700 flex items-center gap-1 transition"
                            title="Set subtitle start to current video playhead"
                          >
                            <Target className="w-2.5 h-2.5 text-yellow-400" />
                            Set Start ({formatSecs(currentTime)})
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSnapSubEnd(idx)}
                            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 border border-neutral-700 flex items-center gap-1 transition"
                            title="Set subtitle end to current video playhead"
                          >
                            <Target className="w-2.5 h-2.5 text-blue-400" />
                            Set End ({formatSecs(currentTime)})
                          </button>

                          <button
                            onClick={() => removeSubtitleLine(idx)}
                            className="text-neutral-500 hover:text-red-400 p-1"
                            title="Delete this subtitle line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Input */}
                      <input
                        type="text"
                        value={sub.text}
                        onChange={(e) => updateSubtitle(idx, { text: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:border-[#eb0028]"
                      />

                      {/* Numeric Timestamps */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Video Time:</span>
                          <input
                            type="number"
                            step={0.1}
                            value={vStart}
                            onChange={(e) =>
                              updateSubtitle(idx, { videoStart: parseFloat(e.target.value) || 0 })
                            }
                            className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1 text-center text-white text-[11px]"
                          />
                          <span>s →</span>
                          <input
                            type="number"
                            step={0.1}
                            value={vEnd}
                            onChange={(e) =>
                              updateSubtitle(idx, { videoEnd: parseFloat(e.target.value) || 0 })
                            }
                            className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1 text-center text-white text-[11px]"
                          />
                          <span>s</span>
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={() => nudgeSubtitleLine(idx, -0.2)}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 font-mono transition"
                              title="Shift this subtitle line 0.2s earlier"
                            >
                              -0.2s
                            </button>
                            <button
                              type="button"
                              onClick={() => nudgeSubtitleLine(idx, 0.2)}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 font-mono transition"
                              title="Shift this subtitle line 0.2s later"
                            >
                              +0.2s
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {(vEnd - vStart).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={addSubtitleLine}
                  className="w-full py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Subtitle Line
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LAYOUT & BRAND OVERLAYS */}
          {sidebarTab === 'brand' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-2">
                  9:16 Video Framing Modes (Strict Options)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'blurred-fit',
                      name: 'Blurred Fit',
                      desc: 'Crisp 16:9 centered with blurred background (Instagram Reels & Shorts standard)',
                    },
                    {
                      id: 'center-crop',
                      name: 'Center Crop',
                      desc: 'Fills entire 9:16 screen focusing dynamically on the speaker',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setVideoSettings((prev) => ({
                          ...prev,
                          layout: mode.id as any,
                        }))
                      }
                      className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                        videoSettings.layout === mode.id
                          ? 'bg-[#eb0028]/15 border-[#eb0028] text-white shadow-md shadow-[#eb0028]/15'
                          : 'bg-[#181b26] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold block text-white">{mode.name}</span>
                        {videoSettings.layout === mode.id && (
                          <span className="w-2 h-2 rounded-full bg-[#eb0028]" />
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 block leading-relaxed">
                        {mode.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hook Headline Customizer */}
              <div className="p-3.5 rounded-xl bg-[#0f1118] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-neutral-300">
                    Hook Headline Banner Text
                  </label>
                  <input
                    type="checkbox"
                    checked={videoSettings.showHeadline}
                    onChange={(e) =>
                      setVideoSettings({ ...videoSettings, showHeadline: e.target.checked })
                    }
                    className="accent-[#eb0028]"
                  />
                </div>
                <input
                  type="text"
                  value={videoSettings.customHeadline}
                  onChange={(e) => {
                    setVideoSettings({ ...videoSettings, customHeadline: e.target.value });
                    setHookTitle(e.target.value);
                  }}
                  placeholder="e.g. THE 10-SECOND MINDSET SHIFT"
                  className="w-full bg-[#181b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Brand Overlays Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  Official Brand Elements
                </label>

                <div className="p-3.5 rounded-xl bg-[#181b26] border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        TEDx Duluth Watermark Logo
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Positioned discreetly in bottom corner (default: disabled)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={videoSettings.showTedLogo}
                      onChange={(e) =>
                        setVideoSettings({ ...videoSettings, showTedLogo: e.target.checked })
                      }
                      className="accent-[#eb0028] w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {videoSettings.showTedLogo && (
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400">Corner Placement:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setVideoSettings({ ...videoSettings, logoPosition: 'bottom-right' })}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            videoSettings.logoPosition !== 'bottom-left'
                              ? 'bg-[#eb0028] text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          Bottom-Right
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoSettings({ ...videoSettings, logoPosition: 'bottom-left' })}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            videoSettings.logoPosition === 'bottom-left'
                              ? 'bg-[#eb0028] text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          Bottom-Left
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#181b26] border border-neutral-800 text-xs cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Animated Progress Bar</span>
                    <span className="text-[10px] text-neutral-400 block">
                      Shows viewer pacing along the bottom edge
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={videoSettings.showProgressBar}
                    onChange={(e) =>
                      setVideoSettings({ ...videoSettings, showProgressBar: e.target.checked })
                    }
                    className="accent-[#eb0028] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-PLATFORM COPY (LINKEDIN, FACEBOOK, INSTAGRAM) WITH 5 HASHTAGS MAX */}
          {sidebarTab === 'caption' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Tailored Social Media Copy
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    LinkedIn, Facebook, and Instagram (Strictly 5 hashtags max)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                    5 Tags Max
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(socialCopies[activeSocialPlatform]);
                      setCopiedSocialPost(true);
                      setTimeout(() => setCopiedSocialPost(false), 2000);
                    }}
                    className="text-xs text-[#eb0028] hover:text-[#ff1a40] font-bold flex items-center gap-1 cursor-pointer bg-[#eb0028]/10 px-2.5 py-1 rounded-lg border border-[#eb0028]/30 transition"
                  >
                    {copiedSocialPost ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Post
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Platform Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#181b26] rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveSocialPlatform('instagram')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSocialPlatform === 'instagram'
                      ? 'bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSocialPlatform('linkedin')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSocialPlatform === 'linkedin'
                      ? 'bg-[#0a66c2] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSocialPlatform('facebook')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSocialPlatform === 'facebook'
                      ? 'bg-[#1877f2] text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Facebook className="w-3.5 h-3.5" />
                  Facebook
                </button>
              </div>

              {/* Editable Text Area for current platform */}
              <div className="relative">
                <textarea
                  value={socialCopies[activeSocialPlatform]}
                  onChange={(e) => {
                    const text = e.target.value;
                    const sanitized = enforceMaxFiveHashtags(text);
                    setSocialCopies((prev) => ({
                      ...prev,
                      [activeSocialPlatform]: sanitized,
                    }));
                    setSocialCaption(sanitized);
                  }}
                  rows={8}
                  className="w-full bg-[#181b26] border border-neutral-700 focus:border-[#eb0028] rounded-xl p-3.5 text-xs text-neutral-200 leading-relaxed font-sans whitespace-pre-line"
                />
              </div>

              {/* 5 Official Hashtags Pills */}
              <div className="p-3 rounded-xl bg-[#0f1118] border border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-semibold text-neutral-300">Curated Hashtag Set (5 Max):</span>
                  <span className="text-emerald-400 font-mono text-[10px]">5/5 Allowed</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['#TEDxDuluth', '#IdeasWorthSpreading', '#Innovation', '#Leadership', '#Resilience'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[#181b26] border border-neutral-700 text-[10px] font-mono text-[#eb0028] font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Save Details directly to Library without re-rendering */}
              {editingSavedClip && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleQuickSaveDetails}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Save Caption Changes to Finished Clip (No Re-Render)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Saved Toast */}
      {savedDetailsToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-950 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-2xl animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Finished Clip details successfully updated in Library!</span>
        </div>
      )}

      {/* RENDER PROGRESS MODAL */}
      {isRendering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="max-w-md w-full bg-[#14161f] border border-[#eb0028]/40 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#eb0028]/20 text-[#eb0028] flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Scissors className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white mb-1">
              Rendering Vertical Video File
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              {renderStatus || 'Generating 9:16 vertical video with synchronized burned-in subtitles...'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden mb-2">
              <div
                className="bg-[#eb0028] h-full transition-all duration-300 rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <div className="text-right text-xs font-mono text-neutral-400">
              {renderProgress}%
            </div>

            <p className="text-[11px] text-neutral-500 mt-4">
              Your browser is burning typography, branding, and synced audio directly into the clip. The download will start automatically.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
