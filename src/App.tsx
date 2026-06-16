import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { input } from './game/Input';
import { audio } from './game/Audio';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS } from './game/Constants';

// Launch Lab & Campaign components
import LaunchLabHome from './game/launchLab/LaunchLabHome';
import LaunchLabEditor from './game/launchLab/LaunchLabEditor';
import HandcraftedCampaignMenu from './game/launchLab/HandcraftedCampaignMenu';
import { LaunchLabDraft, PlayableHandcraftedJetpacStage } from './game/LaunchLabTypes';
import { launchLabStorage } from './game/launchLab/launchLabStorage';
import LaserOptionsModal from './components/LaserOptionsModal';
import JumpSettingsModal, { DEFAULT_P1_JUMP, DEFAULT_P2_JUMP, JumpConfig } from './components/JumpSettingsModal';
import SettingsModal from './components/SettingsModal';

type ScreenState = 'TITLE' | 'LAUNCH_LAB_HOME' | 'LAUNCH_LAB_EDITOR' | 'HANDCRAFTED_CAMPAIGN_MENU' | 'PLAYING' | 'PLAYTEST_PLAYING';

const DEFAULT_P1_LASER = {
  particleType: 'line',
  size: 6,
  width: 85, // Extended default as requested
  color: '#00ffff',
  colorCycle: 'none',
  travelLength: 33,
  speed: 16,
  glowInDark: true,
  cooldown: 150
};

const DEFAULT_P2_LASER = {
  particleType: 'line',
  size: 6,
  width: 85, // Extended default as requested
  color: '#00ff00',
  colorCycle: 'none',
  travelLength: 33,
  speed: 16,
  glowInDark: true,
  cooldown: 150
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState('START');
  const [screenState, setScreenState] = useState<ScreenState>('TITLE');
  const [score, setScore] = useState(0);
  const [isTouch, setIsTouch] = useState(false);
  const [playerMode, setPlayerMode] = useState<'onePlayer' | 'twoPlayerTurns' | 'twoPlayerCoop' | 'twoPlayerDeathmatch'>('onePlayer');
  
  const [showLaserCustomizer, setShowLaserCustomizer] = useState(false);
  const [showJumpCustomizer, setShowJumpCustomizer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [p1JumpConfig, setP1JumpConfig] = useState<JumpConfig>(() => {
    try {
      const stored = localStorage.getItem('neon_jetpac_p1_jump');
      return stored ? { ...DEFAULT_P1_JUMP, ...JSON.parse(stored) } : { ...DEFAULT_P1_JUMP };
    } catch (e) {
      return { ...DEFAULT_P1_JUMP };
    }
  });

  const [p2JumpConfig, setP2JumpConfig] = useState<JumpConfig>(() => {
    try {
      const stored = localStorage.getItem('neon_jetpac_p2_jump');
      return stored ? { ...DEFAULT_P2_JUMP, ...JSON.parse(stored) } : { ...DEFAULT_P2_JUMP };
    } catch (e) {
      return { ...DEFAULT_P2_JUMP };
    }
  });
  
  const [p1LaserConfig, setP1LaserConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('neon_jetpac_p1_laser');
      return stored ? { ...DEFAULT_P1_LASER, ...JSON.parse(stored) } : { ...DEFAULT_P1_LASER };
    } catch (e) {
      return { ...DEFAULT_P1_LASER };
    }
  });

  const [p2LaserConfig, setP2LaserConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('neon_jetpac_p2_laser');
      return stored ? { ...DEFAULT_P2_LASER, ...JSON.parse(stored) } : { ...DEFAULT_P2_LASER };
    } catch (e) {
      return { ...DEFAULT_P2_LASER };
    }
  });
  
  // Launch Lab Draft state
  const [activeDraft, setActiveDraft] = useState<LaunchLabDraft | null>(null);
  const [campaignList, setCampaignList] = useState<any[]>([]);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);

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
      engineRef.current.playMode = mode === 'CLASSIC' ? 'classic' : 'standard';
      engineRef.current.playerMode = playerMode;
      engineRef.current.persistedRocketType = null; // Clear persisted rocket types for new runs
      engineRef.current.p1Score = 0;
      engineRef.current.p2Score = 0;
      engineRef.current.p1Lives = 3;
      engineRef.current.p2Lives = 3;
      engineRef.current.score = 0;
      engineRef.current.lives = 3;
      engineRef.current.stage = 1;
      engineRef.current.options = { 
        playerMode,
        p1LaserConfig,
        p2LaserConfig,
        p1JumpConfig,
        p2JumpConfig
      };
      engineRef.current.initStage();
      setGameState('PLAYING');
      setScreenState('PLAYING');
      
      // Need user gesture to start AudioContext reliably
      audio.playShoot(); 
    }
  };

  const handlePlayHandcraftedStage = (stages: PlayableHandcraftedJetpacStage[], index: number) => {
    if (engineRef.current) {
      setCampaignList(stages);
      setCurrentCampaignIndex(index);

      engineRef.current.gameMode = 'STANDARD';
      engineRef.current.playMode = 'handcrafted';
      engineRef.current.profileList = stages.map(s => s.profile);
      engineRef.current.profileIndex = index;
      engineRef.current.stage = index + 1;
      engineRef.current.score = 0;
      engineRef.current.lives = 3;
      
      // Setup stage callbacks
      engineRef.current.options = {
        mode: 'handcrafted',
        profiles: stages.map(s => s.profile),
        startStageIndex: index,
        playerMode,
        p1LaserConfig,
        p2LaserConfig,
        p1JumpConfig,
        p2JumpConfig,
        onStageComplete: (summary) => {
          if (summary) {
            const currentStage = stages[index];
            launchLabStorage.saveStageProgress(currentStage.promotedId, summary);
            
            if (summary.result === 'launched') {
              const nextIndex = index + 1;
              if (nextIndex < stages.length) {
                // Instantly cycle onto next campaign sector
                handlePlayHandcraftedStage(stages, nextIndex);
              } else {
                // Clear state
                if (engineRef.current) engineRef.current.state = 'START';
                setGameState('START');
                setScreenState('HANDCRAFTED_CAMPAIGN_MENU');
              }
            } else {
              setGameState('GAMEOVER');
            }
          }
        }
      };

      engineRef.current.initStage();
      setGameState('PLAYING');
      setScreenState('PLAYING');
      audio.playShoot();
    }
  };

  const handlePlaytest = (profile: any) => {
    if (engineRef.current && activeDraft) {
      // Update and save the draft with the newest edited profile immediately
      const updatedDraft = {
        ...activeDraft,
        name: profile.name || activeDraft.name,
        profile: profile
      };
      launchLabStorage.saveDraft(updatedDraft);
      setActiveDraft(updatedDraft);

      engineRef.current.gameMode = 'STANDARD';
      engineRef.current.playMode = 'editorTest';
      engineRef.current.profileList = [profile];
      engineRef.current.profileIndex = 0;
      engineRef.current.stage = 1;
      engineRef.current.score = 0;
      engineRef.current.lives = 3;

      engineRef.current.options = {
        mode: 'editorTest',
        profiles: [profile],
        startStageIndex: 0,
        playerMode,
        p1LaserConfig,
        p2LaserConfig,
        p1JumpConfig,
        p2JumpConfig,
        onStageComplete: (summary) => {
          if (summary) {
             const updatedWithSummary = {
               ...updatedDraft,
               lastTestSummary: summary
             };
             launchLabStorage.saveDraft(updatedWithSummary);
             setActiveDraft(updatedWithSummary);
          }
          handleQuitPlaytest();
        }
      };

      engineRef.current.initStage();
      setGameState('PLAYING');
      setScreenState('PLAYTEST_PLAYING');
      audio.playShoot();
    }
  };

  const handleQuitPlaytest = () => {
    if (engineRef.current) {
      engineRef.current.state = 'START';
      setGameState('START');
      setScreenState('LAUNCH_LAB_EDITOR');
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#020205] flex items-center justify-center overflow-hidden selection:bg-cyan-900">
      
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

        {/* TITLE SCREEN / START MENU */}
        {gameState === 'START' && screenState === 'TITLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10 transition-opacity">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
               background: 'radial-gradient(circle at 50% 50%, #00ffff 0%, transparent 60%)',
               mixBlendMode: 'screen'
            }}></div>
            <h1 
              className="text-6.5xl md:text-8xl font-bold italic tracking-tighter mb-1"
              style={{ color: NEON_COLORS.CYAN, textShadow: `0 0 20px ${NEON_COLORS.CYAN}, 0 0 40px ${NEON_COLORS.MAGENTA}` }}
            >
              NEON JETPAC
            </h1>
            <p className="text-cyan-200 text-xs md:text-[13px] font-mono tracking-widest mb-6 opacity-90 text-center uppercase border-b border-cyan-800/80 pb-3 leading-relaxed">
              Build the Rocket. • Fuel the Rift. • Launch into Chaos.
            </p>

            {/* PLAYER MODE SELECTOR GRID */}
            <div className="mb-6 flex flex-col items-center max-w-sm w-full px-4">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400/80 uppercase mb-2">ENGAGEMENT PROTOCOL</span>
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={() => { setPlayerMode('onePlayer'); audio.playPickup(); }}
                  className={`px-3 py-1.5 border font-mono text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    playerMode === 'onePlayer' 
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]' 
                      : 'border-cyan-950 bg-black/40 text-cyan-700 hover:border-cyan-800 hover:text-cyan-500'
                  }`}
                >
                  <span className="font-bold">1 PLAYER</span>
                  <span className="text-[9px] opacity-60">Classic Solo</span>
                </button>
                <button
                  onClick={() => { setPlayerMode('twoPlayerTurns'); audio.playPickup(); }}
                  className={`px-3 py-1.5 border font-mono text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    playerMode === 'twoPlayerTurns' 
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]' 
                      : 'border-cyan-950 bg-black/40 text-cyan-700 hover:border-cyan-800 hover:text-cyan-500'
                  }`}
                >
                  <span className="font-bold">2P TURNS</span>
                  <span className="text-[9px] opacity-60">Alternating</span>
                </button>
                <button
                  onClick={() => { setPlayerMode('twoPlayerCoop'); audio.playPickup(); }}
                  className={`px-3 py-1.5 border font-mono text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    playerMode === 'twoPlayerCoop' 
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20 shadow-[0_0_12px_rgba(52,211,153,0.3)]' 
                      : 'border-cyan-950 bg-black/40 text-cyan-700 hover:border-cyan-800 hover:text-cyan-500'
                  }`}
                >
                  <span className="font-bold">2P CO-OP</span>
                  <span className="text-[9px] opacity-60">Same Screen</span>
                </button>
                <button
                  onClick={() => { setPlayerMode('twoPlayerDeathmatch'); audio.playPickup(); }}
                  className={`px-3 py-1.5 border font-mono text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    playerMode === 'twoPlayerDeathmatch' 
                      ? 'border-pink-500 text-pink-400 bg-pink-950/20 shadow-[0_0_12px_rgba(236,72,153,0.3)]' 
                      : 'border-cyan-950 bg-black/40 text-cyan-700 hover:border-cyan-800 hover:text-cyan-500'
                  }`}
                >
                  <span className="font-bold">DEATHMATCH</span>
                  <span className="text-[9px] opacity-60">1v1 PvP Duel</span>
                </button>
              </div>
            </div>
            
            <div className="grid gap-3.5 w-72">
               <button 
                 onClick={() => handleStart('STANDARD')}
                 className="relative group overflow-hidden px-8 py-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-lg hover:text-black transition-all cursor-pointer"
               >
                 <span className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out z-0"></span>
                 <span className="relative z-10 font-mono tracking-wider uppercase">FEVER DREAM RUN</span>
                 <div className="absolute inset-0 shadow-[0_0_20px_#00ffff_inset] opacity-50 group-hover:opacity-100"></div>
               </button>
               
               <button 
                 onClick={() => handleStart('CLASSIC')}
                 className="relative group overflow-hidden px-8 py-2.5 bg-transparent border border-cyan-700 hover:border-cyan-400 text-cyan-500 hover:text-cyan-400 font-bold text-base transition-all font-mono cursor-pointer"
               >
                 <span className="relative z-10 tracking-widest">CLASSIC ARCADE</span>
               </button>

               <button 
                 onClick={() => setScreenState('HANDCRAFTED_CAMPAIGN_MENU')}
                 className="relative group overflow-hidden px-8 py-2.5 bg-transparent border border-purple-800 hover:border-purple-400 text-purple-400 hover:text-purple-300 font-bold text-base transition-all font-mono shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] cursor-pointer"
               >
                 <span className="relative z-10 tracking-widest">PLAY CAMPAIGNS</span>
               </button>

               <button 
                 onClick={() => setScreenState('LAUNCH_LAB_HOME')}
                 className="relative group overflow-hidden px-8 py-2.5 bg-[#031520]/20 border border-cyan-900 hover:border-cyan-400 text-cyan-600 hover:text-cyan-400 font-bold text-base transition-all font-mono cursor-pointer"
               >
                 <span className="relative z-10 tracking-widest">LAUNCH LAB (EDITOR)</span>
               </button>

               <button 
                 onClick={() => { setShowLaserCustomizer(true); audio.playPowerup(); }}
                 className="relative group overflow-hidden px-8 py-2.5 bg-transparent border border-pink-700 hover:border-pink-400 text-pink-500 hover:text-pink-400 font-bold text-base transition-all font-mono shadow-[0_0_15px_rgba(244,63,94,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] cursor-pointer"
               >
                 <span className="relative z-10 tracking-widest">⚡ CUSTOM LASER LAB</span>
                </button>

                <button 
                  onClick={() => { setShowJumpCustomizer(true); audio.playPowerup(); }}
                  className="relative group overflow-hidden px-8 py-2.5 bg-transparent border border-emerald-700 hover:border-emerald-400 text-emerald-500 hover:text-emerald-400 font-bold text-base transition-all font-mono shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  <span className="relative z-10 tracking-widest">⚙️ PLATFORMER JUMP LAB</span>
               </button>

               <button 
                 onClick={() => { setShowSettings(true); audio.playPowerup(); }}
                 className="relative group overflow-hidden px-8 py-2.5 bg-transparent border border-cyan-500 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 font-bold text-base transition-all font-mono shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
               >
                 <span className="relative z-10 tracking-widest">⚙️ SYSTEM CONFIGURATION / KEYS</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-1 items-center mt-6 font-mono text-[11.5px] text-center">
              {playerMode === 'onePlayer' ? (
                <div className="text-cyan-500/80">
                  <span className="text-cyan-400 font-bold">CONTROLS:</span> Arrow Keys to Jetpack/Jump • SPACE to Laser Fire
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="text-cyan-400/95">
                    <span className="font-bold text-cyan-300">PLAYER 1:</span> Arrow Keys (Move) • SPACE (Shoot)
                  </div>
                  <div className="text-emerald-400/95">
                    <span className="font-bold text-emerald-300">PLAYER 2:</span> W / A / S / D (Move) • F (Shoot)
                  </div>
                </div>
              )}
              <div className="text-[10px] text-cyan-800 mt-1">Press "I" for Infinite Lives • "+" to Skip Level</div>
            </div>
          </div>
        )}

        {/* GAMEOVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-10 transition-opacity">
            <h2 className="text-5xl font-bold text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] font-sans">PLAYER DISMANTLED</h2>
            <p className="text-2xl text-cyan-300 mb-8 font-mono tracking-widest">SCORE: {score}</p>
            <button 
              onClick={() => {
                if (engineRef.current) engineRef.current.state = 'START';
                setGameState('START');
                
                // Return to appropriate sub-menu
                if (screenState === 'PLAYING') {
                  setScreenState('TITLE');
                } else {
                  // Keep custom mode state
                  setScreenState(screenState);
                }
              }}
              className="px-8 py-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-lg hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_30px_#00ffff] transition-all font-mono uppercase"
            >
              Continue
            </button>
          </div>
        )}

        {/* ON-SCREEN PLAYTEST RETURN FLOATER */}
        {screenState === 'PLAYTEST_PLAYING' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#050510]/90 border border-cyan-800 p-2.5 rounded shadow-[0_0_15px_rgba(6,182,212,0.3)] flex gap-4 items-center">
            <span className="text-xs text-cyan-400 font-mono font-bold uppercase tracking-wider">Playtest Active</span>
            <button 
              onClick={handleQuitPlaytest}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black text-[11px] font-mono font-bold uppercase rounded cursor-pointer transition-colors"
            >
              Stop Test
            </button>
          </div>
        )}

        {/* SUBMENU PANEL: HANDCRAFTED CAMPAIGN */}
        {gameState === 'START' && screenState === 'HANDCRAFTED_CAMPAIGN_MENU' && (
          <HandcraftedCampaignMenu
            onBack={() => setScreenState('TITLE')}
            onPlayStage={handlePlayHandcraftedStage}
          />
        )}

        {/* SUBMENU PANEL: LAUNCH LAB PORTAL */}
        {gameState === 'START' && screenState === 'LAUNCH_LAB_HOME' && (
          <LaunchLabHome
            onBack={() => setScreenState('TITLE')}
            onEditDraft={(draft) => {
              setActiveDraft(draft);
              setScreenState('LAUNCH_LAB_EDITOR');
            }}
            onPlayCampaign={(stages, index) => handlePlayHandcraftedStage(stages as any, index)}
          />
        )}

        {/* SUBMENU PANEL: LAUNCH LAB EDITOR */}
        {gameState === 'START' && screenState === 'LAUNCH_LAB_EDITOR' && activeDraft && (
          <LaunchLabEditor
            draft={activeDraft}
            onClose={() => {
              setActiveDraft(null);
              setScreenState('LAUNCH_LAB_HOME');
            }}
            onPlaytest={handlePlaytest}
          />
        )}

      </div>

      {/* MOBILE TOUCH CONTROLS OVERLAY */}
      {isTouch && screenState !== 'TITLE' && screenState !== 'LAUNCH_LAB_HOME' && screenState !== 'LAUNCH_LAB_EDITOR' && screenState !== 'HANDCRAFTED_CAMPAIGN_MENU' && gameState !== 'GAMEOVER' && (
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
            
            {/* Right Actions */}
            <div className="flex gap-4">
              <button 
                className="w-16 h-16 rounded-full border-2 border-cyan-400/50 bg-cyan-400/20 active:bg-cyan-400/50 flex items-center justify-center"
                onTouchStart={(e) => { e.preventDefault(); input.touchFire = true; }}
                onTouchEnd={(e) => { e.preventDefault(); input.touchFire = false; }}
              >
                <span className="text-white opacity-50 block font-mono">F</span>
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

      {/* Laser Weapon Lab Calibration Portal */}
      {showLaserCustomizer && (
        <LaserOptionsModal
          p1Config={p1LaserConfig}
          p2Config={p2LaserConfig}
          onChangeP1={(cfg) => {
            setP1LaserConfig(cfg);
            localStorage.setItem('neon_jetpac_p1_laser', JSON.stringify(cfg));
            if (engineRef.current) {
              if (!engineRef.current.options) engineRef.current.options = {};
              engineRef.current.options.p1LaserConfig = cfg;
              const p1 = engineRef.current.players.find(p => p.playerId === 1);
              if (p1) p1.laserConfig = cfg;
            }
          }}
          onChangeP2={(cfg) => {
            setP2LaserConfig(cfg);
            localStorage.setItem('neon_jetpac_p2_laser', JSON.stringify(cfg));
            if (engineRef.current) {
              if (!engineRef.current.options) engineRef.current.options = {};
              engineRef.current.options.p2LaserConfig = cfg;
              const p2 = engineRef.current.players.find(p => p.playerId === 2);
              if (p2) p2.laserConfig = cfg;
            }
          }}
          onClose={() => setShowLaserCustomizer(false)}
        />
      )}

      {/* Retro Platformer Physics Calibration Portal */}
      {showJumpCustomizer && (
        <JumpSettingsModal
          p1Config={p1JumpConfig}
          p2Config={p2JumpConfig}
          onChangeP1={(cfg) => {
            setP1JumpConfig(cfg);
            localStorage.setItem('neon_jetpac_p1_jump', JSON.stringify(cfg));
            if (engineRef.current) {
              if (!engineRef.current.options) engineRef.current.options = {};
              engineRef.current.options.p1JumpConfig = cfg;
              const p1 = engineRef.current.players.find(p => p.playerId === 1);
              if (p1) p1.jumpConfig = cfg;
            }
          }}
          onChangeP2={(cfg) => {
            setP2JumpConfig(cfg);
            localStorage.setItem('neon_jetpac_p2_jump', JSON.stringify(cfg));
            if (engineRef.current) {
              if (!engineRef.current.options) engineRef.current.options = {};
              engineRef.current.options.p2JumpConfig = cfg;
              const p2 = engineRef.current.players.find(p => p.playerId === 2);
              if (p2) p2.jumpConfig = cfg;
            }
          }}
          onClose={() => setShowJumpCustomizer(false)}
        />
      )}

      {/* Settings Modal Config Deck */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
