/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  HardDrive,
  RefreshCw,
  Video,
  CheckCircle2,
  Loader2,
  Calendar,
  Database,
  ExternalLink,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import {
  googleSignIn,
  googleSignOut,
  listDriveVideos,
  downloadDriveVideo,
  getCurrentUser,
  getAccessToken,
} from '../services/googleDrive';
import { GoogleDriveFile } from '../types';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoSelected: (file: File, blobUrl: string, driveFile: GoogleDriveFile) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onVideoSelected,
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check auth state on mount / open
  useEffect(() => {
    if (!isOpen) return;
    const checkAuth = async () => {
      const token = await getAccessToken();
      const user = getCurrentUser();
      if (token && user) {
        setIsSignedIn(true);
        setCurrentUserEmail(user.email || 'Connected User');
        fetchFiles();
      } else {
        setIsSignedIn(false);
        setCurrentUserEmail(null);
      }
    };
    checkAuth();
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsSignedIn(true);
        setCurrentUserEmail(result.user.email);
        await fetchFiles();
      }
    } catch (err: any) {
      console.error('Drive sign in error:', err);
      setAuthError(err.message || 'Could not sign in with Google');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setIsSignedIn(false);
    setCurrentUserEmail(null);
    setFiles([]);
  };

  const fetchFiles = async (query?: string) => {
    setIsLoadingFiles(true);
    setLoadError(null);
    try {
      const driveFiles = await listDriveVideos(query);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Fetch Drive videos error:', err);
      setLoadError(err.message || 'Unable to load videos from Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(searchQuery);
  };

  const handleSelectAndDownload = async (fileItem: GoogleDriveFile) => {
    setSelectedFileId(fileItem.id);
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const { file, blobUrl } = await downloadDriveVideo(
        fileItem.id,
        fileItem.name,
        (pct) => setDownloadProgress(pct)
      );
      onVideoSelected(file, blobUrl, fileItem);
      onClose();
    } catch (err: any) {
      console.error('Download video from Drive failed:', err);
      alert(`Failed to import video from Google Drive: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
      setSelectedFileId(null);
      setDownloadProgress(null);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#11131a] border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-[#151822]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Import from Google Drive</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Select your raw TEDx talk video directly from your Google Drive files.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!isSignedIn ? (
            /* Sign In Prompt with official Google Button styling */
            <div className="py-12 px-4 text-center space-y-5 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#1e2333] border border-neutral-700 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <HardDrive className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1.5">
                  Connect Your Google Drive
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sign in with your Google account to browse, select, and import video recordings of your TEDxDuluth talks directly into the studio.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Official Google Sign-In Button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white text-neutral-800 hover:bg-neutral-100 font-semibold text-xs transition shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-4 h-4 shrink-0"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isAuthenticating ? 'Connecting to Google Drive...' : 'Sign in with Google'}
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-neutral-500">
                Access is read-only for selected videos. Token is securely managed in memory.
              </p>
            </div>
          ) : (
            /* Signed In: File Browser */
            <div className="space-y-4">
              {/* Connected user bar */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#171a25] border border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-neutral-400">Connected:</span>
                  <span className="text-white font-medium">{currentUserEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-neutral-500 hover:text-red-400 flex items-center gap-1 transition text-[11px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              {/* Search & Refresh */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos in your Drive..."
                    className="w-full bg-[#181b26] border border-neutral-700 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingFiles}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => fetchFiles(searchQuery)}
                  disabled={isLoadingFiles}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </form>

              {loadError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
                  {loadError}
                </div>
              )}

              {/* File list */}
              {isLoadingFiles ? (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                  <p className="text-xs">Searching your Google Drive for videos...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <Video className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-xs font-semibold text-neutral-300">No video files found</p>
                  <p className="text-[11px] text-neutral-500">
                    Try searching for another keyword or upload an MP4/WebM to your Google Drive.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {files.map((file) => {
                    const isCurrentDownloading = isDownloading && selectedFileId === file.id;

                    return (
                      <div
                        key={file.id}
                        className="p-3 bg-[#131620] hover:bg-[#181d2a] flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate" title={file.name}>
                              {file.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{formatDate(file.modifiedTime)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAndDownload(file)}
                            disabled={isDownloading}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-600/30"
                          >
                            {isCurrentDownloading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{downloadProgress !== null ? `${downloadProgress}%` : 'Importing...'}</span>
                              </>
                            ) : (
                              <span>Import Video</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#13151f] flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Drive API v3</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
