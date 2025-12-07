
import { Frame } from '../types';

export const exportToVideo = async (
  frames: Frame[],
  width: number,
  height: number,
  fps: number,
  onProgress: (progress: number) => void
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2500000 // 2.5 Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    recorder.onerror = (e) => reject(e);

    recorder.start();

    let frameIndex = 0;
    
    const drawFrame = async () => {
      if (frameIndex >= frames.length) {
        recorder.stop();
        return;
      }

      onProgress(Math.round((frameIndex / frames.length) * 100));
      
      const frame = frames[frameIndex];
      
      // 1. Fill Background
      ctx.fillStyle = frame.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Images
      for (const imgData of frame.images) {
        await new Promise<void>((resolveImg) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.translate(imgData.x + imgData.width / 2, imgData.y + imgData.height / 2);
            ctx.rotate((imgData.rotation * Math.PI) / 180);
            ctx.drawImage(img, -imgData.width / 2, -imgData.height / 2, imgData.width, imgData.height);
            ctx.restore();
            resolveImg();
          };
          img.onerror = () => resolveImg(); // Skip on error
          img.src = imgData.src;
        });
      }

      // 3. Draw Paths
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const path of frame.paths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      }

      // Schedule next frame
      frameIndex++;
      setTimeout(drawFrame, 1000 / fps);
    };

    drawFrame();
  });
};
