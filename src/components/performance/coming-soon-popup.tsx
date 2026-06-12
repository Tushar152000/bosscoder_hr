'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, Trophy, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TARGETS = ['⭐', '🚀', '🎯', '💡', '🏆', '🎉', '✨', '🌟', '🎊', '🔥'];
const GRID = 9;
const GAME_SECS = 30;
const SHOW_MS = 900;
const INTERVAL_MS = 1100;

type GameState = 'idle' | 'playing' | 'done';

function getMessage(score: number) {
  if (score >= 15) return '🏆 Legendary! You\'re a natural.';
  if (score >= 10) return '🎯 Impressive! Sharp reflexes.';
  if (score >= 5)  return '🌟 Nice work! Keep it up.';
  return '😄 Fun, right? Try again!';
}

export function PerformanceComingSoonPopup() {
  const router = useRouter();
  const [open, setOpen]             = useState(true);

  const handleClose = useCallback(() => {
    setOpen(false);
    router.push('/');
  }, [router]);
  const [game, setGame]             = useState<GameState>('idle');
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(GAME_SECS);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [activeEmoji, setActiveEmoji] = useState('⭐');
  const [hitCell, setHitCell]       = useState<number | null>(null);
  const [missCell, setMissCell]     = useState<number | null>(null);

  const moleRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (moleRef.current)  clearInterval(moleRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideRef.current)  clearTimeout(hideRef.current);
  };

  useEffect(() => () => clearAll(), []);

  const spawnMole = useCallback(() => {
    const cell  = Math.floor(Math.random() * GRID);
    const emoji = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    setActiveCell(cell);
    setActiveEmoji(emoji);
    hideRef.current = setTimeout(() => setActiveCell(null), SHOW_MS);
  }, []);

  const startGame = useCallback(() => {
    clearAll();
    setScore(0);
    setTimeLeft(GAME_SECS);
    setActiveCell(null);
    setHitCell(null);
    setMissCell(null);
    setGame('playing');
    moleRef.current  = setInterval(spawnMole, INTERVAL_MS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearAll();
          setActiveCell(null);
          setGame('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [spawnMole]);

  const handleCell = useCallback((idx: number) => {
    if (game !== 'playing') return;
    if (activeCell === idx) {
      setScore((s) => s + 1);
      setHitCell(idx);
      setActiveCell(null);
      setTimeout(() => setHitCell(null), 280);
    } else {
      setMissCell(idx);
      setTimeout(() => setMissCell(null), 280);
    }
  }, [game, activeCell]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 text-blue-300 hover:text-white transition z-10"
          aria-label="Close"
        >
          <X size={17} />
        </button>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#0C447C] via-[#1260a8] to-[#1a6bb5] px-6 pt-7 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-3">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h2 className="text-white text-[17px] font-semibold leading-tight">Performance Evaluation</h2>
          <p className="text-blue-200/90 text-[12px] mt-1 leading-relaxed">
            Your HR team is setting things up.<br />You'll be the first to know when it's ready.
          </p>
        </div>

        {/* Game zone */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-center text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-3">
            Kill time with a quick game
          </p>

          {game === 'idle' && (
            <div className="text-center space-y-3 py-2">
              <p className="text-[12.5px] text-slate-500 leading-relaxed">
                Emojis pop up in the grid — tap them before they vanish!<br />
                You have <span className="font-semibold text-slate-700">30 seconds</span>.
              </p>
              <div className="grid grid-cols-3 gap-2 opacity-40 pointer-events-none">
                {Array.from({ length: GRID }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-xl">
                    {i === 4 ? '⭐' : ''}
                  </div>
                ))}
              </div>
              <button
                onClick={startGame}
                className="mt-1 inline-flex items-center gap-2 bg-[#0C447C] text-white px-7 py-2.5 rounded-xl text-[13px] font-medium hover:bg-[#0a3a6a] active:scale-95 transition-all"
              >
                Start playing →
              </button>
            </div>
          )}

          {(game === 'playing' || game === 'done') && (
            <div className="space-y-3">
              {/* HUD */}
              <div className="flex items-center justify-between px-1">
                <span className={cn(
                  'flex items-center gap-1.5 text-[12px] font-semibold',
                  score > 0 ? 'text-amber-500' : 'text-slate-400'
                )}>
                  <Trophy size={13} /> {score} pts
                </span>
                <span className={cn(
                  'flex items-center gap-1.5 text-[12px] font-semibold tabular-nums',
                  timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-500'
                )}>
                  <Clock size={13} /> {timeLeft}s
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: GRID }).map((_, idx) => {
                  const isActive = activeCell === idx;
                  const isHit    = hitCell === idx;
                  const isMiss   = missCell === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCell(idx)}
                      disabled={game === 'done'}
                      className={cn(
                        'h-[60px] rounded-xl border-2 text-2xl flex items-center justify-center transition-all duration-100 select-none',
                        isActive  && 'border-[#0C447C] bg-[#EBF3FE] scale-[1.08] shadow-md cursor-pointer',
                        isHit     && 'border-green-400 bg-green-50 scale-95',
                        isMiss    && 'border-red-300 bg-red-50 scale-95',
                        !isActive && !isHit && !isMiss && 'border-slate-200 bg-slate-50/80 cursor-default',
                      )}
                    >
                      {isActive ? activeEmoji : isHit ? '✓' : isMiss ? '✕' : ''}
                    </button>
                  );
                })}
              </div>

              {game === 'done' && (
                <div className="text-center pt-1 space-y-2 animate-in fade-in duration-300">
                  <p className="text-[14px] font-semibold text-slate-800">{getMessage(score)}</p>
                  <p className="text-[12px] text-slate-500">Final score: <span className="font-bold text-amber-500">{score}</span></p>
                  <button
                    onClick={startGame}
                    className="text-[12px] text-[#0C447C] underline underline-offset-2 hover:text-[#0a3a6a]"
                  >
                    Play again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-start gap-3 border-t border-slate-100 px-5 py-4 bg-slate-50/80">
          <Bell size={14} className="text-[#0C447C] mt-0.5 shrink-0" />
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            You'll get a notification here as soon as HR rolls out the evaluation cycle for your team.
          </p>
        </div>
      </div>
    </div>
  );
}
