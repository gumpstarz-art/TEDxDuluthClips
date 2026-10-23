/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { TeamMember } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (member: TeamMember) => void;
}

const REQUIRED_USERNAME = 'info@tedxduluth.com';
const REQUIRED_PASSWORD = 'LSTED25rocks25!!';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      // 1. Try server verification first
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUser,
            email: cleanUser,
            password: cleanPass,
          }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          const member: TeamMember = {
            name: data.user.name || 'TEDxDuluth Official',
            email: data.user.email || REQUIRED_USERNAME,
            role: data.user.role || 'Digital Media & Socials Admin',
            team: 'TEDxDuluth Digital Media',
            avatar: '/assets/aistudio/PFP_USE_ONLY_TEDxDuluth_Small_Logo_Black_2139462a.png',
          };
          onLoginSuccess(member);
          setIsLoading(false);
          return;
        }
      } catch (networkErr) {
        // Fallback to client-side verification if server request fails
        console.warn('Backend login check failed, verifying client-side credentials:', networkErr);
      }

      // 2. Direct client-side credential verification
      if (
        (cleanUser === REQUIRED_USERNAME.toLowerCase() ||
          cleanUser === 'info' ||
          cleanUser === 'tedxduluth') &&
        cleanPass === REQUIRED_PASSWORD
      ) {
        const member: TeamMember = {
          name: 'TEDxDuluth Official',
          email: REQUIRED_USERNAME,
          role: 'Digital Media & Socials Admin',
          team: 'TEDxDuluth Digital Media',
          avatar: '/assets/aistudio/PFP_USE_ONLY_TEDxDuluth_Small_Logo_Black_2139462a.png',
        };
        onLoginSuccess(member);
      } else {
        setError('Invalid credentials. Please enter info@tedxduluth.com and the correct team password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#13151b] border border-[#eb0028]/35 rounded-2xl p-6 sm:p-8 shadow-2xl text-white shadow-black/80">
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#eb0028]/20 blur-3xl pointer-events-none rounded-full" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Sign-In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Username / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="info@tedxduluth.com"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-[#0b0c10] border border-neutral-700 focus:border-[#eb0028] focus:ring-1 focus:ring-[#eb0028] rounded-xl text-sm text-white placeholder-neutral-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-[#0b0c10] border border-neutral-700 focus:border-[#eb0028] focus:ring-1 focus:ring-[#eb0028] rounded-xl text-sm text-white placeholder-neutral-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-[#eb0028] hover:bg-[#c90022] active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#eb0028]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to TEDxDuluth</span>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authorized TEDxDuluth Team Portal</span>
        </div>
      </div>
    </div>
  );
};
