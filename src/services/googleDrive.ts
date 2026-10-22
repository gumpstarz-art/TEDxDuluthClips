/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleDriveFile } from '../types';

// Reuse existing Firebase app or initialize once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// All Google Drive scopes configured for the app
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token storage (Security rule: never persist in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize auth listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In Popup with Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Search and list video files from user's Google Drive
 */
export const listDriveVideos = async (
  searchQuery?: string
): Promise<GoogleDriveFile[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in to Google Drive first.');
  }

  // Look for video mimeTypes or common video file extensions
  let q = "trashed = false and (mimeType contains 'video/' or name contains '.mp4' or name contains '.mov' or name contains '.webm' or name contains '.mkv')";
  if (searchQuery && searchQuery.trim()) {
    const sanitized = searchQuery.trim().replace(/['\\]/g, '');
    q += ` and name contains '${sanitized}'`;
  }

  const params = new URLSearchParams({
    q,
    pageSize: '40',
    fields: 'files(id, name, mimeType, size, iconLink, thumbnailLink, modifiedTime, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to fetch Google Drive files (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []) as GoogleDriveFile[];
};

/**
 * Download a video file from Google Drive as a local Blob with progress
 */
export const downloadDriveVideo = async (
  fileId: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<{ blobUrl: string; file: File }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in to Google Drive first.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video from Drive (${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (response.body && totalBytes > 0 && onProgress) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(pct);
      }
    }

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const file = new File([blob], fileName, { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, file };
  } else {
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });
    const blobUrl = URL.createObjectURL(blob);
    if (onProgress) onProgress(100);
    return { blobUrl, file };
  }
};

/**
 * Upload a rendered 9:16 clip to user's Google Drive
 */
export const uploadClipToDrive = async (
  videoBlob: Blob,
  fileName: string,
  description?: string
): Promise<{ fileId: string; webViewLink?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in to Google Drive first.');
  }

  const metadata = {
    name: fileName,
    mimeType: videoBlob.type || 'video/webm',
    description: description || 'TEDxDuluth 9:16 Social Video Clip',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', videoBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to upload to Google Drive (${res.status})`);
  }

  const data = await res.json();
  return { fileId: data.id, webViewLink: data.webViewLink };
};
