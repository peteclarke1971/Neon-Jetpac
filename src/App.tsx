import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { input } from './game/Input';
import { audio } from './game/Audio';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS } from './game/Constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState('START');
  const [score, setScore] = useState(0);
  const [isTouch, setIsTouch] = useState(false);
  
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        engineRef.current = new GameEngine(ctx);
        setGameState(engineRef.current.state);
        
        let lastTime = performance.now();
        let accumulator = 0;
        const TARGET_FPS = 60;
        const STEP = 1000 / TARGET_FPS;
        
        const loop = (time: number) => {
          const dt = Math.min(time - lastTime, 100);
          lastTime = time;
          accumulator += dt;

          if (engineRef.current) {
            while (accumulator >= STEP) {
              engineRef.current.update();
              accumulator -= STEP;
            }
            engineRef.current.draw();
            
            // Sync state occasionally for UI overlays
            if (engineRef.current.frameCount % 10 === 0) {
              setGameState(engineRef.current.state);
              setScore(engineRef.current.score);
            }
          }
          requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
      }
    }
    
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const handleStart = (mode: 'STANDARD' | 'CLASSIC') => {
    if (engineRef.current) {
      engineRef.current.gameMode = mode;
      engineRef.current.score = 0;
      engineRef.current.lives = 3;
      engineRef.current.stage = 1;
      engineRef.current.initStage();
      setGameState('PLAYING');
      
      // Need user gesture to start AudioContext reliably
      audio.playShoot(); 
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#020205] flex items-center justify-center overflow-hidden font-mono selection:bg-cyan-900">
      
      {/* Game Canvas Container */}
      <div 
        className="relative shadow-[0_0_100px_rgba(0,255,255,0.15)] border border-cyan-900/30 rounded-lg overflow-hidden shrink-0"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        }}
      >
        <canvas 
          ref={canvasRef} 
          width={GAME_WIDTH} 
          height={GAME_HEIGHT}
          className="block bg-transparent"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* CRT Scanline Overlay - Made more subtle for AAA feel */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-30 mix-blend-overlay"></div>

        {/* START SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 transition-opacity">
            <h1 
              className="text-6xl md:text-8xl font-bold italic tracking-tighter mb-8"
              style={{ color: NEON_COLORS.CYAN, textShadow: `0 0 20px ${NEON_COLORS.CYAN}` }}
            >
              NEON PAC
            </h1>
            
            <button 
              onClick={() => handleStart('CLASSIC')}
              className="px-12 py-4 mb-4 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-2xl hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_30px_#00ffff] transition-all"
            >
              START GAME
            </button>
            <button className="px-8 py-2 mb-2 bg-transparent border border-cyan-400/30 text-cyan-400/60 font-bold text-lg hover:border-cyan-400/80 hover:text-cyan-400/80 transition-all">
              SETTINGS
            </button>
            <button className="px-8 py-2 mb-2 bg-transparent border border-cyan-400/30 text-cyan-400/60 font-bold text-lg hover:border-cyan-400/80 hover:text-cyan-400/80 transition-all">
              HOW TO PLAY
            </button>
            <button className="px-8 py-2 mb-2 bg-transparent border border-cyan-400/30 text-cyan-400/60 font-bold text-lg hover:border-cyan-400/80 hover:text-cyan-400/80 transition-all">
              HIGH SCORES
            </button>
          </div>
        )}

        {/* GAMEOVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 transition-opacity">
            <h2 className="text-5xl font-bold text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">GAME OVER</h2>
            <p className="text-2xl text-white mb-8">SCORE: {score}</p>
            <button 
              onClick={() => {
                if (engineRef.current) engineRef.current.state = 'START';
                setGameState('START');
              }}
              className="px-8 py-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-xl hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_30px_#00ffff] transition-all"
            >
              RETURN TO TITLE
            </button>
          </div>
        )}
      </div>

      {/* MOBILE TOUCH CONTROLS OVERLAY */}
      {isTouch && gameState !== 'START' && gameState !== 'GAMEOVER' && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-end pb-8 px-4">
          <div className="flex justify-between w-full max-w-2xl mx-auto pointer-events-auto">
            {/* Left D-PAD */}
            <div className="flex gap-4">
              <button 
                className="w-16 h-16 rounded-full border-2 border-white/30 bg-white/10 active:bg-white/30 flex items-center justify-center"
                onTouchStart={(e) => { e.preventDefault(); input.touchLeft = true; }}
                onTouchEnd={(e) => { e.preventDefault(); input.touchLeft = false; }}
              >
                <span className="text-white opacity-50 block rotate-180">➜</span>
              </button>
              <button 
                className="w-16 h-16 rounded-full border-2 border-white/30 bg-white/10 active:bg-white/30 flex items-center justify-center"
                onTouchStart={(e) => { e.preventDefault(); input.touchRight = true; }}
                onTouchEnd={(e) => { e.preventDefault(); input.touchRight = false; }}
              >
                <span className="text-white opacity-50 block">➜</span>
              </button>
            </div>
            
            {/* Right Actons */}
            <div className="flex gap-4">
              <button 
                className="w-16 h-16 rounded-full border-2 border-cyan-400/50 bg-cyan-400/20 active:bg-cyan-400/50 flex items-center justify-center"
                onTouchStart={(e) => { e.preventDefault(); input.touchFire = true; }}
                onTouchEnd={(e) => { e.preventDefault(); input.touchFire = false; }}
              >
                <span className="text-white opacity-50 block">F</span>
              </button>
              <button 
                className="w-16 h-16 mb-8 rounded-full border-2 border-magenta-400/50 bg-[#ff00ff20] active:bg-[#ff00ff50] flex items-center justify-center"
                style={{ borderColor: NEON_COLORS.MAGENTA }}
                onTouchStart={(e) => { e.preventDefault(); input.touchUp = true; }}
                onTouchEnd={(e) => { e.preventDefault(); input.touchUp = false; }}
              >
                <span className="text-white opacity-50 block -rotate-90">➜</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

