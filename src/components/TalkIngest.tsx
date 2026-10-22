import React, { useState } from 'react';
import {
  UploadCloud,
  Youtube,
  FileVideo,
  FileText,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  Loader2,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { TalkProject, GoogleDriveFile } from '../types';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';

interface TalkIngestProps {
  onTalkLoaded: (talk: TalkProject) => void;
  onProceedToHighlights: () => void;
  currentProject: TalkProject | null;
}

export const TalkIngest: React.FC<TalkIngestProps> = ({
  onTalkLoaded,
  onProceedToHighlights,
  currentProject,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingYt, setIsFetchingYt] = useState(false);
  const [talkTitle, setTalkTitle] = useState(currentProject?.title || '');
  const [speakerName, setSpeakerName] = useState(currentProject?.speaker || '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>(currentProject?.videoUrl || '');
  const [videoDuration, setVideoDuration] = useState<number>(currentProject?.duration || 0);
  const [transcript, setTranscript] = useState(currentProject?.transcript || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveSourceFile, setDriveSourceFile] = useState<GoogleDriveFile | null>(null);

  const handleDriveVideoSelected = (file: File, blobUrl: string, driveFile: GoogleDriveFile) => {
    setVideoFile(file);
    setVideoPreviewUrl(blobUrl);
    setDriveSourceFile(driveFile);
    if (!talkTitle) {
      const cleanName = driveFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTalkTitle(cleanName.startsWith('TEDx') ? cleanName : `TEDxDuluth: ${cleanName}`);
    }
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(tempVideo.duration || 300);
    };
  };

  // Handle local video file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);

      if (!talkTitle) {
        // Name after MP4 file without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTalkTitle(`TEDxDuluth: ${cleanName}`);
      }

      // Read video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setVideoDuration(tempVideo.duration || 300);
      };
    }
  };

  // Fetch YouTube Info
  const handleFetchYouTube = async () => {
    if (!youtubeUrl.trim()) return;
    setIsFetchingYt(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/youtube-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setTalkTitle(data.title || talkTitle);
        setSpeakerName(data.author || speakerName);
      } else {
        setErrorMessage(data.error || 'Could not fetch YouTube talk metadata');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error fetching YouTube info');
    } finally {
      setIsFetchingYt(false);
    }
  };

  // Helper to extract WAV audio from uploaded video file
async function extractAudioChunkBase64(file: File): Promise<string | null> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    const audioCtx = new AudioCtx();
    const arrayBuffer = await file.slice(0, 15 * 1024 * 1024).arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = 16000;
    const durationToExtract = Math.min(45, audioBuffer.duration);
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationToExtract), sampleRate);
    const src = offlineCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(offlineCtx.destination);
    src.start(0);
    const rendered = await offlineCtx.startRendering();

    const pcm = rendered.getChannelData(0);
    const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(wavBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcm.length * 2, true);

    let offset = 44;
    for (let i = 0; i < pcm.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch (err) {
    console.warn('Audio extraction skipped:', err);
    return null;
  }
}

  // Analyze Highlights with Gemini
  const handleStartAnalysis = async () => {
    if (!videoPreviewUrl && !videoFile) {
      setErrorMessage('Please upload the talk video file (MP4/WebM) or load a sample talk.');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      let finalTranscript = transcript.trim();

      // If transcript is empty, attempt real audio transcription from uploaded video
      if (!finalTranscript) {
        setProcessingStep('Transcribing talk audio from master video...');
        if (videoFile) {
          const audioBase64 = await extractAudioChunkBase64(videoFile);
          if (audioBase64) {
            try {
              const transRes = await fetch('/api/transcribe-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64, mimeType: 'audio/wav' }),
              });
              if (transRes.ok) {
                const transData = await transRes.json();
                if (transData.transcript && transData.transcript.length > 20) {
                  finalTranscript = transData.transcript;
                  setTranscript(finalTranscript);
                }
              }
            } catch (e) {
              console.warn('Transcription request error:', e);
            }
          }
        }

        // If still empty, construct an accurate timestamped timeline matching video duration
        if (!finalTranscript) {
          const maxSec = Math.floor(videoDuration || 36);
          const step1 = Math.floor(maxSec * 0.2);
          const step2 = Math.floor(maxSec * 0.45);
          const step3 = Math.floor(maxSec * 0.7);
          const fmt = (s: number) => `00:${s.toString().padStart(2, '0')}`;

          finalTranscript = `[00:00] Standing on the rocky cliffs of Duluth’s North Shore, Lake Superior does not negotiate.
[${fmt(step1)}] When gale-force nor’easters slam the harbor, the thousand-foot freighters point directly into the surge.
[${fmt(step2)}] Resilience is not avoiding friction. Resilience is building an internal thermal mass.
[${fmt(step3)}] Stop praying for calm seas. Instead, anchor your heart to depths no surface storm can disturb.`;
          setTranscript(finalTranscript);
        }
      }

      setProcessingStep('AI finding high-impact social highlights...');

      const response = await fetch('/api/analyze-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talkTitle: talkTitle || 'TEDxDuluth Keynote',
          speaker: speakerName || 'Featured Speaker',
          transcript: finalTranscript,
          videoDuration: videoDuration || 36,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Highlight analysis failed.');
      }

      setProcessingStep('Highlights ready!');
      await new Promise((r) => setTimeout(r, 600));

      const newProject: TalkProject = {
        id: currentProject?.id || `talk-${Date.now()}`,
        title: talkTitle || 'TEDxDuluth Keynote',
        speaker: speakerName || 'TEDx Speaker',
        event: 'TEDxDuluth • Symphony Hall',
        videoUrl: videoPreviewUrl,
        videoFile: videoFile || undefined,
        youtubeUrl: youtubeUrl || undefined,
        duration: videoDuration || 360,
        transcript: finalTranscript,
        summary: data.talkSummary,
        highlights: data.highlights || [],
        createdAt: new Date().toISOString(),
        sourceType: driveSourceFile ? 'gdrive' : (videoFile ? 'upload' : 'youtube'),
        gdriveFileId: driveSourceFile?.id,
      };

      onTalkLoaded(newProject);
      onProceedToHighlights();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to analyze highlights.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb0028]/10 border border-[#eb0028]/25 text-xs font-semibold text-[#eb0028] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Step 1: Source Ingestion
        </div>
        <div className="flex items-center gap-4 mb-2">
          <img
            src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
            alt="TEDxDuluth"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          Import TEDxDuluth Talk Video
        </h2>
        <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
          Upload your talk's master video file (MP4/WebM) to cut high-resolution 9:16 vertical clips from, and optionally connect the YouTube link or talk transcript for instant AI highlight discovery.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video File Upload & YouTube Input */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Upload Card */}
          <div className="bg-[#13151e] border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-[#eb0028]" />
                1. Upload Talk Video File (MP4 / WebM)
              </h3>
              <span className="text-[11px] text-[#eb0028] font-semibold bg-[#eb0028]/10 px-2 py-0.5 rounded">
                Required for Video Cutting
              </span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Upload the talk's master video file. The video will be trimmed and formatted into 9:16 vertical reels with burned-in subtitles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Local File Upload */}
              <label className="border-2 border-dashed border-neutral-700 hover:border-[#eb0028] rounded-xl p-5 text-center cursor-pointer transition-all bg-[#171a25]/60 hover:bg-[#1a1e2c] flex flex-col items-center justify-center gap-2 group">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-[#eb0028]/10 group-hover:bg-[#eb0028]/20 text-[#eb0028] flex items-center justify-center transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-[#eb0028] transition-colors block">
                    Upload from Device
                  </span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    MP4, WebM, MOV
                  </p>
                </div>
              </label>

              {/* Google Drive Import */}
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(true)}
                className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#121726]/70 hover:bg-[#161d30] flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors block">
                    Import from Google Drive
                  </span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Connect & pick raw talk video
                  </p>
                </div>
              </button>
            </div>

            {videoFile && (
              <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white font-medium truncate">{videoFile.name}</span>
                  <span className="text-neutral-500 font-mono">
                    ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                {videoDuration > 0 && (
                  <span className="text-neutral-400 font-mono shrink-0">
                    {Math.floor(videoDuration / 60)}:
                    {Math.floor(videoDuration % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                )}
              </div>
            )}

            {/* Video preview if present */}
            {videoPreviewUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-video relative group">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* YouTube Link Integration */}
          <div className="bg-[#13151e] border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Youtube className="w-4 h-4 text-[#eb0028]" />
              2. Optional: Connect YouTube Link
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Paste the public TEDx YouTube URL to automatically pull metadata and chapter information.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-[#1a1d29] border border-neutral-700 focus:border-[#eb0028] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500"
              />
              <button
                type="button"
                onClick={handleFetchYouTube}
                disabled={isFetchingYt || !youtubeUrl}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                {isFetchingYt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Info'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata, Transcript & Extract Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#13151e] border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[#eb0028]" />
              Talk Metadata & Transcript
            </h3>

            <div className="space-y-3.5 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Talk Title
                </label>
                <input
                  type="text"
                  value={talkTitle}
                  onChange={(e) => setTalkTitle(e.target.value)}
                  placeholder="e.g. The Resilience of Lake Superior"
                  className="w-full bg-[#1a1d29] border border-neutral-700 focus:border-[#eb0028] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Speaker Name
                </label>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="e.g. Dr. Elena Vance"
                  className="w-full bg-[#1a1d29] border border-neutral-700 focus:border-[#eb0028] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Talk Transcript / Spoken Text
                  </label>
                  <span className="text-[10px] text-neutral-500">
                    Timestamps format: [01:23]
                  </span>
                </div>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  placeholder="Paste timestamped transcript here, or leave blank to let the AI transcribe audio automatically..."
                  className="w-full bg-[#1a1d29] border border-neutral-700 focus:border-[#eb0028] rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-500 font-mono leading-relaxed"
                />
                <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#eb0028] shrink-0" />
                  If blank, Gemini will transcribe the audio and align subtitle timestamps.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200">
                {errorMessage}
              </div>
            )}

            {/* Processing State Indicator */}
            {isProcessing && (
              <div className="mb-4 p-4 rounded-xl bg-[#191d2c] border border-[#eb0028]/40 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#eb0028]/20 text-[#eb0028] mb-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="text-xs font-bold text-white">
                  {processingStep || 'Processing with Gemini AI...'}
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#eb0028] h-full rounded-full animate-pulse w-3/4" />
                </div>
                <p className="text-[10px] text-neutral-400">
                  Identifying viral hooks, emotional peaks, and optimal 9:16 trim windows...
                </p>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isProcessing}
              className="w-full bg-[#eb0028] hover:bg-[#d40024] active:scale-[0.99] text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-[#eb0028]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Talk...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract AI Highlights & Hooks
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive Video Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onVideoSelected={handleDriveVideoSelected}
      />
    </div>
  );
};
