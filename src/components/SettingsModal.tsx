import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Settings, 
  Volume2, 
  Gamepad, 
  Keyboard, 
  Activity, 
  Check, 
  RotateCcw, 
  Sliders, 
  VolumeX, 
  Flame, 
  Zap 
} from 'lucide-react';
import { audio } from '../game/Audio';
import { input, PlayerBindings } from '../game/Input';

interface SettingsModalProps {
  onClose: () => void;
}

type TabType = 'KEYBOARD' | 'GAMEPAD' | 'ACCESSIBILITY' | 'AUDIO';

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('KEYBOARD');
  
  // Binding capture states
  const [listeningFor, setListeningFor] = useState<{
    playerId: 1 | 2;
    type: 'KEYBOARD' | 'GAMEPAD';
    action: keyof PlayerBindings;
  } | null>(null);

  // Trigger state synchronization to re-render when local state shifts
  const [syncState, setSyncState] = useState(0);

  // Active gamepad list for diagnostic/mapping feedback shadow checking
  const [connectedGamepads, setConnectedGamepads] = useState<Gamepad[]>([]);

  // Sound Volume scale state
  const [volume, setVolume] = useState(() => {
    const v = (window as any).__soundVolume;
    return v !== undefined ? Math.round(v * 100) : 100;
  });

  // Toggles
  const [p1AutoFire, setP1AutoFire] = useState(() => (window as any).__p1AutoFire || false);
  const [p2AutoFire, setP2AutoFire] = useState(() => (window as any).__p2AutoFire || false);
  const [showFPS, setShowFPS] = useState(() => (window as any).__showFPS || false);
  const [rumbleEnabled, setRumbleEnabled] = useState(() => (window as any).__rumbleEnabled !== false);

  // Scan for connected gamepads
  const refreshGamepads = () => {
    if (navigator.getGamepads) {
      const gpts = Array.from(navigator.getGamepads()).filter(g => g !== null) as Gamepad[];
      setConnectedGamepads(gpts);
    }
  };

  useEffect(() => {
    refreshGamepads();
    window.addEventListener('gamepadconnected', refreshGamepads);
    window.addEventListener('gamepaddisconnected', refreshGamepads);
    return () => {
      window.removeEventListener('gamepadconnected', refreshGamepads);
      window.removeEventListener('gamepaddisconnected', refreshGamepads);
    };
  }, []);

  // Keyboard binding capture listener
  useEffect(() => {
    if (!listeningFor || listeningFor.type !== 'KEYBOARD') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const code = e.code;
      
      const { playerId, action } = listeningFor;
      if (playerId === 1) {
        input.p1Bindings[action] = code;
      } else {
        input.p2Bindings[action] = code;
      }

      input.saveSettings();
      audio.playPickup();
      
      setListeningFor(null);
      setSyncState(prev => prev + 1);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningFor]);

  // Gamepad binding capture ticker
  useEffect(() => {
    if (!listeningFor || listeningFor.type !== 'GAMEPAD') return;

    let active = true;
    let frameId: number;

    const pollGamepad = () => {
      if (!active) return;

      const { playerId, action } = listeningFor;
      const gpIndex = input.getGamepadIndexForPlayer(playerId);
      
      if (gpIndex !== null) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[gpIndex];
        
        if (gp) {
          // 1. Scan Buttons
          for (let b = 0; b < gp.buttons.length; b++) {
            if (gp.buttons[b] && gp.buttons[b].pressed) {
              const mapping = `button_${b}`;
              if (playerId === 1) {
                input.p1GamepadBindings[action] = mapping;
              } else {
                input.p2GamepadBindings[action] = mapping;
              }
              input.saveSettings();
              input.rumble(playerId, 150, 0.6, 0.6);
              audio.playPickup();
              setListeningFor(null);
              setSyncState(prev => prev + 1);
              active = false;
              return;
            }
          }

          // 2. Scan Axes
          for (let a = 0; a < gp.axes.length; a++) {
            const val = gp.axes[a];
            if (Math.abs(val) > 0.6) {
              const dir = val > 0 ? 'positive' : 'negative';
              const mapping = `axis_${a}_${dir}`;
              if (playerId === 1) {
                input.p1GamepadBindings[action] = mapping;
              } else {
                input.p2GamepadBindings[action] = mapping;
              }
              input.saveSettings();
              input.rumble(playerId, 150, 0.6, 0.6);
              audio.playPickup();
              setListeningFor(null);
              setSyncState(prev => prev + 1);
              active = false;
              return;
            }
          }
        }
      }

      frameId = requestAnimationFrame(pollGamepad);
    };

    frameId = requestAnimationFrame(pollGamepad);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [listeningFor]);

  // Save specific configurations
  const handleToggleAutoFire = (player: 1 | 2) => {
    audio.playPickup();
    if (player === 1) {
      const next = !p1AutoFire;
      setP1AutoFire(next);
      (window as any).__p1AutoFire = next;
    } else {
      const next = !p2AutoFire;
      setP2AutoFire(next);
      (window as any).__p2AutoFire = next;
    }
    input.saveSettings();
  };

  const handleToggleFPS = () => {
    audio.playPickup();
    const next = !showFPS;
    setShowFPS(next);
    (window as any).__showFPS = next;
    input.saveSettings();
  };

  const handleToggleRumble = () => {
    audio.playPowerup();
    const next = !rumbleEnabled;
    setRumbleEnabled(next);
    (window as any).__rumbleEnabled = next;
    input.saveSettings();
    if (next) {
      input.rumble(1, 250, 0.8, 0.8);
      input.rumble(2, 250, 0.8, 0.8);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    const floatVal = val / 100;
    (window as any).__soundVolume = floatVal;
    input.saveSettings();
  };

  const handleResetDefaults = () => {
    audio.playLaunch();
    input.resetAllSettings();
    
    // Sync local visual states
    setVolume(100);
    setP1AutoFire(false);
    setP2AutoFire(false);
    setShowFPS(false);
    setRumbleEnabled(true);
    setSyncState(prev => prev + 1);
  };

  // Convert key codes to user-friendly labels
  const formatKeyName = (keyName: string) => {
    if (!keyName) return 'NONE';
    return keyName
      .replace('ArrowLeft', '🡄 Arrow Left')
      .replace('ArrowRight', '🡆 Arrow Right')
      .replace('ArrowUp', '🡅 Arrow Up')
      .replace('ArrowDown', '🡇 Arrow Down')
      .replace('Space', '⎵ Spacebar')
      .replace('Key', '')
      .toUpperCase();
  };

  const formatGamepadLabel = (bindValue: string) => {
    if (!bindValue) return 'NOT LOADED';
    if (bindValue.startsWith('button_')) {
      const idx = bindValue.replace('button_', '');
      
      // Standard Xbox / Nintendo labels mapping helper
      if (idx === '0') return '🅇 Button A / Cross';
      if (idx === '1') return '🅇 Button B / Circle';
      if (idx === '2') return '🅇 Button X / Square';
      if (idx === '3') return '🅇 Button Y / Triangle';
      if (idx === '4') return '🅇 Left Bumper (L1)';
      if (idx === '5') return '🅇 Right Bumper (R1)';
      if (idx === '6') return '🅇 Left Trigger (L2)';
      if (idx === '7') return '🅇 Right Trigger (R2)';
      if (idx === '8') return '🅇 Share / Select';
      if (idx === '9') return '🅇 Start / Options';
      if (idx === '10') return '🅇 Left Stick Press';
      if (idx === '11') return '🅇 Right Stick Press';
      if (idx === '12') return '🡅 D-Pad Up';
      if (idx === '13') return '🡇 D-Pad Down';
      if (idx === '14') return '🡄 D-Pad Left';
      if (idx === '15') return '🡆 D-Pad Right';
      
      return `🕹️ Button ${idx}`;
    }
    if (bindValue.startsWith('axis_')) {
      const parts = bindValue.split('_');
      const axisIdx = parts[1];
      const direct = parts[2] === 'positive' ? '🡾 Right / Down' : '🡼 Left / Up';
      return `🕹️ Stick Axis ${axisIdx} (${direct})`;
    }
    return bindValue;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 select-none font-mono">
      <div className="relative bg-[#020208] border-2 border-cyan-500/50 rounded-xl overflow-hidden w-full max-w-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh]">
        
        {/* Holographic header design block */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
        <div className="bg-[#05051a] px-5 py-4 border-b border-cyan-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Settings className="w-5 h-5 text-cyan-400 animate-spin-slow" />
             <div>
                <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">SYS_DECK CONFIG</h2>
                <p className="text-[9px] text-cyan-600 uppercase">Input and system engine parameters</p>
             </div>
          </div>
          <button 
            onClick={() => { audio.playDrop(); onClose(); }}
            className="p-1 px-2.5 rounded bg-cyan-950/40 hover:bg-red-900/40 text-cyan-500 hover:text-red-400 border border-cyan-900 hover:border-red-600/50 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-cyan-950 bg-black/40 text-[10px] md:text-xs">
          <button 
            onClick={() => { audio.playPickup(); setActiveTab('KEYBOARD'); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'KEYBOARD' 
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
                : 'border-transparent text-cyan-700 hover:text-cyan-500 hover:bg-cyan-950/5'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>KEYBOARD</span>
          </button>
          <button 
            onClick={() => { audio.playPickup(); setActiveTab('GAMEPAD'); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'GAMEPAD' 
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20' 
                : 'border-transparent text-emerald-700 hover:text-emerald-500 hover:bg-emerald-950/5'
            }`}
          >
            <Gamepad className="w-3.5 h-3.5" />
            <span>GAMEPAD</span>
          </button>
          <button 
            onClick={() => { audio.playPickup(); setActiveTab('ACCESSIBILITY'); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'ACCESSIBILITY' 
                ? 'border-pink-500 text-pink-400 bg-pink-950/20' 
                : 'border-transparent text-pink-700 hover:text-pink-500 hover:bg-pink-950/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>INTELLI_COATS</span>
          </button>
          <button 
            onClick={() => { audio.playPickup(); setActiveTab('AUDIO'); }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'AUDIO' 
                ? 'border-purple-500 text-purple-400 bg-purple-950/20' 
                : 'border-transparent text-purple-700 hover:text-purple-500 hover:bg-purple-950/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>SFX STATE</span>
          </button>
        </div>

        {/* Tab Contents Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-cyan-200">
          
          {/* 1. KEYBOARD CONTROLS */}
          {activeTab === 'KEYBOARD' && (
            <div className="space-y-6">
              
              {/* Player 1 Bindings block */}
              <div className="border border-cyan-900/40 rounded-lg p-3 sm:p-4 bg-cyan-950/10">
                <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-cyan-900/20">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <h3 className="text-[11px] sm:text-xs font-bold text-cyan-300 uppercase">PLAYER 1 KEYBOARD ASSIGNMENTS</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
                  {(Object.keys(input.p1Bindings) as Array<keyof PlayerBindings>).map((action) => {
                    const activeKey = input.p1Bindings[action];
                    const isRecording = listeningFor?.playerId === 1 && listeningFor?.action === action && listeningFor?.type === 'KEYBOARD';

                    return (
                      <div key={action} className="flex items-center justify-between bg-black/40 border border-cyan-950 p-2 rounded">
                        <span className="font-bold text-cyan-600 uppercase">{action === 'up' ? 'JETPACK (UP)' : action.toUpperCase()}</span>
                        <button
                          onClick={() => {
                            audio.playPickup();
                            setListeningFor({ playerId: 1, type: 'KEYBOARD', action });
                          }}
                          className={`min-w-24 px-2 py-1 border transition-all text-center rounded text-[10px] uppercase font-bold cursor-pointer ${
                            isRecording 
                              ? 'border-pink-500 text-pink-400 bg-pink-950/30 animate-pulse' 
                              : 'border-cyan-800 text-cyan-300 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40'
                          }`}
                        >
                          {isRecording ? 'KEY NOW...' : formatKeyName(activeKey)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Player 2 Bindings block */}
              <div className="border border-emerald-950/40 rounded-lg p-3 sm:p-4 bg-emerald-950/5">
                <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-emerald-900/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <h3 className="text-[11px] sm:text-xs font-bold text-emerald-300 uppercase">PLAYER 2 KEYBOARD ASSIGNMENTS</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
                  {(Object.keys(input.p2Bindings) as Array<keyof PlayerBindings>).map((action) => {
                    const activeKey = input.p2Bindings[action];
                    const isRecording = listeningFor?.playerId === 2 && listeningFor?.action === action && listeningFor?.type === 'KEYBOARD';

                    return (
                      <div key={action} className="flex items-center justify-between bg-black/40 border border-emerald-950 p-2 rounded">
                        <span className="font-bold text-emerald-600 uppercase">{action === 'up' ? 'JETPACK (UP)' : action.toUpperCase()}</span>
                        <button
                          onClick={() => {
                            audio.playPickup();
                            setListeningFor({ playerId: 2, type: 'KEYBOARD', action });
                          }}
                          className={`min-w-24 px-2 py-1 border transition-all text-center rounded text-[10px] uppercase font-bold cursor-pointer ${
                            isRecording 
                              ? 'border-pink-500 text-pink-400 bg-pink-950/30 animate-pulse' 
                              : 'border-emerald-800 text-emerald-300 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40'
                          }`}
                        >
                          {isRecording ? 'KEY NOW...' : formatKeyName(activeKey)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 2. GAMEPAD / JOYPAD CONFIG */}
          {activeTab === 'GAMEPAD' && (
            <div className="space-y-6">
              
              {/* Connected gamepads diagnostics */}
              <div className="p-3 border border-dashed border-emerald-900/40 rounded-lg bg-emerald-950/5 flex items-center justify-between gap-4">
                 <div>
                    <h4 className="text-[10px] text-emerald-400 uppercase font-bold">JOYPAD_LINK DECTECTION STATUS:</h4>
                    <p className="text-[9px] text-cyan-600/90 leading-tight uppercase mt-0.5">
                       {connectedGamepads.length > 0
                          ? `CONNECTED DEVICES [${connectedGamepads.length}]: ${connectedGamepads.map(g => g.id.slice(0, 20) + '...').join(', ')}`
                          : 'No active controllers detected in current frame. Press any gamepad button to awake connection.'}
                    </p>
                 </div>
                 <button 
                   onClick={() => { refreshGamepads(); audio.playPickup(); }} 
                   className="px-2.5 py-1 text-[9px] font-bold border border-emerald-800 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 rounded cursor-pointer uppercase shrink-0 transition-colors"
                 >
                    POLL STATE
                 </button>
              </div>

              {/* Player 1 Gamepad calibration */}
              <div className="border border-cyan-900/40 rounded-lg p-3 sm:p-4 bg-cyan-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-1.5 border-b border-cyan-900/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                    <span className="text-[11px] sm:text-xs font-bold text-cyan-300 uppercase">P1 JOYPAD CALIBRATOR</span>
                  </div>
                  
                  {/* Select Gamepad mode */}
                  <div className="flex items-center gap-1.5 self-end">
                    <span className="text-[9px] text-cyan-600">INPUT PORT:</span>
                    <select
                      value={input.p1Gamepad}
                      onChange={(e) => {
                        audio.playPickup();
                        input.p1Gamepad = e.target.value;
                        input.saveSettings();
                        setSyncState(p => p + 1);
                      }}
                      className="bg-black/80 text-[10px] p-0.5 px-2 border border-cyan-800 text-cyan-300 rounded focus:outline-none"
                    >
                      <option value="auto">Auto Port (Default)</option>
                      <option value="0">Index 0 (P1 Controller)</option>
                      <option value="1">Index 1 (P2 Controller)</option>
                      <option value="none">Disabled</option>
                    </select>
                  </div>
                </div>

                {input.p1Gamepad !== 'none' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
                    {(Object.keys(input.p1GamepadBindings) as Array<keyof PlayerBindings>).map((action) => {
                      const bindValue = input.p1GamepadBindings[action];
                      const isRecording = listeningFor?.playerId === 1 && listeningFor?.action === action && listeningFor?.type === 'GAMEPAD';

                      return (
                        <div key={action} className="flex items-center justify-between bg-black/40 border border-cyan-950 p-2 rounded">
                          <span className="font-bold text-cyan-600 uppercase">{action === 'up' ? 'JETPACK (UP)' : action.toUpperCase()}</span>
                          <button
                            onClick={() => {
                              audio.playPickup();
                              setListeningFor({ playerId: 1, type: 'GAMEPAD', action });
                            }}
                            className={`min-w-28 px-2 py-1 border transition-all text-center rounded text-[10px] uppercase font-bold cursor-pointer ${
                              isRecording 
                                ? 'border-pink-500 text-pink-400 bg-pink-950/30 animate-pulse' 
                                : 'border-cyan-850 text-cyan-300 hover:border-cyan-400 bg-cyan-950/15 hover:bg-cyan-950/35'
                            }`}
                          >
                            {isRecording ? 'PRESS BUTTON...' : formatGamepadLabel(bindValue)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-cyan-600 text-center py-2 uppercase">Joystick linkage is deactivated for Player 1.</p>
                )}
              </div>

              {/* Player 2 Gamepad calibration */}
              <div className="border border-emerald-950/40 rounded-lg p-3 sm:p-4 bg-emerald-950/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-1.5 border-b border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-300 uppercase">P2 JOYPAD CALIBRATOR</span>
                  </div>
                  
                  {/* Select Gamepad mode */}
                  <div className="flex items-center gap-1.5 self-end">
                    <span className="text-[9px] text-emerald-600">INPUT PORT:</span>
                    <select
                      value={input.p2Gamepad}
                      onChange={(e) => {
                        audio.playPickup();
                        input.p2Gamepad = e.target.value;
                        input.saveSettings();
                        setSyncState(p => p + 1);
                      }}
                      className="bg-black/80 text-[10px] p-0.5 px-2 border border-emerald-800 text-emerald-300 rounded focus:outline-none"
                    >
                      <option value="auto">Auto Port (Default)</option>
                      <option value="0">Index 0 (P1 Controller)</option>
                      <option value="1">Index 1 (P2 Controller)</option>
                      <option value="none">Disabled</option>
                    </select>
                  </div>
                </div>

                {input.p2Gamepad !== 'none' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
                    {(Object.keys(input.p2GamepadBindings) as Array<keyof PlayerBindings>).map((action) => {
                      const bindValue = input.p2GamepadBindings[action];
                      const isRecording = listeningFor?.playerId === 2 && listeningFor?.action === action && listeningFor?.type === 'GAMEPAD';

                      return (
                        <div key={action} className="flex items-center justify-between bg-black/40 border border-emerald-950 p-2 rounded">
                          <span className="font-bold text-emerald-600 uppercase">{action === 'up' ? 'JETPACK (UP)' : action.toUpperCase()}</span>
                          <button
                            onClick={() => {
                              audio.playPickup();
                              setListeningFor({ playerId: 2, type: 'GAMEPAD', action });
                            }}
                            className={`min-w-28 px-2 py-1 border transition-all text-center rounded text-[10px] uppercase font-bold cursor-pointer ${
                              isRecording 
                                ? 'border-pink-500 text-pink-400 bg-pink-950/30 animate-pulse' 
                                : 'border-emerald-850 text-emerald-300 hover:border-emerald-500 bg-emerald-950/15 hover:bg-emerald-950/35'
                            }`}
                          >
                            {isRecording ? 'PRESS BUTTON...' : formatGamepadLabel(bindValue)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-600 text-center py-2 uppercase">Joystick linkage is deactivated for Player 2.</p>
                )}
              </div>

            </div>
          )}

          {/* 3. ACCESSIBILITY & HUD TOGGLES */}
          {activeTab === 'ACCESSIBILITY' && (
            <div className="space-y-4">
              
              <div className="border border-pink-900/30 rounded-lg p-4 bg-pink-950/5 space-y-4">
                
                {/* Auto Fire Player 1 */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-pink-950/30 rounded">
                   <div>
                      <span className="text-xs font-bold text-pink-400 tracking-wider block uppercase">AUTO FIRE (PLAYER 1)</span>
                      <span className="text-[9px] text-cyan-600 block uppercase">Perfect for younger children. Lasers trigger constantly on recharge tick.</span>
                   </div>
                   <button
                     onClick={() => handleToggleAutoFire(1)}
                     className={`w-14 py-1.5 border rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                       p1AutoFire 
                         ? 'border-pink-500 text-pink-400 bg-pink-950/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                         : 'border-cyan-950 text-cyan-800 bg-black/50 hover:border-cyan-800'
                     }`}
                   >
                     {p1AutoFire ? 'ON' : 'OFF'}
                   </button>
                </div>

                {/* Auto Fire Player 2 */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-pink-950/30 rounded">
                   <div>
                      <span className="text-xs font-bold text-pink-400 tracking-wider block uppercase">AUTO FIRE (PLAYER 2)</span>
                      <span className="text-[9px] text-cyan-600 block uppercase">Continuous blaster output for Player 2.</span>
                   </div>
                   <button
                     onClick={() => handleToggleAutoFire(2)}
                     className={`w-14 py-1.5 border rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                       p2AutoFire 
                         ? 'border-pink-500 text-pink-400 bg-pink-950/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                         : 'border-cyan-950 text-cyan-800 bg-black/50 hover:border-cyan-800'
                     }`}
                   >
                     {p2AutoFire ? 'ON' : 'OFF'}
                   </button>
                </div>

                {/* Dual Rumble Toggle */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-pink-950/30 rounded">
                   <div>
                      <span className="text-xs font-bold text-emerald-400 tracking-wider block uppercase">CONTROLLER CHASSIS VIBRATION</span>
                      <span className="text-[9px] text-cyan-600 block uppercase">Forces haptic pulse feedback when taking spacecraft damage or during rocket launches.</span>
                   </div>
                   <button
                     onClick={handleToggleRumble}
                     className={`w-14 py-1.5 border rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                       rumbleEnabled 
                         ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40 shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
                         : 'border-cyan-950 text-cyan-800 bg-black/50 hover:border-cyan-800'
                     }`}
                   >
                     {rumbleEnabled ? 'ON' : 'OFF'}
                   </button>
                </div>

                {/* Diagnostic FPS Counter overlay */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-pink-950/30 rounded">
                   <div>
                      <span className="text-xs font-bold text-cyan-400 tracking-wider block uppercase">DIAGNOSTIC FRAME COUNTER (FPS)</span>
                      <span className="text-[9px] text-cyan-600 block uppercase">Displays steady real-time frame rates in bottom-right margin during gameplay.</span>
                   </div>
                   <button
                     onClick={handleToggleFPS}
                     className={`w-14 py-1.5 border rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                       showFPS 
                         ? 'border-cyan-500 text-cyan-400 bg-cyan-950/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                         : 'border-cyan-950 text-cyan-800 bg-black/50 hover:border-cyan-800'
                     }`}
                   >
                     {showFPS ? 'ON' : 'OFF'}
                   </button>
                </div>

              </div>

            </div>
          )}

          {/* 4. AUDIO SYSTEM CONFIGURATION */}
          {activeTab === 'AUDIO' && (
            <div className="space-y-6">
              
              <div className="border border-purple-900/30 rounded-lg p-5 bg-purple-950/5 space-y-6">
                 
                 <div className="flex items-center justify-between">
                    <div>
                       <h3 className="text-sm font-bold text-purple-400 uppercase">SYS_AUDIO CALIBRATION WAVE</h3>
                       <p className="text-[10px] text-cyan-600 uppercase">Align internal dac envelope output decibels</p>
                    </div>
                    {volume > 0 ? (
                       <Volume2 className="w-5 h-5 text-purple-400 animate-pulse" />
                    ) : (
                       <VolumeX className="w-5 h-5 text-red-500" />
                    )}
                 </div>

                 {/* Volume slide control */}
                 <div className="space-y-3">
                    <div className="flex justify-between text-xs font-mono font-bold">
                       <span className="text-cyan-500 uppercase">VOLUME LEVEL:</span>
                       <span className="text-purple-400">{volume}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] text-cyan-800">MIN_MUTE</span>
                       <input 
                         type="range" 
                         min="0" 
                         max="100" 
                         value={volume}
                         onChange={handleVolumeChange}
                         onMouseUp={() => audio.playShoot()}
                         className="flex-1 accent-purple-500 bg-cyan-950 h-1.5 rounded cursor-pointer"
                       />
                       <span className="text-[10px] text-purple-500">MAX_BOOST</span>
                    </div>
                 </div>

                 <div className="text-[9px] text-cyan-600/90 leading-relaxed uppercase border-t border-cyan-900/20 pt-4">
                    NOTE: Modern browsers require a click gesture on the screen during initial boot-up to safely launch the Node AudioContext engine reliably.
                 </div>

              </div>

            </div>
          )}

        </div>

        {/* Diagnostic Footer control deck */}
        <div className="bg-[#030310] px-5 py-4 border-t border-cyan-950 flex flex-col sm:flex-row gap-3 items-center justify-between text-[10px]">
          <button 
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/60 hover:border-red-500 text-red-500 hover:text-red-400 bg-red-950/10 hover:bg-red-950/30 rounded font-bold cursor-pointer transition-all uppercase w-full sm:w-auto justify-center"
          >
             <RotateCcw className="w-3.5 h-3.5" />
             <span>RE-ALIGN ORIGIN (RESET)</span>
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
               onClick={() => { audio.playDrop(); onClose(); }}
               className="flex-1 sm:flex-initial px-6 py-2 border border-cyan-800 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-400 hover:text-cyan-300 rounded font-bold cursor-pointer transition-all uppercase text-center"
             >
                SAVE CALIBRATION
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
