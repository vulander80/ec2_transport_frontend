import React, { useEffect, useMemo, useRef, useState } from "react";

export default function TetrisGame() {
  // ----------- Refs & State -----------
  const boardRef = useRef(null);
  const nextRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  // constants kept stable
  const constants = useMemo(() => ({ COLS: 10, ROWS: 20, BLOCK: 30 }), []);

  // game object kept in ref to avoid rerenders
  const game = useRef({});

  // ---- Toast ----
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 1200);
  };

  useEffect(() => {
    const { COLS, ROWS, BLOCK } = constants;
    const canvas = boardRef.current;
    const ctx = canvas.getContext("2d");
    const nextCanvas = nextRef.current;
    const nctx = nextCanvas.getContext("2d");

    const COLORS = {
      0: "rgba(255,255,255,0.06)",
      I: "#00e5ff",
      O: "#ffd500",
      T: "#b968ff",
      S: "#45f1a9",
      Z: "#ff6b6b",
      J: "#4db1ff",
      L: "#ffa94d",
      G: "#33406b",
    };

    const SHAPES = {
      I: [[0, 1],[1, 1],[2, 1],[3, 1]],
      O: [[1, 0],[2, 0],[1, 1],[2, 1]],
      T: [[1, 0],[0, 1],[1, 1],[2, 1]],
      S: [[1, 1],[2, 1],[0, 2],[1, 2]],
      Z: [[0, 1],[1, 1],[1, 2],[2, 2]],
      J: [[0, 0],[0, 1],[1, 1],[2, 1]],
      L: [[2, 0],[0, 1],[1, 1],[2, 1]],
    };

    const BAG = ["I", "O", "T", "S", "Z", "J", "L"];

    const createMatrix = (w, h) => Array.from({ length: h }, () => Array(w).fill(0));
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    const randBag = () => { if (game.current.bag.length === 0) game.current.bag = shuffle([...BAG]); return game.current.bag.pop(); };

    const newPiece = (type) => ({ type, x: 3, y: -2, cells: SHAPES[type].map(([x, y]) => ({ x, y })) });
    const clonePiece = (p) => ({ type: p.type, x: p.x, y: p.y, cells: p.cells.map((c) => ({ ...c })) });

    const rotatePiece = (p, dir) => {
      const rotated = clonePiece(p);
      rotated.cells = p.cells.map(({ x, y }) => ({ x: dir > 0 ? -y : y, y: dir > 0 ? x : -x }));
      const minX = Math.min(...rotated.cells.map((c) => c.x));
      const minY = Math.min(...rotated.cells.map((c) => c.y));
      rotated.cells.forEach((c) => { c.x -= minX; c.y -= minY; });
      return rotated;
    };

    const offsetPiece = (p, dx, dy) => { const q = clonePiece(p); q.x += dx; q.y += dy; return q; };

    const collide = (p) => {
      for (const c of p.cells) {
        const x = p.x + c.x, y = p.y + c.y;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && game.current.board[y][x]) return true;
      }
      return false;
    };

    const merge = (p) => { p.cells.forEach((c) => { const x = p.x + c.x, y = p.y + c.y; if (y >= 0) game.current.board[y][x] = p.type; }); };

    const clearLines = () => {
      let cleared = 0;
      outer: for (let y = ROWS - 1; y >= 0; --y) {
        for (let x = 0; x < COLS; ++x) if (!game.current.board[y][x]) continue outer;
        const row = game.current.board.splice(y, 1)[0].fill(0);
        game.current.board.unshift(row);
        ++cleared; ++y;
      }
      if (cleared) {
        const table = [0, 40, 100, 300, 1200];
        game.current.score += table[cleared] * game.current.level;
        game.current.lines += cleared;
        if (game.current.lines >= game.current.level * 10) {
          game.current.level++;
          game.current.dropInterval = Math.max(100, 1000 - (game.current.level - 1) * 70);
        }
        setScore(game.current.score);
        setLines(game.current.lines);
        setLevel(game.current.level);
        showToast(`${cleared} line${cleared > 1 ? "s" : ""}!`);
      }
    };

    const hardDrop = () => {
      let ghost = clonePiece(game.current.cur);
      while (!collide(offsetPiece(ghost, 0, 1))) ghost.y++;
      game.current.cur.y = ghost.y;
      step();
    };

    const spawn = () => {
      if (!game.current.next) game.current.next = newPiece(randBag());
      game.current.cur = game.current.next;
      game.current.next = newPiece(randBag());
      game.current.cur.x = 3; game.current.cur.y = -2;
      if (collide(game.current.cur)) {
        setRunning(false); game.current.running = false; game.current.paused = false; showToast("Game Over — Press R to restart");
      }
      drawNext();
    };

    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1 + 0.5, y1 + 0.5); ctx.lineTo(x2 + 0.5, y2 + 0.5); ctx.stroke(); };
    const roundRect = (ctx2d, x, y, w, h, r) => { ctx2d.beginPath(); ctx2d.moveTo(x + r, y); ctx2d.arcTo(x + w, y, x + w, y + h, r); ctx2d.arcTo(x + w, y + h, x, y + h, r); ctx2d.arcTo(x, y + h, x, y, r); ctx2d.arcTo(x, y, x + w, y, r); ctx2d.closePath(); };

    const drawCell = (x, y, type, ctx2d, size) => {
      const s = size || BLOCK; const pad = Math.max(2, s * 0.08);
      ctx2d.fillStyle = COLORS[type] || "#fff";
      const px = x * s, py = y * s;
      roundRect(ctx2d, px + pad / 2, py + pad / 2, s - pad, s - pad, 6);
      ctx2d.fill();
      ctx2d.globalAlpha = 0.12; ctx2d.fillStyle = "#fff";
      roundRect(ctx2d, px + pad, py + pad, (s - pad) * 0.9, (s - pad) * 0.5, 6);
      ctx2d.fill(); ctx2d.globalAlpha = 1;
    };

    const drawGrid = () => {
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.05)";
      for (let x = 1; x < COLS; x++) line(x * BLOCK, 0, x * BLOCK, ROWS * BLOCK);
      for (let y = 1; y < ROWS; y++) line(0, y * BLOCK, COLS * BLOCK, y * BLOCK);
    };

    const drawGhost = (x, y) => {
      const s = BLOCK; const pad = Math.max(2, s * 0.08);
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = COLORS.G;
      roundRect(ctx, x * s + pad / 2, y * s + pad / 2, s - pad, s - pad, 6);
      ctx.fill(); ctx.restore();
    };

    const drawNext = () => {
      nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      const s = 24; const ox = 3, oy = 1;
      if (!game.current.next) return;
      game.current.next.cells.forEach((c) => drawCell(ox + c.x, oy + c.y, game.current.next.type, nctx, s));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (game.current.board[y][x]) drawCell(x, y, game.current.board[y][x], ctx);
      const ghost = clonePiece(game.current.cur);
      while (!collide(offsetPiece(ghost, 0, 1))) ghost.y++;
      ghost.cells.forEach((c) => { const gx = ghost.x + c.x, gy = ghost.y + c.y; if (gy >= 0) drawGhost(gx, gy); });
      game.current.cur.cells.forEach((c) => { const x = game.current.cur.x + c.x, y = game.current.cur.y + c.y; if (y >= 0) drawCell(x, y, game.current.cur.type, ctx); });
    };

    const step = (time = 0) => {
      if (!game.current.running || game.current.paused) return;
      const dt = time - game.current.lastTime; game.current.lastTime = time; game.current.dropCounter += dt;
      if (game.current.dropCounter > game.current.dropInterval) {
        const q = offsetPiece(game.current.cur, 0, 1);
        if (!collide(q)) game.current.cur = q; else { merge(game.current.cur); clearLines(); spawn(); }
        game.current.dropCounter = 0;
      }
      draw();
      game.current.raf = requestAnimationFrame(step);
    };

    game.current.start = () => {
      game.current.board = createMatrix(COLS, ROWS);
      game.current.score = 0; game.current.lines = 0; game.current.level = 1; game.current.dropInterval = 1000; setScore(0); setLines(0); setLevel(1);
      game.current.bag = []; game.current.next = newPiece(randBag());
      game.current.running = true; setRunning(true); game.current.paused = false; setPaused(false);
      spawn(); game.current.lastTime = performance.now(); game.current.dropCounter = 0;
      cancelAnimationFrame(game.current.raf); game.current.raf = requestAnimationFrame(step);
    };

    game.current.pauseToggle = () => {
      if (!game.current.running) return;
      game.current.paused = !game.current.paused; setPaused(game.current.paused);
      showToast(game.current.paused ? "Paused" : "Resumed");
      if (!game.current.paused) { game.current.lastTime = performance.now(); cancelAnimationFrame(game.current.raf); game.current.raf = requestAnimationFrame(step); }
    };

    game.current.tryMove = (dx, dy) => { const q = offsetPiece(game.current.cur, dx, dy); if (!collide(q)) { game.current.cur = q; draw(); return true; } return false; };
    game.current.tryRotate = (dir) => {
      const r = rotatePiece(game.current.cur, dir);
      let tests = [[0, 0],[1, 0],[-1, 0],[2, 0],[-2, 0]];
      for (const [dx, dy] of tests) { const q = offsetPiece({ ...r }, dx, dy); if (!collide(q)) { game.current.cur = q; draw(); return true; } }
      return false;
    };

    game.current.hardDrop = hardDrop;

    const onKey = (e) => {
      if ((e.target instanceof HTMLElement) && e.target.closest("input, textarea, button")) return;
      switch (e.code) {
        case "ArrowLeft": e.preventDefault(); game.current.tryMove(-1, 0); break;
        case "ArrowRight": e.preventDefault(); game.current.tryMove(1, 0); break;
        case "ArrowDown": e.preventDefault(); game.current.tryMove(0, 1); break;
        case "ArrowUp": e.preventDefault(); game.current.tryRotate(1); break;
        case "Space": e.preventDefault(); game.current.hardDrop(); break;
        case "KeyP": game.current.pauseToggle(); break;
        case "KeyR": game.current.start(); break;
        default: break;
      }
    };

    window.addEventListener("keydown", onKey);
    game.current.start();

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(game.current.raf);
    };
  }, [constants]);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full grid place-items-center p-4 bg-[radial-gradient(1200px_800px_at_70%_-20%,#1a2a6c,#0b1020_70%)] text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_260px] gap-4 items-start">
        <canvas ref={boardRef} width={300} height={600} className="bg-[#0f1630] rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_8px_20px_rgba(0,0,0,.4)]" />
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur">
          <h1 className="text-xl font-bold mb-2">🎮 Tetris</h1>
          <div className="grid gap-2">
            <div className="flex justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span>Score</span><strong>{score}</strong></div>
            <div className="flex justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span>Lines</span><strong>{lines}</strong></div>
            <div className="flex justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span>Level</span><strong>{level}</strong></div>
          </div>
          <div className="mt-3">
            <strong className="block mb-1">Next</strong>
            <canvas ref={nextRef} width={180} height={120} className="w-full h-[120px] bg-[#0f1630] rounded-lg shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="rounded-lg font-bold px-3 py-2 bg-cyan-300 text-cyan-950 shadow" onClick={() => game.current.start()}>Start</button>
            <button className="rounded-lg font-bold px-3 py-2 border border-white/20" onClick={() => game.current.pauseToggle()}>Pause</button>
            <button className="rounded-lg font-semibold px-3 py-2 border border-white/20" onClick={() => game.current.tryMove(-1,0)}>◀</button>
            <button className="rounded-lg font-semibold px-3 py-2 border border-white/20" onClick={() => game.current.tryMove(1,0)}>▶</button>
            <button className="rounded-lg font-semibold px-3 py-2 border border-white/20" onClick={() => game.current.tryRotate(1)}>⟳</button>
            <button className="rounded-lg font-bold px-3 py-2 bg-cyan-300 text-cyan-950 shadow" onClick={() => game.current.hardDrop()}>Drop ⤓</button>
          </div>
          <p className="text-xs opacity-90 mt-2">Controls: ←/→ move · ↑ rotate · ↓ soft drop · Space hard drop · P pause · R restart</p>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 inset-x-0 grid place-items-center pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/60 border border-white/20 text-xs">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
