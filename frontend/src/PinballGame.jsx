import React, { useEffect, useRef, useState } from "react";

// Lightweight canvas pinball. Keyboard: Left/Right arrows (or A/D) for flippers, Space to launch.
export default function PinballGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [running, setRunning] = useState(false);

  const world = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 640; // board size
    canvas.width = W; canvas.height = H;

    // --- World state ---
    world.current = {
      // ball
      x: W * 0.75, y: H - 80, r: 9, vx: 0, vy: 0, stuck: true, // stuck at plunger
      gravity: 0.35, damp: 0.995, maxSpeed: 18,
      // flippers
      left: { cx: 120, cy: H - 110, len: 60, angle: 0.35, speed: 0, active: false },
      right: { cx: W - 120, cy: H - 110, len: 60, angle: -0.35, speed: 0, active: false },
      // bumpers
      bumpers: [
        { x: W * 0.3, y: 160, r: 20, score: 100 },
        { x: W * 0.7, y: 210, r: 20, score: 150 },
        { x: W * 0.5, y: 120, r: 22, score: 200 },
        { x: W * 0.35, y: 300, r: 18, score: 80 },
        { x: W * 0.65, y: 320, r: 18, score: 80 },
      ],
      lanes: [ // top guides
        { x1: 40, y1: 60, x2: W - 40, y2: 60 },
      ],
      score: 0,
      balls: 3,
      tilt: 0,
      plunger: { power: 0, charging: false, max: 16 },
      last: performance.now(),
      raf: 0,
    };

    const resetBall = () => {
      const b = world.current;
      b.x = W * 0.75; b.y = H - 80; b.vx = 0; b.vy = 0; b.stuck = true; b.plunger.power = 0; b.plunger.charging = false;
    };

    const startGame = () => {
      world.current.score = 0; world.current.balls = 3; setScore(0); setBalls(3);
      resetBall();
      setRunning(true);
      cancelAnimationFrame(world.current.raf);
      world.current.last = performance.now();
      world.current.raf = requestAnimationFrame(loop);
    };

    // --- Input ---
    const keydown = (e) => {
      if (e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') world.current.left.active = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') world.current.right.active = true;
      if (e.code === 'Space') world.current.plunger.charging = true;
    };
    const keyup = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') world.current.left.active = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') world.current.right.active = false;
      if (e.code === 'Space') {
        // launch
        const b = world.current;
        if (b.stuck) {
          b.plunger.charging = false;
          b.vy = -Math.max(6, b.plunger.power * 1.2);
          b.vx = -3;
          b.stuck = false;
          b.plunger.power = 0;
        }
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    // --- Physics helpers ---
    const clamp = (n, a, z) => Math.max(a, Math.min(z, n));

    function updateFlipper(flip, dir) {
      const target = flip.active ? (dir < 0 ? -0.9 : 0.9) : (dir < 0 ? -0.35 : 0.35);
      flip.angle += (target - flip.angle) * 0.3; // spring to target
    }

    function ballFlipperCollision(b, flip, dir) {
      // flipper as line segment from pivot at angle
      const x2 = flip.cx + Math.cos(flip.angle) * flip.len * dir;
      const y2 = flip.cy + Math.sin(flip.angle) * flip.len * dir;
      // project ball to segment
      const x1 = flip.cx, y1 = flip.cy;
      const vx = x2 - x1, vy = y2 - y1;
      const wx = b.x - x1, wy = b.y - y1;
      const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
      const px = x1 + vx * t, py = y1 + vy * t;
      const dx = b.x - px, dy = b.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < b.r + 6) { // hit radius
        const nx = dx / (dist || 1), ny = dy / (dist || 1);
        // add flipper energy
        const energy = flip.active ? 10 : 4;
        b.vx += nx * energy + (dir > 0 ? 2 : -2);
        b.vy += ny * energy - 1;
        // separate
        const overlap = b.r + 6 - dist;
        b.x += nx * overlap; b.y += ny * overlap;
      }
    }

    function bumperCollision(b, bumper) {
      const dx = b.x - bumper.x, dy = b.y - bumper.y;
      const dist = Math.hypot(dx, dy);
      if (dist < b.r + bumper.r) {
        const nx = dx / (dist || 1), ny = dy / (dist || 1);
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = (b.vx - 2 * (b.vx * nx + b.vy * ny) * nx) * 0.9; // reflect with damping
        b.vy = (b.vy - 2 * (b.vx * nx + b.vy * ny) * ny) * 0.9;
        b.vx += nx * 6; b.vy += ny * 6; // bumper kick
        world.current.score += bumper.score; setScore(world.current.score);
      }
    }

    function walls(b) {
      // side walls
      if (b.x < b.r + 8) { b.x = b.r + 8; b.vx = Math.abs(b.vx) * 0.95; }
      if (b.x > W - b.r - 8) { b.x = W - b.r - 8; b.vx = -Math.abs(b.vx) * 0.95; }
      // ceiling
      if (b.y < b.r + 50) { b.y = b.r + 50; b.vy = Math.abs(b.vy) * 0.95; }
      // out lane (bottom)
      if (b.y > H + 20) {
        world.current.balls -= 1; setBalls(world.current.balls);
        if (world.current.balls <= 0) {
          // game over
          setRunning(false);
          resetBall();
          return;
        }
        resetBall();
      }
    }

    // --- Main loop ---
    function loop(now) {
      const b = world.current;
      const dt = (now - b.last) / 16.6667; // normalize to 60fps ticks
      b.last = now;

      // update plunger power
      if (b.stuck && b.plunger.charging) {
        b.plunger.power = clamp(b.plunger.power + 0.35 * dt, 0, b.plunger.max);
      }

      // gravity & integration
      if (!b.stuck) {
        b.vy += b.gravity * dt;
        b.vx *= b.damp; b.vy *= b.damp;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > b.maxSpeed) { b.vx *= b.maxSpeed / sp; b.vy *= b.maxSpeed / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
      } else {
        // stick to plunger lane
        b.x = W * 0.75; b.y = H - 80 + Math.sin(now/200) * 1.5;
      }

      // flippers
      updateFlipper(b.left, -1);
      updateFlipper(b.right, 1);
      ballFlipperCollision(b, b.left, 1);
      ballFlipperCollision(b, b.right, -1);

      // bumpers
      b.bumpers.forEach(B => bumperCollision(b, B));

      // walls & drains
      walls(b);

      // draw
      ctx.clearRect(0, 0, W, H);
      drawTable(ctx, W, H, b);
      drawBall(ctx, b);
      drawUI(ctx, W, H, b);

      if (running) b.raf = requestAnimationFrame(loop);
    }

    function drawTable(ctx, W, H, b) {
      // table background
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0, "#0f1630");
      grad.addColorStop(1, "#0b1020");
      ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
      // borders
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 10; ctx.strokeRect(6, 46, W-12, H-52);
      // top arch
      ctx.beginPath(); ctx.arc(W/2, 46, 140, Math.PI, 0); ctx.stroke();
      // shooter lane guide
      ctx.beginPath(); ctx.moveTo(W*0.7, H-120); ctx.lineTo(W*0.7, 46); ctx.stroke();

      // lanes/bumpers
      ctx.fillStyle = "#1c2750";
      ctx.fillRect(16, 54, W-32, 6);
      // bumpers
      b.bumpers.forEach(B => {
        ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, Math.PI*2);
        ctx.fillStyle = "#223066"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#6ecbfd"; ctx.stroke();
        ctx.beginPath(); ctx.arc(B.x, B.y, B.r*0.6, 0, Math.PI*2);
        ctx.fillStyle = "#5cf2f2"; ctx.fill();
      });

      // flippers
      drawFlipper(ctx, b.left, 1);
      drawFlipper(ctx, b.right, -1);

      // plunger well
      ctx.fillStyle = "#132042"; ctx.fillRect(W*0.72, H-160, W*0.2, 140);
      // plunger power meter
      ctx.fillStyle = "#5cf2f2"; const ph = (b.plunger.power / b.plunger.max) * 120; ctx.fillRect(W*0.92 - 10, H-40 - ph, 6, ph);
    }

    function drawFlipper(ctx, flip, dir) {
      const x2 = flip.cx + Math.cos(flip.angle) * flip.len * dir;
      const y2 = flip.cy + Math.sin(flip.angle) * flip.len * dir;
      ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffd166';
      ctx.beginPath(); ctx.moveTo(flip.cx, flip.cy); ctx.lineTo(x2, y2); ctx.stroke();
      // pivot
      ctx.lineWidth = 6; ctx.strokeStyle = '#ffe6a6';
      ctx.beginPath(); ctx.arc(flip.cx, flip.cy, 8, 0, Math.PI*2); ctx.stroke();
    }

    function drawBall(ctx, b) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fillStyle = '#e2e8f0'; ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.stroke();
    }

    function drawUI(ctx, W, H, b) {
      ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = '#e7efff';
      ctx.fillText(`Score: ${b.score}`, 14, 24);
      ctx.fillText(`Balls: ${b.balls}`, W-90, 24);
      if (!running) {
        ctx.fillText('Press Start or Space to launch', 14, H - 12);
      }
    }

    // kick things off
    startGame();

    return () => {
      cancelAnimationFrame(world.current.raf);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  }, [running]);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full grid place-items-center p-4 bg-[radial-gradient(1200px_800px_at_70%_-20%,#1a2a6c,#0b1020_70%)] text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_260px] gap-4 items-start">
        <canvas ref={canvasRef} className="bg-[#0f1630] rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_8px_20px_rgba(0,0,0,.4)]" width={360} height={640} />
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur">
          <h1 className="text-xl font-bold mb-2">🧲 Pinball</h1>
          <div className="grid gap-2">
            <div className="flex justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span>Score</span><strong>{score}</strong></div>
            <div className="flex justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span>Balls</span><strong>{balls}</strong></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="rounded-lg font-bold px-3 py-2 bg-cyan-300 text-cyan-950 shadow" onClick={() => { setRunning(true); }}>Start</button>
            <button className="rounded-lg font-bold px-3 py-2 border border-white/20" onClick={() => { setRunning(false); }}>Pause</button>
          </div>
          <p className="text-xs opacity-90 mt-2">Controls: ←/→ (or A/D) flippers · Space to launch</p>
        </div>
      </div>
    </div>
  );
}
