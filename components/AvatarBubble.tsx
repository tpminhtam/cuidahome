"use client";

import { useEffect, useRef } from "react";

/**
 * Companion avatar with TRUE background removal — the Vision Agent look:
 * per-frame person segmentation (MediaPipe selfie segmenter, vendored locally
 * in /public/wasm + /public/models, no CDN) drives an alpha mask, so only the
 * person renders, soft-edged, floating on the page. Auto-crops to her bounding
 * box. `speaking` drives playback: she moves while her voice audio plays.
 */
export default function AvatarBubble({
  src,
  speaking,
  height = 150,
  onMissing,
}: {
  src: string;
  speaking: boolean;
  height?: number;
  onMissing?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // visible, cropped
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
    const video = videoRef.current;
    const view = canvasRef.current;
    if (!video || !view) return;
    const viewCtx = view.getContext("2d");
    if (!viewCtx) return;

    const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const work = document.createElement("canvas");
    const workCtx = work.getContext("2d", { willReadFrequently: true })!;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d")!;

    let raf = 0;
    let disposed = false;
    let segmenter: { segmentForVideo: (v: HTMLVideoElement, ts: number) => { confidenceMasks?: { width: number; height: number; getAsFloat32Array: () => Float32Array; close: () => void }[]; close: () => void }; close: () => void } | null = null;
    let lastTime = -1;
    let frameCount = 0;

    (async () => {
      try {
        const visionLib = await import("@mediapipe/tasks-vision");
        const fileset = await visionLib.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
        segmenter = await visionLib.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${BASE}/models/selfie_segmenter.tflite`, delegate: "GPU" },
          runningMode: "VIDEO",
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
      } catch {
        segmenter = null; // fall back to unsegmented (still auto-cropped) below
      }
      if (disposed) {
        segmenter?.close();
        return;
      }

      const render = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const advanced = video.currentTime !== lastTime;
        if (w && h && (advanced || !bboxRef.current)) {
          lastTime = video.currentTime;
          if (work.width !== w) { work.width = w; work.height = h; }
          workCtx.clearRect(0, 0, w, h);
          workCtx.drawImage(video, 0, 0, w, h);

          if (segmenter) {
            try {
              const res = segmenter.segmentForVideo(video, performance.now());
              const masks = res.confidenceMasks;
              if (masks?.length) {
                // pick the person mask: sample center vs corners; person should be center-heavy
                let mask = masks[masks.length - 1];
                let data = mask.getAsFloat32Array();
                const mw = mask.width, mh = mask.height;
                const at = (x: number, y: number) => data[y * mw + x] ?? 0;
                const center = at(mw >> 1, mh >> 1);
                const corners = (at(2, 2) + at(mw - 3, 2)) / 2;
                const invert = center < corners;

                if (maskCanvas.width !== mw) { maskCanvas.width = mw; maskCanvas.height = mh; }
                const mimg = maskCtx.createImageData(mw, mh);
                for (let i = 0; i < mw * mh; i++) {
                  const c = invert ? 1 - data[i] : data[i];
                  // feathered edge: smooth ramp between 0.35 and 0.75 confidence
                  const a = c <= 0.35 ? 0 : c >= 0.75 ? 1 : (c - 0.35) / 0.4;
                  mimg.data[i * 4 + 3] = Math.round(a * 255);
                }
                maskCtx.putImageData(mimg, 0, 0);
                workCtx.globalCompositeOperation = "destination-in";
                workCtx.imageSmoothingEnabled = true;
                workCtx.drawImage(maskCanvas, 0, 0, w, h);
                workCtx.globalCompositeOperation = "source-over";
                res.close();
              }
            } catch {
              /* segment can fail on the first frames — render unmasked */
            }
          }

          // auto-crop to the person's bounding box (sampled, refreshed periodically)
          if (!bboxRef.current || frameCount % 30 === 0) {
            try {
              const frame = workCtx.getImageData(0, 0, w, h);
              const d = frame.data;
              let minX = w, minY = h, maxX = 0, maxY = 0;
              for (let y = 0; y < h; y += 4) {
                for (let x = 0; x < w; x += 4) {
                  if (d[(y * w + x) * 4 + 3] > 40) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
              }
              if (maxX > minX + 20 && maxY > minY + 20) {
                const pad = Math.round((maxX - minX) * 0.05);
                bboxRef.current = {
                  x: Math.max(0, minX - pad),
                  y: Math.max(0, minY - pad),
                  w: Math.min(w, maxX + pad) - Math.max(0, minX - pad),
                  h: Math.min(h, maxY + pad) - Math.max(0, minY - pad),
                };
              }
            } catch { /* ignore */ }
          }
          frameCount++;

          const bb = bboxRef.current ?? { x: 0, y: 0, w, h };
          const targetH = 320;
          const targetW = Math.round((bb.w / bb.h) * targetH);
          if (view.width !== targetW) { view.width = targetW; view.height = targetH; }
          viewCtx.clearRect(0, 0, targetW, targetH);
          viewCtx.drawImage(work, bb.x, bb.y, bb.w, bb.h, 0, 0, targetW, targetH);
        }
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      segmenter?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center select-none" aria-hidden>
      <video ref={videoRef} src={src} muted loop playsInline preload="auto" onError={onMissing} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ height, width: "auto", maxWidth: "100%" }} />
    </div>
  );
}
