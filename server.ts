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

// Require Passcode for all visitors
app.use((req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login === 'guest' && password === 'LSTED25rocks25!!') {
    return next(); // Passcode correct, load the app
  }

  res.set('WWW-Authenticate', 'Basic realm="TEDxDuluth Clips"');
  res.status(401).send('Authentication required.');
});

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
  const { email, password, passcode, name, role } = req.body;

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  // 1. Check official shared team account: info@tedxduluth.com / LSTED25rocks25!!
  if (cleanEmail === OFFICIAL_TEAM_EMAIL && cleanPassword === OFFICIAL_TEAM_PASSWORD) {
    return res.json({
      success: true,
      token: `tedx_duluth_official_${Date.now()}`, user: { name: name?.trim() \vert{}\vert{} 'TEDxDuluth Team', email: OFFICIAL_TEAM_EMAIL, role: role \vert{}\vert{} 'Duluth Team Admin & Socials', team: 'TEDxDuluth Digital Media', avatar: '🔴', }, }); }  // 2. Backward compatibility with passcode check const cleanCode = (passcode \vert{}\vert{} '').trim().toUpperCase(); const found = TEAM_CREDENTIALS.find(c => c.code.toUpperCase() === cleanCode); if (found \vert{}\vert{} cleanCode === 'TEDX' \vert{}\vert{} cleanCode === 'DULUTH' \vert{}\vert{} cleanPassword === OFFICIAL_TEAM_PASSWORD) { const member = found \vert{}\vert{} { code: cleanCode, name: name?.trim() \vert{}\vert{} 'TEDxDuluth Team Member', role: role \vert{}\vert{} 'Social Media Producer', }; return res.json({ success: true, token: `tedx_duluth_${Date.now()}`,
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

// Notify Star / Video Ready Email Dispatch Endpoint
app.post('/api/notify-email', (req, res) => {
  const { recipient = 'star@tedxduluth.com', subject, note, clipTitle, speaker, duration } = req.body;

  console.log(`[TEDxDuluth Notification] Video ready email logged for ${recipient}`);
  console.log(`Subject: ${subject}`); console.log(`Clip: "${clipTitle}" by ${speaker} (${duration}s)`);

  return res.json({
    success: true,
    recipient,
    dispatchedAt: new Date().toISOString(),
    message: `Video ready notification recorded and prepared for ${recipient}`, }); });  // Extract YouTube Info & Smart Transcript Helper app.post('/api/youtube-info', async (req, res) => { try { const { url } = req.body; if (!url) { return res.status(400).json({ error: 'URL is required' }); }  // Extract video ID const regExp = /^.*(youtu.be\/\vert{}v\/\vert{}u\/\w\/\vert{}embed\/\vert{}watch\?v=\vert{}\&v=)([^#\&\?]*).*/; const match = url.match(regExp); const videoId = match && match[2].length === 11 ? match[2] : null;  let title = 'TEDxDuluth Talk: Building Resilient Communities on Lake Superior'; let author = 'Dr. Sarah Lindqvist'; let thumbnailUrl = '';  if (videoId) { thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      try {
        const oembedRes = await fetch(`
