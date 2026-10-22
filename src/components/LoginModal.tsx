/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { TeamMember } from '../types';
import { googleSignIn } from '../services/googleDrive';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (member: TeamMember) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await googleSignIn();
      if (result && result.user) {
        const u = result.user;
        const member: TeamMember = {
          name: u.displayName || u.email?.split('@')[0] || 'TEDxDuluth Team Member',
          email: u.email || 'info@tedxduluth.com',
          role: 'TEDxDuluth Team',
          team: 'TEDxDuluth Digital Media',
          avatar: u.photoURL || '🔴',
        };
        onLoginSuccess(member);
      } else {
        setError('Google sign-in could not be completed. Please try again.');
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed. Please click below to try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(err.message || 'Unable to connect to Google account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestBypass = () => {
    onLoginSuccess({
      name: 'TEDxDuluth Team',
      email: 'info@tedxduluth.com',
      role: 'TEDxDuluth Team',
      team: 'TEDxDuluth Digital Media',
      avatar: '🔴',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#13151b] border border-[#eb0028]/35 rounded-2xl p-6 sm:p-8 shadow-2xl text-white shadow-black/80">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#eb0028]/20 blur-3xl pointer-events-none rounded-full" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Social Media & Short-Form Video Suite
          </p>
        </div>

        {/* Access Description */}
        <div className="mb-6 p-4 rounded-xl bg-[#171a25] border border-neutral-800 text-center">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Sign in with your Google account to access clip trimming, AI transcript highlighting, and Google Drive upload integration.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 active:scale-[0.99] text-neutral-800 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#eb0028]" />
                <span className="text-neutral-700">Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Official Google G Logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Fallback Bypass */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleGuestBypass}
              className="text-xs text-neutral-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto py-1"
            >
              <span>Continue as Offline Guest</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
