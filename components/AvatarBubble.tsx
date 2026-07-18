"use client";

import { useEffect, useRef } from "react";

/**
 * Companion avatar — circular portrait crop (her + background inside a ring).
 * Rests on a calm mouth-closed frame; plays (muted) while her voice audio plays.
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

  // idle pose: a calm, mouth-closed moment near the end of the clip
  const IDLE_FROM_END = 0.8;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const goIdle = () => {
      video.pause();
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - IDLE_FROM_END);
      }
    };
    if (speaking) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else if (video.readyState >= 1) {
      goIdle();
    } else {
      video.addEventListener("loadedmetadata", goIdle, { once: true });
      return () => video.removeEventListener("loadedmetadata", goIdle);
    }
  }, [speaking]);

  return (
    <div className="flex justify-center select-none" aria-hidden>
      <div
        style={{
          width: height,
          height,
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid #fff",
          boxShadow: "0 4px 16px rgba(35,32,28,0.18), 0 0 0 1px var(--line)",
          flexShrink: 0,
        }}
      >
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          onError={onMissing}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 12%", transform: "scale(1.25)", transformOrigin: "center 25%" }}
        />
      </div>
    </div>
  );
}
