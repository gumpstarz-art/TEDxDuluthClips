/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SocialCopySet } from '../types';

/**
 * Enforces a strict maximum of 5 hashtags in any social copy text.
 */
export function enforceMaxFiveHashtags(text: string): string {
  const hashtagRegex = /#\w+/g;
  const matches = text.match(hashtagRegex) || [];
  if (matches.length <= 5) return text;

  // Keep first 5, remove subsequent ones
  let count = 0;
  return text.replace(hashtagRegex, (match) => {
    count++;
    return count <= 5 ? match : '';
  }).replace(/\s{2,}/g, ' ').trim();
}

/**
 * Generates tailored copy for LinkedIn, Facebook, and Instagram
 * strictly enforcing a maximum of 5 hashtags.
 */
export function generatePlatformCopies(params: {
  talkTitle: string;
  speaker: string;
  hookTitle: string;
  summary?: string;
}): SocialCopySet {
  const { talkTitle, speaker, hookTitle, summary } = params;
  const speakerPrefix = speaker ? `${speaker}` : 'Our speaker';
  const cleanSummary = summary || `A powerful perspective shared live on the TEDxDuluth stage.`;

  // 1. LINKEDIN: Professional, thought leadership, structured takeaways, 5 hashtags max
  const linkedin = `💡 ${hookTitle.toUpperCase()}

"${cleanSummary}"

At TEDxDuluth, ${speakerPrefix} tackled one of the most critical questions facing leaders and innovators today.

3 Key Takeaways:
• Growth requires leaning into the exact discomfort we instinctively avoid.
• Authentic leadership isn't about having all the answers—it's about asking the hardest questions.
• True resilience is built long before the storm arrives.

What has been your biggest lesson in navigating unexpected challenges? Let's discuss in the comments below.

#TEDxDuluth #Leadership #Innovation #Resilience #IdeasWorthSpreading`;

  // 2. FACEBOOK: Conversational, community-focused, storytelling, 5 hashtags max
  const facebook = `Have you ever heard an idea that completely reframed the way you view the world? 

During ${talkTitle ? `"${talkTitle}"` : 'their TEDxDuluth talk'}, ${speakerPrefix} shared this unforgettable insight:

"${cleanSummary}"

It's moments like this that remind us why community and open dialogue matter so much.

👉 Watch the clip and let us know: Does this ring true for you? Tag a friend who needs to hear this today!

#TEDxDuluth #Inspiration #DuluthMN #Community #IdeasWorthSpreading`;

  // 3. INSTAGRAM: High-energy Reels format, punchy spacing, save & share CTA, 5 hashtags max
  const instagram = `🔥 ${hookTitle}

${cleanSummary}

Speaker: ${speakerPrefix || 'TEDxDuluth Speaker'}
Event: TEDxDuluth

💾 Save this clip for when you need a reminder.
📲 Share this with someone who needs to hear it today.
👇 Drop your thoughts below!

#TEDxDuluth #IdeasWorthSpreading #ReelsDaily #Motivation #Inspiration`;

  return {
    linkedin: enforceMaxFiveHashtags(linkedin),
    facebook: enforceMaxFiveHashtags(facebook),
    instagram: enforceMaxFiveHashtags(instagram),
  };
}
