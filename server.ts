import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// TEDxDuluth Official Shared Team Account Credentials
const OFFICIAL_TEAM_EMAIL = 'info@tedxduluth.com';
const OFFICIAL_TEAM_PASSWORD = 'LSTED25rocks25!!';

// TEDxDuluth Team passcodes and allowed logins
const TEAM_CREDENTIALS = [
  { code: 'TEDxDULUTH', name: 'TEDxDuluth Social Lead', role: 'Social Media Producer' },
  { code: 'DULUTH2025', name: 'Video Team Lead', role: 'Senior Video Editor' },
  { code: 'IDEASWORTHSPREADING', name: 'Duluth Content Creator', role: 'Content Creator' },
  { code: 'STAGE1', name: 'TEDx Production Tech', role: 'Stage & Media Tech' },
];

// Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, username, password, passcode, name, role } = req.body;

  const cleanUser = (email || username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  // 1. Check official shared team account: info@tedxduluth.com / LSTED25rocks25!!
  if (
    (cleanUser === OFFICIAL_TEAM_EMAIL || cleanUser === 'info' || cleanUser === 'tedxduluth') &&
    cleanPassword === OFFICIAL_TEAM_PASSWORD
  ) {
    return res.json({
      success: true,
      token: `tedx_duluth_official_${Date.now()}`,
      user: {
        name: name?.trim() || 'TEDxDuluth Official',
        email: OFFICIAL_TEAM_EMAIL,
        role: role || 'Digital Media & Socials Admin',
        team: 'TEDxDuluth Digital Media',
        avatar: '🔴',
      },
    });
  }

  // 2. Backward compatibility with passcode check
  const cleanCode = (passcode || '').trim().toUpperCase();
  const found = TEAM_CREDENTIALS.find(c => c.code.toUpperCase() === cleanCode);
  if (found || cleanCode === 'TEDX' || cleanCode === 'DULUTH' || cleanPassword === OFFICIAL_TEAM_PASSWORD) {
    const member = found || {
      code: cleanCode,
      name: name?.trim() || 'TEDxDuluth Team Member',
      role: role || 'Social Media Producer',
    };
    return res.json({
      success: true,
      token: `tedx_duluth_${Date.now()}`,
      user: {
        name: name?.trim() || member.name,
        email: OFFICIAL_TEAM_EMAIL,
        role: role || member.role,
        team: 'TEDxDuluth Digital Media',
        avatar: '🔴',
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Please sign in with info@tedxduluth.com and the official team password.',
  });
});

// System health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    geminiReady: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});



// Extract YouTube Info & Smart Transcript Helper
app.post('/api/youtube-info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract video ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;

    let title = 'TEDxDuluth Talk: Building Resilient Communities on Lake Superior';
    let author = 'Dr. Sarah Lindqvist';
    let thumbnailUrl = '';

    if (videoId) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title || title;
          author = data.author_name || author;
          if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
        }
      } catch {
        // Fallback gracefully
      }
    }

    res.json({
      videoId,
      title,
      author,
      thumbnailUrl,
      sourceUrl: url,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process YouTube link' });
  }
});

// AI Highlight Analyzer
app.post('/api/analyze-highlights', async (req, res) => {
  try {
    const { talkTitle, speaker, transcript, videoDuration = 720 } = req.body;

    if (!transcript || transcript.trim().length < 20) {
      return res.status(400).json({ error: 'Please provide talk transcript or video content to analyze.' });
    }

    // Call Gemini 3.8 Flash to extract viral hooks and highlight clips
    const prompt = `
You are the Executive Social Media Director for TEDxDuluth. 
Your goal is to parse this TEDx talk transcript and identify 3 to 6 of the absolute most engaging, shareable, emotional, or mind-expanding moments to turn into vertical short-form video clips (Instagram Reels, TikTok, YouTube Shorts).

TALK DETAILS:
- Title: ${talkTitle || 'TEDxDuluth Talk'}
- Speaker: ${speaker || 'Featured Speaker'}
- Total Talk Duration: approximately ${videoDuration} seconds

TRANSCRIPT:
"""
${transcript.slice(0, 15000)}
"""

INSTRUCTIONS:
1. Select 3 to 6 distinct highlight moments.
​2. Clip length MUST be between 15 and 55 seconds (optimal for vertical reels).
3. The hook title must be punchy, curiosity-inducing, and avoid boring labels.
4. Include accurate startTime and endTime in seconds matching the timestamps in the transcript. Ensure startTime < endTime.
5. Provide a virality score from 85 to 99.
6. Provide a breakdown of why this hook works on Instagram/TikTok.
7. CRITICAL TIMING: For each clip, break down the spoken text into 3 to 8 subtitle lines with BOTH:
   - "videoStart": absolute second in the master video (e.g. 28.2)
   - "videoEnd": absolute second in the master video (e.g. 33.0)
   - "start": relative offset in seconds from the clip start (e.g. 0.2)
   - "end": relative offset in seconds from the clip start (e.g. 5.0)
   - "text": spoken text (short, 4-8 words per line)
8. CRITICAL SOCIAL COPY REQUIREMENTS:
   Generate tailored, platform-specific copy for THREE platforms:
   - "instagram": High-energy Reels format, punchy spacing, save & share CTA. STRICT LIMIT: exactly 4 to 5 hashtags (NEVER more than 5!).
   - "linkedin": Professional thought-leadership tone, 2-3 key takeaway bullets, discussion question for industry peers. STRICT LIMIT: exactly 4 to 5 hashtags (NEVER more than 5!).
   - "facebook": Warm community storytelling tone, emotional connection, question inviting comments. STRICT LIMIT: exactly 4 to 5 hashtags (NEVER more than 5!).

Return pure JSON matching this exact structure:
{
  "talkSummary": "A 2-sentence executive summary of the talk's core thesis",
  "highlights": [
    {
      "id": "clip-1",
      "hookTitle": "Punchy Hook Title",
      "summary": "1-sentence summary of what happens in this clip",
      "startTime": 28.0,
      "endTime": 68.0,
      "duration": 40.0,
      "viralityScore": 96,
      "hookFactor": "Contrarian Insight & Emotional Vulnerability",
      "bestPlatform": "Instagram Reels",
      "subtitles": [
        { "start": 0.0, "end": 4.5, "videoStart": 28.0, "videoEnd": 32.5, "text": "First punchy spoken sentence" },
        { "start": 4.5, "end": 9.2, "videoStart": 32.5, "videoEnd": 37.2, "text": "Second sentence that deepens the idea" }
      ],
      "socialCaption": "Instagram caption text here with max 5 hashtags like #TEDxDuluth #IdeasWorthSpreading #Innovation #Leadership #Duluth",
      "socialCopies": {
        "instagram": "Instagram copy with max 5 hashtags",
        "linkedin": "LinkedIn copy with bullet points and max 5 hashtags",
        "facebook": "Facebook community copy with max 5 hashtags"
      }
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // Helper to enforce max 5 hashtags
    const sanitizeHashtags = (str: string) => {
      if (!str) return '';
      const tags = str.match(/#\w+/g) || [];
      if (tags.length <= 5) return str;
      let count = 0;
      return str.replace(/#\w+/g, (m) => {
        count++;
        return count <= 5 ? m : '';
      }).replace(/\s{2,}/g, ' ').trim();
    };

    // Ensure absolute videoStart, videoEnd and sanitized socialCopies
    if (parsedData.highlights && Array.isArray(parsedData.highlights)) {
      parsedData.highlights.forEach((h: any) => {
        const clipStart = Number(h.startTime) || 0;
        if (h.subtitles && Array.isArray(h.subtitles)) {
          h.subtitles = h.subtitles.map((sub: any) => {
            const relStart = Number(sub.start) || 0;
            const relEnd = Number(sub.end) || (relStart + 3.0);
            return {
              text: String(sub.text || ''),
              start: Number(relStart.toFixed(1)),
              end: Number(relEnd.toFixed(1)),
              videoStart: Number((sub.videoStart !== undefined ? sub.videoStart : clipStart + relStart).toFixed(1)),
              videoEnd: Number((sub.videoEnd !== undefined ? sub.videoEnd : clipStart + relEnd).toFixed(1)),
            };
          });
        }

        // Sanitize hashtags for max 5
        h.socialCaption = sanitizeHashtags(h.socialCaption || '');
        if (h.socialCopies) {
          h.socialCopies.instagram = sanitizeHashtags(h.socialCopies.instagram || h.socialCaption);
          h.socialCopies.linkedin = sanitizeHashtags(h.socialCopies.linkedin || h.socialCaption);
          h.socialCopies.facebook = sanitizeHashtags(h.socialCopies.facebook || h.socialCaption);
        } else {
          h.socialCopies = {
            instagram: h.socialCaption,
            linkedin: h.socialCaption,
            facebook: h.socialCaption,
          };
        }
      });
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini highlight analysis error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze highlights with Gemini AI',
    });
  }
});

// AI Caption & Subtitle Generator for Custom Trimmed Ranges
app.post('/api/generate-captions', async (req, res) => {
  try {
    const { clipText, duration = 30, startTime = 0 } = req.body;
    if (!clipText) {
      return res.status(400).json({ error: 'clipText is required' });
    }

    const prompt = `
Given this spoken transcript excerpt lasting approximately ${duration} seconds, break it down into clean, rhythmically balanced subtitle lines suitable for fast vertical social video (3-6 words per line max, formatted for quick reading).

TRANSCRIPT EXCERPT:
"""
${clipText}
"""

Return JSON format:
{
  "subtitles": [
    { "start": 0.0, "end": 2.5, "videoStart": ${startTime}, "videoEnd": ${startTime + 2.5}, "text": "First short line" }
  ]
}
Ensure start starts at 0.0 and the last end timestamp does not exceed ${duration}. Calculate videoStart as start + ${startTime} and videoEnd as end + ${startTime}.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse((response.text || '{}').replace(/```json/g, '').replace(/```/g, '').trim());
    if (parsed.subtitles && Array.isArray(parsed.subtitles)) {
      parsed.subtitles = parsed.subtitles.map((s: any) => ({
        ...s,
        videoStart: s.videoStart !== undefined ? s.videoStart : Number((startTime + s.start).toFixed(1)),
        videoEnd: s.videoEnd !== undefined ? s.videoEnd : Number((startTime + s.end).toFixed(1)),
      }));
    }
    res.json(parsed);
  } catch (error: any) {
    console.error('Caption generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate subtitles' });
  }
});

// Re-align Subtitles to New Video Window
app.post('/api/align-subtitles', async (req, res) => {
  try {
    const { transcript, startTime, endTime } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const duration = Math.max(1, (endTime || 30) - (startTime || 0));
    const prompt = `
You are a video timing and subtitle synchronization engine.
Given this master transcript with timestamps:
"""
${transcript.slice(0, 10000)}
"""

We are cutting a video clip from EXACTLY second ${startTime} to second ${endTime} (duration: ${duration.toFixed(1)}s).
Extract only the spoken words that occur between second ${startTime} and second ${endTime}.
Break them into rhythmically accurate subtitle lines (4-8 words per line).
For each line provide:
- "videoStart": exact second in the video (e.g. ${startTime + 0.5})
- "videoEnd": exact second in the video
- "start": relative offset in seconds from ${startTime} (videoStart - ${startTime})
- "end": relative offset in seconds from ${startTime} (videoEnd - ${startTime})
- "text": spoken text

Return JSON:
{
  "subtitles": [
    { "videoStart": number, "videoEnd": number, "start": number, "end": number, "text": string }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse((response.text || '{}').replace(/```json/g, '').replace(/```/g, '').trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('Align subtitles error:', error);
    res.status(500).json({ error: error.message || 'Failed to align subtitles' });
  }
});

// Transcribe Uploaded Video Audio
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/wav', prompt: customPrompt } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const promptText = customPrompt || `
Transcribe this spoken talk audio into a structured timestamped transcript.
Format each segment with exact timestamps in [MM:SS] format at the beginning of each line.
Example:
[00:00] First spoken sentence.
[00:06] Next sentence that continues the thought.

Provide clean, readable punctuation and speaker clarity.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: promptText },
      ],
    });

    const transcriptText = response.text || '';
    res.json({ transcript: transcriptText });
  } catch (error: any) {
    console.error('Transcribe audio error:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TEDxDuluth Socials Server running on port ${PORT} (isProduction: ${isProduction})`);
  });
}

startServer();
