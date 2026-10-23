/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { TalkIngest } from './components/TalkIngest';
import { AIHighlights } from './components/AIHighlights';
import { ClipStudio } from './components/ClipStudio';
import { SavedLibrary } from './components/SavedLibrary';
import { PublishModal } from './components/PublishModal';
import { TeamMember, TalkProject, HighlightClip, SavedClip } from './types';
import { UploadCloud, Scissors } from 'lucide-react';

export default function App() {
  // Authentication state
  const [teamMember, setTeamMember] = useState<TeamMember | null>(() => {
    try {
      const saved = localStorage.getItem('tedx_duluth_member');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<'ingest' | 'highlights' | 'studio' | 'library'>('ingest');

  // Active Project (starts empty as requested by user)
  const [currentProject, setCurrentProject] = useState<TalkProject | null>(null);

  // Active clip currently loaded in Clip Studio
  const [activeClip, setActiveClip] = useState<HighlightClip | null>(null);

  // Finished clip currently loaded for re-editing in Clip Studio
  const [editingSavedClip, setEditingSavedClip] = useState<SavedClip | null>(null);

  // Saved Clips Library (persisted in localStorage)
  const [savedClips, setSavedClips] = useState<SavedClip[]>(() => {
    try {
      const saved = localStorage.getItem('tedx_duluth_saved_clips');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Publish Modal
  const [publishingClip, setPublishingClip] = useState<SavedClip | null>(null);

  // Persist team member
  const handleLoginSuccess = (member: TeamMember) => {
    setTeamMember(member);
    localStorage.setItem('tedx_duluth_member', JSON.stringify(member));
  };

  const handleLogout = () => {
    setTeamMember(null);
    localStorage.removeItem('tedx_duluth_member');
  };

  // Persist saved clips
  const handleSaveClip = (newClip: SavedClip) => {
    setSavedClips((prev) => {
      const updated = [newClip, ...prev];
      localStorage.setItem('tedx_duluth_saved_clips', JSON.stringify(updated));
      return updated;
    });
    setEditingSavedClip(null);
  };

  const handleUpdateClip = (updatedClip: SavedClip) => {
    setSavedClips((prev) => {
      const updated = prev.map((c) => (c.id === updatedClip.id ? updatedClip : c));
      localStorage.setItem('tedx_duluth_saved_clips', JSON.stringify(updated));
      return updated;
    });
    if (editingSavedClip?.id === updatedClip.id) {
      setEditingSavedClip(updatedClip);
    }
  };

  const handleDeleteClip = (id: string) => {
    setSavedClips((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('tedx_duluth_saved_clips', JSON.stringify(updated));
      return updated;
    });
    if (editingSavedClip?.id === id) {
      setEditingSavedClip(null);
    }
  };

  const handleUpdateStatus = (id: string, status: 'Ready' | 'Scheduled' | 'Published') => {
    setSavedClips((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, status } : c));
      localStorage.setItem('tedx_duluth_saved_clips', JSON.stringify(updated));
      return updated;
    });
  };

  // Switch to clip studio for a selected highlight
  const handleSelectHighlightForEdit = (clip: HighlightClip) => {
    setEditingSavedClip(null);
    setActiveClip(clip);
    setActiveTab('studio');
  };

  // Re-edit finished clip in Clip Studio
  const handleEditSavedClipInStudio = (clip: SavedClip) => {
    setEditingSavedClip(clip);

    // If currentProject doesn't exist or is for a different talk, reconstruct/adapt project
    if (!currentProject || currentProject.title !== clip.talkTitle) {
      const fallbackProject: TalkProject = {
        id: clip.talkProjectId || `project-${clip.id}`,
        title: clip.talkTitle,
        speaker: clip.speaker,
        event: 'TEDxDuluth',
        videoUrl: clip.videoBlobUrl || '',
        duration: Math.max(clip.duration + clip.startTime, 60),
        transcript: clip.subtitles?.map((s) => s.text).join('\n') || '',
        highlights: [],
        createdAt: clip.createdAt,
      };
      setCurrentProject(fallbackProject);
    }

    // Convert SavedClip to HighlightClip structure for activeClip
    const clipAsHighlight: HighlightClip = {
      id: clip.id,
      hookTitle: clip.title,
      summary: clip.talkTitle,
      startTime: clip.startTime,
      endTime: clip.endTime,
      duration: clip.duration,
      viralityScore: 95,
      hookFactor: 'Saved Finished Clip',
      bestPlatform: clip.platform === 'All' ? 'Instagram Reels' : (clip.platform as any),
      subtitles: clip.subtitles || [],
      socialCaption: clip.socialCaption,
      socialCopies: clip.socialCopies,
    };

    setActiveClip(clipAsHighlight);
    setActiveTab('studio');
  };

  // Talk loaded from ingest
  const handleTalkLoaded = (talk: TalkProject) => {
    setEditingSavedClip(null);
    setCurrentProject(talk);
    if (talk.highlights && talk.highlights.length > 0) {
      setActiveClip(talk.highlights[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f1f2f6] flex flex-col font-sans selection:bg-[#eb0028] selection:text-white">
      {/* Team Login Modal (blocking if not authenticated) */}
      <LoginModal
        isOpen={!teamMember}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main App Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        teamMember={teamMember}
        onLogout={handleLogout}
        activeProject={currentProject}
        savedClipsCount={savedClips.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'ingest' && (
          <TalkIngest
            onTalkLoaded={handleTalkLoaded}
            onProceedToHighlights={() => setActiveTab('highlights')}
            currentProject={currentProject}
          />
        )}

        {activeTab === 'highlights' && (
          currentProject ? (
            <AIHighlights
              project={currentProject}
              onSelectHighlightForEdit={handleSelectHighlightForEdit}
              onBackToSource={() => setActiveTab('ingest')}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-[#13151e] border border-neutral-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#eb0028]/10 text-[#eb0028] flex items-center justify-center mx-auto">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">No Talk Uploaded Yet</h3>
              <p className="text-sm text-neutral-400">
                Please upload your talk's video file or paste the YouTube link first so our AI engine can identify key highlights.
              </p>
              <button
                onClick={() => setActiveTab('ingest')}
                className="px-5 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#d40024] text-white text-xs font-bold transition shadow-lg shadow-[#eb0028]/25"
              >
                Go to Step 1: Upload Talk Video
              </button>
            </div>
          )
        )}

        {activeTab === 'studio' && (
          currentProject ? (
            <ClipStudio
              project={currentProject}
              activeClip={activeClip}
              editingSavedClip={editingSavedClip}
              onClipSaved={handleSaveClip}
              onClipUpdated={handleUpdateClip}
              onCancelEdit={() => setEditingSavedClip(null)}
              onNavigateToLibrary={() => setActiveTab('library')}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-[#13151e] border border-neutral-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#eb0028]/10 text-[#eb0028] flex items-center justify-center mx-auto">
                <Scissors className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">No Active Clip Loaded</h3>
              <p className="text-sm text-neutral-400">
                Upload your TEDxDuluth video file in Step 1 to trim, adjust subtitle timing, and render vertical clips.
              </p>
              <button
                onClick={() => setActiveTab('ingest')}
                className="px-5 py-2.5 rounded-xl bg-[#eb0028] hover:bg-[#d40024] text-white text-xs font-bold transition shadow-lg shadow-[#eb0028]/25"
              >
                Go to Step 1: Upload Video
              </button>
            </div>
          )
        )}

        {activeTab === 'library' && (
          <SavedLibrary
            savedClips={savedClips}
            onDeleteClip={handleDeleteClip}
            onUpdateStatus={handleUpdateStatus}
            onSelectForPublish={(clip) => setPublishingClip(clip)}
            onEditClipInStudio={handleEditSavedClipInStudio}
            onUpdateClip={handleUpdateClip}
          />
        )}
      </main>

      {/* Publish to Socials Modal */}
      <PublishModal
        clip={publishingClip}
        onClose={() => setPublishingClip(null)}
        onMarkPublished={(id) => handleUpdateStatus(id, 'Published')}
      />

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-900 bg-[#08090d] text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png"
              alt="TEDxDuluth"
              className="h-5 w-auto object-contain"
            />
            <span>• Digital Media & Socials Suite</span>
          </div>
          <div className="text-[11px] text-neutral-500">
            This independent TEDx event is operated under license from TED.
          </div>
        </div>
      </footer>
    </div>
  );
}
