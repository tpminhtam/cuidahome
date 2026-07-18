"use client";

import { useEffect, useRef } from "react";

/**
 * Chroma-keyed companion avatar — same technique as the ChromaKeyVideo
 * component from the Vision Agent project, adapted from a LiveKit track to a
 * plain <video> file: draw frames to a canvas and zero the alpha of
 * green-screen pixels so only the person remains, floating over the app.
 *
 * `speaking` drives playback: the (muted) clip plays while the companion's
 * voice audio is playing, and freezes otherwise — so she moves when she talks.
 */
export default function AvatarBubble({
  src,
  speaking,
  keyed = true,
  threshold = 1.3,
  height = 150,
  onMissing,
}: {
  src: string;
  speaking: boolean;
  keyed?: boolean;
  threshold?: number;
  height?: number;
  onMissing?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // visible, cropped to the person
  const workRef = useRef<HTMLCanvasElement | null>(null); // offscreen, full frame keyed
  const bboxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (speaking) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [speaking]);

  useEffect(() => {
    if (!keyed) return;
    const video = videoRef.current;
    const view = canvasRef.current;
    if (!video || !view) return;
    const viewCtx = view.getContext("2d");
    if (!viewCtx) return;
    if (!workRef.current) workRef.current = document.createElement("canvas");
    const work = workRef.current;
    const ctx = work.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let raf = 0;
    let frameCount = 0;
    const render = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        if (work.width !== w) work.width = w;
        if (work.height !== h) work.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        try {
          const frame = ctx.getImageData(0, 0, w, h);
          const d = frame.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            // key out green-screen green: green clearly dominates red and blue
            if (g > 90 && g > r * threshold && g > b * threshold) {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(frame, 0, 0);

          // auto-crop to the person: bounding box of remaining opaque pixels
          // (Tavus composes the replica small over the background page)
          if (!bboxRef.current || frameCount % 30 === 0) {
            let minX = w, minY = h, maxX = 0, maxY = 0;
            const stride = 4; // sample every 4th pixel for speed
            for (let y = 0; y < h; y += stride) {
              for (let x = 0; x < w; x += stride) {
                if (d[(y * w + x) * 4 + 3] > 40) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (maxX > minX + 20 && maxY > minY + 20) {
              const pad = Math.round((maxX - minX) * 0.06);
              bboxRef.current = {
                x: Math.max(0, minX - pad),
                y: Math.max(0, minY - pad),
                w: Math.min(w, maxX + pad) - Math.max(0, minX - pad),
                h: Math.min(h, maxY + pad) - Math.max(0, minY - pad),
              };
            }
          }
          frameCount++;

          const bb = bboxRef.current ?? { x: 0, y: 0, w, h };
          const targetH = 300; // internal res of the view canvas (CSS scales down)
          const targetW = Math.round((bb.w / bb.h) * targetH);
          if (view.width !== targetW) view.width = targetW;
          if (view.height !== targetH) view.height = targetH;
          viewCtx.clearRect(0, 0, targetW, targetH);
          viewCtx.drawImage(work, bb.x, bb.y, bb.w, bb.h, 0, 0, targetW, targetH);
        } catch {
          // getImageData can throw before the first frame is ready — retry
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [keyed, threshold]);

  return (
    <div className="flex flex-col items-center select-none" aria-hidden>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        onError={onMissing}
        style={keyed ? { display: "none" } : { height, borderRadius: "50%", aspectRatio: "1", objectFit: "cover", objectPosition: "center 15%" }}
      />
      {keyed && <canvas ref={canvasRef} style={{ height, width: "auto", maxWidth: "100%" }} />}
    </div>
  );
}
