import { SubtitleLine, SubtitleStyle, VideoSettings } from '../types';

export interface RenderOptions {
  videoElement: HTMLVideoElement;
  startTime: number;
  endTime: number;
  subtitles: SubtitleLine[];
  subtitleStyle: SubtitleStyle;
  videoSettings: VideoSettings;
  hookTitle: string;
  speakerName: string;
  syncOffset?: number;
  onProgress?: (percent: number, statusText: string) => void;
}

export async function renderVerticalClip(options: RenderOptions): Promise<{ blob: Blob; url: string }> {
  const {
    videoElement,
    startTime,
    endTime,
    subtitles,
    subtitleStyle,
    videoSettings,
    hookTitle,
    speakerName,
    syncOffset = 0,
    onProgress,
  } = options;

  const duration = Math.max(1, endTime - startTime);
  const targetWidth = 720;
  const targetHeight = 1280;

  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Load official TEDxDuluth white lowercase logo
  const logoImg = new Image();
  logoImg.src = '/assets/aistudio/TEDxDuluth_Lowercase_Logo_White__2__922f2609.png';
  try {
    if (!logoImg.complete) {
      await new Promise<void>((res) => {
        logoImg.onload = () => res();
        logoImg.onerror = () => res();
      });
    }
  } catch {}

  // Setup AudioContext to capture audio from the video element
  let audioStreamTrack: MediaStreamTrack | null = null;
  let audioContext: AudioContext | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();
    const sourceNode = audioContext.createMediaElementSource(videoElement);
    const destinationNode = audioContext.createMediaStreamDestination();
    sourceNode.connect(destinationNode);
    // Also connect to speakers if not already connected
    sourceNode.connect(audioContext.destination);
    const audioTracks = destinationNode.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioStreamTrack = audioTracks[0];
    }
  } catch (err) {
    console.warn('Audio capture warning (cross-origin or already attached):', err);
  }

  // Determine supported mime type
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let selectedMimeType = '';
  for (const m of mimeTypes) {
    if (MediaRecorder.isTypeSupported(m)) {
      selectedMimeType = m;
      break;
    }
  }
  if (!selectedMimeType) {
    selectedMimeType = 'video/webm';
  }

  const canvasStream = canvas.captureStream(30);
  if (audioStreamTrack) {
    canvasStream.addTrack(audioStreamTrack);
  }

  const mediaRecorder = new MediaRecorder(canvasStream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 4_500_000,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise(async (resolve, reject) => {
    mediaRecorder.onerror = (e) => {
      reject(e);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: selectedMimeType });
      const url = URL.createObjectURL(blob);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      resolve({ blob, url });
    };

    // Prepare video playback
    videoElement.currentTime = startTime;
    videoElement.muted = false;

    // Wait for seek to complete
    await new Promise<void>((res) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        res();
      };
      videoElement.addEventListener('seeked', onSeeked);
    });

    try {
      await videoElement.play();
    } catch {
      // If play failed due to autoplay policy, mute temporarily for canvas grab
      videoElement.muted = true;
      await videoElement.play();
    }

    mediaRecorder.start(200); // 200ms slice

    let isFinished = false;

    const drawFrame = () => {
      if (isFinished) return;

      const currentSec = videoElement.currentTime;
      const progressFraction = Math.min(1, Math.max(0, (currentSec - startTime) / duration));
      const clipElapsed = currentSec - startTime;

      if (onProgress) {
        onProgress(
          Math.round(progressFraction * 100),
          `Rendering vertical 9:16 clip (${Math.round(clipElapsed)}s / ${Math.round(duration)}s)...`
        );
      }

      // Check if clip finished
      if (currentSec >= endTime || videoElement.ended) {
        isFinished = true;
        videoElement.pause();
        setTimeout(() => {
          mediaRecorder.stop();
        }, 300);
        return;
      }

      // 1. CLEAR & BACKGROUND
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 2. VIDEO RENDERING BASED ON LAYOUT
      const vWidth = videoElement.videoWidth || 1920;
      const vHeight = videoElement.videoHeight || 1080;
      const vRatio = vWidth / vHeight;

      if (videoSettings.layout === 'center-crop') {
        // Zoom to fill 9:16
        const targetRatio = targetWidth / targetHeight;
        let sWidth = vWidth;
        let sHeight = vHeight;
        let sX = 0;
        let sY = 0;

        if (vRatio > targetRatio) {
          sWidth = vHeight * targetRatio;
          sX = (vWidth - sWidth) / 2;
        } else {
          sHeight = vWidth / targetRatio;
          sY = (vHeight - sHeight) / 2;
        }

        ctx.drawImage(videoElement, sX, sY, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      } else if (videoSettings.layout === 'blurred-fit') {
        // Background: Zoomed and blurred
        ctx.save();
        ctx.filter = 'blur(35px) brightness(0.4)';
        const bgScale = Math.max(targetWidth / vWidth, targetHeight / vHeight) * 1.25;
        const bgW = vWidth * bgScale;
        const bgH = vHeight * bgScale;
        ctx.drawImage(videoElement, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
        ctx.restore();

        // Foreground: Crisp 16:9 centered
        const fgW = targetWidth;
        const fgH = targetWidth / vRatio;
        const fgY = (targetHeight - fgH) / 2;

        // Subtle shadow behind foreground video
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, fgY, fgW, fgH);
        ctx.drawImage(videoElement, 0, 0, vWidth, vHeight, 0, fgY, fgW, fgH);
        ctx.restore();
      }

      // 3. BOTTOM CORNER BRANDING / TEDX DULUTH WATERMARK
      if (videoSettings.showTedLogo) {
        ctx.save();
        const lWidth = Math.min(220, targetWidth * 0.28);
        const lHeight = (logoImg && logoImg.naturalHeight && logoImg.naturalWidth)
          ? (logoImg.naturalHeight / logoImg.naturalWidth) * lWidth
          : 45;

        // Position in bottom corner (default bottom-right, or bottom-left)
        const isBottomLeft = videoSettings.logoPosition === 'bottom-left';
        const logoX = isBottomLeft ? 36 : (targetWidth - lWidth - 36);
        const logoY = videoSettings.showProgressBar
          ? (targetHeight - lHeight - 48)
          : (targetHeight - lHeight - 32);

        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          // Frosted glass badge background
          ctx.fillStyle = 'rgba(11, 12, 16, 0.82)';
          ctx.beginPath();
          ctx.roundRect(logoX - 12, logoY - 8, lWidth + 24, lHeight + 16, 12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.drawImage(logoImg, logoX, logoY, lWidth, lHeight);
        } else {
          // Fallback text rendering in bottom corner
          ctx.fillStyle = 'rgba(11, 12, 16, 0.82)';
          ctx.beginPath();
          ctx.roundRect(logoX - 10, logoY - 6, lWidth + 20, 52, 10);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = '800 22px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('TED', logoX, logoY + 24);
          const tedWidth = ctx.measureText('TED').width;

          ctx.fillStyle = '#eb0028';
          ctx.font = '900 24px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillText('x', logoX + tedWidth + 1, logoY + 24);
          const xWidth = ctx.measureText('x').width;

          ctx.fillStyle = '#ffffff';
          ctx.font = '700 18px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillText('Duluth', logoX + tedWidth + xWidth + 4, logoY + 23);

          ctx.font = '600 8px "Helvetica Neue", Helvetica, Arial, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText('x = independently organized TED event', logoX, logoY + 38);
        }
        ctx.restore();
      }

      // 4. TOP HOOK HEADLINE BANNER
      if (videoSettings.showHeadline && hookTitle) {
        ctx.save();
        const bannerY = 145;
        const bannerPaddingX = 36;
        const text = (videoSettings.customHeadline || hookTitle).toUpperCase();

        // Calculate multi-line wrapping for headline
        ctx.font = '900 32px "Space Grotesk", "Plus Jakarta Sans", sans-serif';
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > targetWidth - bannerPaddingX * 2) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = 40;
        const bannerHeight = lines.length * lineHeight + 20;

        // Dark frosted banner box
        ctx.fillStyle = 'rgba(10, 10, 14, 0.88)';
        ctx.beginPath();
        ctx.roundRect(bannerPaddingX - 14, bannerY - 14, targetWidth - (bannerPaddingX - 14) * 2, bannerHeight, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(235, 0, 40, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw headline text with high contrast
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        lines.forEach((line, idx) => {
          ctx.fillText(line, targetWidth / 2, bannerY + 22 + idx * lineHeight);
        });

        ctx.restore();
      }

      // 5. (Removed bottom speaker/source tag as requested)

      // 6. BURNED-IN ANIMATED SUBTITLES
      const offset = syncOffset || 0;
      const activeSub = subtitles.find((sub) => {
        if (sub.videoStart !== undefined && sub.videoEnd !== undefined) {
          return currentSec >= (sub.videoStart + offset) && currentSec <= (sub.videoEnd + offset);
        }
        return clipElapsed >= (sub.start + offset) && clipElapsed <= (sub.end + offset);
      });

      if (activeSub && activeSub.text) {
        ctx.save();
        let subText = activeSub.text.trim();
        if (subtitleStyle.textTransform === 'uppercase') {
          subText = subText.toUpperCase();
        }

        const posY = (targetHeight * (subtitleStyle.positionY || 82)) / 100;
        const fontSize = subtitleStyle.fontSize || 34;

        // Exclusive Helvetica font family variants
        let fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
        let fontWeight = '800';

        if (subtitleStyle.fontVariant === 'helvetica-medium') {
          fontWeight = '600';
        } else if (subtitleStyle.fontVariant === 'helvetica-condensed') {
          fontStack = '"Helvetica Neue Condensed", "Arial Narrow", "Helvetica Neue", Helvetica, sans-serif';
          fontWeight = '700';
        }

        ctx.font = `${fontWeight} ${fontSize}px ${fontStack}`;
        ctx.textAlign = 'center';

        // Word wrap for subtitle
        const words = subText.split(' ');
        const subLines: string[] = [];
        let curr = '';
        for (const w of words) {
          const test = curr ? `${curr} ${w}` : w;
          if (ctx.measureText(test).width > targetWidth - 90) {
            subLines.push(curr);
            curr = w;
          } else {
            curr = test;
          }
        }
        if (curr) subLines.push(curr);

        const subLineHeight = fontSize * 1.35;
        const totalSubH = subLines.length * subLineHeight;

        // ONLY TWO PRESETS: TED Classic and TED Red
        if (subtitleStyle.preset === 'ted-red') {
          // Signature TED Red (#eb0028) banner with crisp white text
          subLines.forEach((line, i) => {
            const lineWidth = ctx.measureText(line).width;
            const lineY = posY - totalSubH / 2 + i * subLineHeight;

            // Signature TED Red pill background
            ctx.fillStyle = '#eb0028';
            ctx.beginPath();
            ctx.roundRect(
              targetWidth / 2 - lineWidth / 2 - 20,
              lineY - fontSize * 0.88,
              lineWidth + 40,
              fontSize * 1.28,
              10
            );
            ctx.fill();

            // Subtle dark shadow outline
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Crisp white Helvetica text
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.fillText(line, targetWidth / 2, lineY);
          });
        } else {
          // TED Classic: Clean white text with dark frosted backing box
          subLines.forEach((line, i) => {
            const lineWidth = ctx.measureText(line).width;
            const lineY = posY - totalSubH / 2 + i * subLineHeight;

            // Frosted charcoal/black box
            ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
            ctx.beginPath();
            ctx.roundRect(
              targetWidth / 2 - lineWidth / 2 - 18,
              lineY - fontSize * 0.88,
              lineWidth + 36,
              fontSize * 1.28,
              8
            );
            ctx.fill();

            // Clean white Helvetica text
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(line, targetWidth / 2, lineY);
          });
        }

        ctx.restore();
      }

      // 7. DYNAMIC PROGRESS BAR
      if (videoSettings.showProgressBar) {
        ctx.save();
        const barY = targetHeight - 24;
        const barHeight = 8;
        const barPadding = 32;
        const totalBarWidth = targetWidth - barPadding * 2;

        // Background track
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(barPadding, barY, totalBarWidth, barHeight, 4);
        ctx.fill();

        // Active progress bar in TED red
        const filledWidth = Math.max(8, totalBarWidth * progressFraction);
        ctx.fillStyle = '#eb0028';
        ctx.beginPath();
        ctx.roundRect(barPadding, barY, filledWidth, barHeight, 4);
        ctx.fill();

        // Glowing indicator head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(barPadding + filledWidth, barY + barHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Request next frame
      if ('requestVideoFrameCallback' in videoElement) {
        (videoElement as any).requestVideoFrameCallback(drawFrame);
      } else {
        requestAnimationFrame(drawFrame);
      }
    };

    if ('requestVideoFrameCallback' in videoElement) {
      (videoElement as any).requestVideoFrameCallback(drawFrame);
    } else {
      requestAnimationFrame(drawFrame);
    }
  });
}
