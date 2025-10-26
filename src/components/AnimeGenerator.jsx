"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

const STYLES = [
  { id: "sakura", label: "Sakura Drift" },
  { id: "speedlines", label: "Speedlines" },
  { id: "neon", label: "Neon Grid" },
];

export default function AnimeGenerator() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const mediaRecorderRef = useRef(null);

  const [style, setStyle] = useState("sakura");
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(5);
  const [resolution, setResolution] = useState("1280x720");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("");

  const [width, height] = useMemo(() => {
    const [w, h] = resolution.split("x").map((n) => parseInt(n, 10));
    return [Math.max(320, w || 1280), Math.max(180, h || 720)];
  }, [resolution]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
  }, [width, height]);

  const drawFrame = useCallback(
    (ctx, t) => {
      if (style === "sakura") {
        drawSakura(ctx, t);
      } else if (style === "speedlines") {
        drawSpeedlines(ctx, t);
      } else {
        drawNeon(ctx, t);
      }
      drawWatermark(ctx, t, width, height);
    },
    [style, width, height]
  );

  const startPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = nowMs();

    const tick = () => {
      const t = (nowMs() - startTime) / 1000;
      drawFrame(ctx, t);
      rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    tick();
  }, [drawFrame]);

  useEffect(() => {
    startPreview();
    return () => cancelAnimationFrame(rafRef.current);
  }, [startPreview]);

  const stopPreview = () => cancelAnimationFrame(rafRef.current);

  const downloadFileName = useMemo(() => {
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    return `anime-video-${style}-${width}x${height}-${date}.webm`;
  }, [style, width, height]);

  const handleRecord = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (typeof MediaRecorder === "undefined") {
      setStatus("MediaRecorder is not supported in this browser.");
      return;
    }

    const fps = 60;
    const stream = canvas.captureStream(fps);

    let options = undefined;
    const tryTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const mime of tryTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        options = { mimeType: mime, videoBitsPerSecond: 6_000_000 };
        break;
      }
    }

    const recorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = recorder;

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chunks[0]?.type || "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setIsRecording(false);
      setStatus("Recording complete.");
      setProgress(100);
      startPreview();
    };

    stopPreview();

    setIsRecording(true);
    setStatus("Recording...");
    setProgress(0);

    const totalMs = Math.max(1000, Math.round(durationSec * 1000));
    const startMs = nowMs();

    recorder.start(100);

    const drive = () => {
      const t = (nowMs() - startMs) / 1000;
      drawFrame(ctx, t);
      const p = Math.min(1, (nowMs() - startMs) / totalMs);
      setProgress(Math.round(p * 100));
      if (p < 1 && recorder.state === "recording") {
        rafRef.current = requestAnimationFrame(drive);
      } else {
        recorder.stop();
      }
    };

    drive();
  };

  const clearVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl("");
  };

  return (
    <section className="panel">
      <div className="controls">
        <div className="row">
          <label>Style</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <label>Resolution</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="1280x720">1280 x 720 (HD)</option>
            <option value="1920x1080">1920 x 1080 (FHD)</option>
            <option value="720x720">720 x 720 (Square)</option>
          </select>
        </div>
        <div className="row">
          <label>Duration</label>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={durationSec}
            onChange={(e) => setDurationSec(parseInt(e.target.value || 5, 10))}
          />
          <span className="badge">seconds</span>
        </div>
        <div className="row">
          <button className="primary" onClick={handleRecord} disabled={isRecording}>
            {isRecording ? "Recording..." : "Generate WebM"}
          </button>
          <button onClick={startPreview} disabled={isRecording}>Preview</button>
          <button onClick={stopPreview} disabled={isRecording}>Pause</button>
        </div>
      </div>

      <div className="canvasWrap" style={{ marginTop: 12 }}>
        <canvas ref={canvasRef} className="canvas" width={width} height={height} />
        <div className="progress"><div className="progressBar" style={{ width: `${progress}%` }} /></div>
        <div className="links">
          <span>{status}</span>
          {videoUrl && (
            <>
              <a className="link" href={videoUrl} download={downloadFileName}>Download WebM</a>
              <button onClick={clearVideo}>Clear</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function drawWatermark(ctx, t, width, height) {
  const text = "Anime Video Generator • webm/vp9";
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.font = Math.max(14, Math.round(width * 0.018)) + "px ui-sans-serif";
  const metrics = ctx.measureText(text);
  const x = width - metrics.width - 20;
  const y = height - 20;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawSakura(ctx, t) {
  const { canvas } = ctx;
  const w = canvas.width;
  const h = canvas.height;

  const skyTop = [12, 16, 42];
  const skyBottom = [245, 115, 255];
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, `rgb(${skyTop[0]},${skyTop[1]},${skyTop[2]})`);
  gradient.addColorStop(1, `rgb(${skyBottom[0]},${skyBottom[1]},${skyBottom[2]})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const mountainColor = "#12162a";
  ctx.fillStyle = mountainColor;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * w;
    const y = h * 0.7 - Math.sin(i * 0.9 + t * 0.4) * 20 - (i % 2 === 0 ? 40 : 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  const petalsCount = Math.floor((w * h) / 40000) + 40;
  for (let i = 0; i < petalsCount; i++) {
    const seed = i * 999983;
    const px = (hash(seed + 13) * w + (t * (30 + hash(seed + 7) * 50)) % w) % w;
    const py = (hash(seed + 29) * h + t * (40 + hash(seed + 3) * 80)) % h;
    const size = 4 + hash(seed + 5) * 10 * (w / 1280);
    const rot = t * (1 + hash(seed + 11) * 2) + hash(seed + 19) * Math.PI;

    drawPetal(ctx, px, py, size, rot);
  }

  drawSunRays(ctx, t, w, h);
}

function drawPetal(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const petal = new Path2D();
  petal.moveTo(0, -s * 0.5);
  petal.quadraticCurveTo(s * 0.8, -s * 0.8, s * 0.5, 0);
  petal.quadraticCurveTo(s * 0.8, s * 0.8, 0, s * 0.5);
  petal.quadraticCurveTo(-s * 0.8, s * 0.8, -s * 0.5, 0);
  petal.quadraticCurveTo(-s * 0.8, -s * 0.8, 0, -s * 0.5);
  ctx.fillStyle = "rgba(255, 182, 193, 0.8)";
  ctx.shadowColor = "rgba(255, 105, 180, 0.6)";
  ctx.shadowBlur = Math.max(5, s * 0.8);
  ctx.fill(petal);
  ctx.restore();
}

function drawSunRays(ctx, t, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.translate(w * 0.5, h * 0.2);
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    ctx.rotate(((Math.PI * 2) / rays) + Math.sin(t * 0.2 + i) * 0.005);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(255,255,255,0.0)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.07)");
    grad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, -2, w, 4);
  }
  ctx.restore();
}

function drawSpeedlines(ctx, t) {
  const { canvas } = ctx;
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0b0d16");
  bg.addColorStop(1, "#1a1040");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const lines = Math.floor((w * h) / 16000);
  for (let i = 0; i < lines; i++) {
    const seed = i * 92821;
    const baseX = (hash(seed + 1) * w + (t * (400 + hash(seed + 5) * 600)) % w) % w;
    const y = hash(seed + 3) * h;
    const len = 60 + hash(seed + 7) * (w * 0.4);
    const thickness = 1 + hash(seed + 11) * 6;
    const hue = 260 + Math.floor(hash(seed + 13) * 100);

    const grad = ctx.createLinearGradient(baseX - len, y, baseX + len, y);
    grad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.0)`);
    grad.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.9)`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0.0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(baseX - len, y);
    ctx.lineTo(baseX + len, y);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
  vignette.addColorStop(0, "rgba(0,0,0,0.0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawNeon(ctx, t) {
  const { canvas } = ctx;
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#001219");
  bg.addColorStop(1, "#05010f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const gridSize = 40;
  const offset = (t * 40) % gridSize;
  ctx.strokeStyle = "rgba(0, 231, 255, 0.35)";
  ctx.lineWidth = 1;
  for (let x = -gridSize; x < w + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + offset, 0);
    ctx.lineTo(x + offset, h);
    ctx.stroke();
  }
  for (let y = -gridSize; y < h + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    ctx.lineTo(w, y + offset);
    ctx.stroke();
  }

  const glowCount = Math.floor((w * h) / 120000) + 12;
  for (let i = 0; i < glowCount; i++) {
    const seed = i * 81173;
    const x = (hash(seed + 2) * w + t * (20 + hash(seed + 9) * 80)) % w;
    const y = (hash(seed + 4) * h + Math.sin(t * 0.8 + i) * 60 + h) % h;
    const r = 20 + hash(seed + 6) * 120 * (w / 1280);
    const hue = 180 + Math.floor(hash(seed + 8) * 180);

    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
    g.addColorStop(1, `hsla(${hue}, 100%, 60%, 0.0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hash(n) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}
