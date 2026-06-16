import React, { useState, useEffect } from 'react';
import { handcraftedStageRegistry } from './handcraftedStageRegistry';
import { launchLabStorage } from './launchLabStorage';
import { PlayableHandcraftedJetpacStage } from '../LaunchLabTypes';

interface HandcraftedCampaignMenuProps {
  onBack: () => void;
  onPlayStage: (stages: PlayableHandcraftedJetpacStage[], index: number) => void;
}

export default function HandcraftedCampaignMenu({ onBack, onPlayStage }: HandcraftedCampaignMenuProps) {
  const [stages, setStages] = useState<PlayableHandcraftedJetpacStage[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    // Merge built-in and local handcrafted stages
    setStages(handcraftedStageRegistry.getMergedHandcraftedStages());
    setProgress(launchLabStorage.getProgress());
  }, []);

  const handleClearProgress = () => {
    if (confirm('Are you sure you want to completely erase your campaign completion progress? This will reset your unlocked stages.')) {
      localStorage.removeItem('neonJetpac.handcrafted.progress.v1');
      setProgress({});
    }
  };

  return (
    <div className="absolute inset-0 bg-[#020205] text-cyan-100 flex flex-col z-20 overflow-y-auto font-sans">
      
      {/* Header Panel */}
      <div className="border-b border-cyan-950/80 bg-black/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-3xl font-bold tracking-tight italic text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            HANDCRAFTED CAMPAIGN
          </h2>
          <p className="text-xs text-cyan-700 tracking-wider uppercase font-mono mt-0.5">
            Play handcrafted levels and visual drafts in progression
          </p>
        </div>
        <button 
          onClick={onBack}
          className="border border-cyan-800 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-400 font-mono text-sm px-4 py-2 uppercase tracking-wider transition-all"
        >
          &lt; Title Screen
        </button>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6 select-none font-mono text-left">
        
        {/* Campaign Info Cards */}
        <div className="border border-cyan-950 bg-black/40 p-4 rounded text-xs text-cyan-800 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-cyan-400 font-bold uppercase mb-1">Sector Directives:</div>
            Complete levels in order to unlock subsequent sectors. Designing and promoting custom level blueprints in the <span className="text-cyan-500 font-bold">Launch Lab</span> will seamlessly add stages to the end of your campaign!
          </div>
          {Object.keys(progress).length > 0 && (
            <button
              onClick={handleClearProgress}
              className="px-3 py-1 font-semibold text-[10px] text-red-500/70 border border-red-950 hover:border-red-600 hover:bg-red-950/10 rounded transition-all uppercase"
            >
              Reset Progress
            </button>
          )}
        </div>

        {/* Stages Grid List */}
        <div className="flex flex-col gap-2">
          {stages.length === 0 ? (
            <div className="border border-dashed border-cyan-950 bg-black/20 p-16 text-center text-sm text-cyan-800 font-mono">
              No handcrafted stages detected.<br/>
              Create and promote custom stages in the Launch Lab to initiate your campaign portfolio!
            </div>
          ) : (
            stages.map((st, idx) => {
              // Progression lock check:
              // First stage is unlocked. For others (index > 0), they are unlocked only if the preceding stage is marked completed.
              const prevStageId = idx > 0 ? (stages[idx - 1] as any).promotedId : null;
              const prevCompleted = prevStageId ? progress[prevStageId]?.completed === true : true;
              const isUnlocked = idx === 0 || prevCompleted;
              
              const stageId = (st as any).promotedId;
              const stat = progress[stageId] || { completed: false, bestScore: 0, bestTime: null, attempts: 0 };
              
              return (
                <div 
                  key={stageId}
                  className={`border p-4 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isUnlocked
                      ? 'border-cyan-950/80 bg-[#030308]/60 hover:border-cyan-800'
                      : 'border-cyan-950 bg-black/10 opacity-30 select-none'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold font-sans text-cyan-805 tracking-wider w-12 text-center border-r border-cyan-950">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-cyan-300 uppercase leading-snug">
                          {st.title}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-900 text-cyan-500 rounded uppercase">
                          {st.profile.objective}
                        </span>
                        {(st as any).builtIn ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-900 text-cyan-500 rounded uppercase">
                            CORE
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[#1a0f28] border border-purple-900 text-purple-400 rounded uppercase">
                            USER DESIGN
                          </span>
                        )}
                        {stat.completed && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-950 border border-green-900 text-green-400 rounded uppercase font-bold">
                            ✓ SOLVED
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] text-cyan-700 uppercase mt-0.5 tracking-wider">
                        {st.subtitle || 'HANDCRAFTED CAMPAIGN SECTOR'}
                      </div>
                      
                      {stat.attempts > 0 && (
                        <div className="text-[10px] text-cyan-800 mt-1 flex gap-4">
                          <span>Attempts: {stat.attempts}</span>
                          {stat.bestScore > 0 && <span>High: {stat.bestScore}</span>}
                          {stat.bestTime && <span>Best: {Math.floor(stat.bestTime / 60)}s</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isUnlocked ? (
                      <button
                        onClick={() => onPlayStage(stages, idx)}
                        className="w-full sm:w-auto px-5 py-2 hover:bg-cyan-950 text-cyan-400 border border-cyan-900 hover:border-cyan-400 text-xs uppercase font-bold transition-all shadow-md hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      >
                        Launch Mission
                      </button>
                    ) : (
                      <div className="text-xs uppercase font-bold text-cyan-900 px-3 py-1 bg-black/40 border border-black/40 rounded italic select-none">
                        ✖ SECTOR LOCKED
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
