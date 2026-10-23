export interface SubtitleLine {
  id?: string;
  start: number; // offset in seconds relative to clip start (e.g. 0.0)
  end: number; // offset in seconds relative to clip start (e.g. 4.5)
  videoStart?: number; // absolute timestamp in master video (e.g. 28.0)
  videoEnd?: number; // absolute timestamp in master video (e.g. 32.5)
  text: string;
}

export interface SocialCopySet {
  instagram: string;
  linkedin: string;
  facebook: string;
}

export interface HighlightClip {
  id: string;
  hookTitle: string;
  summary: string;
  startTime: number; // in talk
  endTime: number; // in talk
  duration: number;
  viralityScore: number;
  hookFactor: string;
  bestPlatform: 'Instagram Reels' | 'TikTok' | 'YouTube Shorts';
  subtitles: SubtitleLine[];
  socialCaption: string;
  socialCopies?: SocialCopySet;
}

export interface TalkProject {
  id: string;
  title: string;
  speaker: string;
  event: string;
  videoUrl?: string; // object URL or local / remote URL
  videoFile?: File;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  duration: number; // total duration in seconds
  transcript: string;
  highlights: HighlightClip[];
  summary?: string;
  createdAt: string;
  sourceType?: 'upload' | 'gdrive' | 'youtube';
  gdriveFileId?: string;
}

export interface SubtitleStyle {
  preset: 'ted-classic' | 'ted-red';
  fontVariant: 'helvetica-bold' | 'helvetica-medium' | 'helvetica-condensed';
  fontSize: number; // 24 to 48
  positionY: number; // 0 to 100 percentage from top (default ~82%)
  textTransform: 'uppercase' | 'none';
  highlightColor: string;
  showBackgroundBox: boolean;
  boxColor: string;
}

export interface VideoSettings {
  aspectRatio: '9:16';
  layout: 'blurred-fit' | 'center-crop';
  showTedLogo: boolean;
  logoPosition?: 'bottom-right' | 'bottom-left';
  showHeadline: boolean;
  customHeadline: string;
  showProgressBar: boolean;
  resolution: '720x1280' | '1080x1920';
}

export interface SavedClip {
  id: string;
  title: string;
  talkTitle: string;
  speaker: string;
  duration: number;
  startTime: number;
  endTime: number;
  videoBlobUrl?: string;
  thumbnailDataUrl?: string;
  socialCaption: string;
  socialCopies?: SocialCopySet;
  platform: 'Instagram Reels' | 'TikTok' | 'YouTube Shorts' | 'All';
  status: 'Ready' | 'Scheduled' | 'Published';
  createdAt: string;
  subtitlePreset: string;
  layout: string;
  driveExportedUrl?: string;
  subtitles?: SubtitleLine[];
  syncOffset?: number;
  subtitleStyle?: SubtitleStyle;
  videoSettings?: VideoSettings;
  talkProjectId?: string;
}

export interface TeamMember {
  name: string;
  email?: string;
  role: string;
  team: string;
  avatar: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  iconLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  webViewLink?: string;
}
