import React, { useState, useEffect, useRef } from 'react';
import { LaunchLabDraft, JetpacStageProfileV2, SpawnZoneDef } from '../LaunchLabTypes';
import { launchLabStorage } from './launchLabStorage';
import { validateJetpacStage } from './launchLabValidation';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS } from '../Constants';
import { audio } from '../Audio';
import { handcraftedStageRegistry } from './handcraftedStageRegistry';
import { BackdropDesigner } from './BackdropDesigner';

interface LaunchLabEditorProps {
  draft: LaunchLabDraft;
  onClose: () => void;
  onPlaytest: (profile: JetpacStageProfileV2) => void;
}

export default function LaunchLabEditor({ draft, onClose, onPlaytest }: LaunchLabEditorProps) {
  const [profile, setProfile] = useState<JetpacStageProfileV2>(draft.profile);
  
  // Undo/Redo State History
  const [history, setHistory] = useState<JetpacStageProfileV2[]>([]);
  const [redoStack, setRedoStack] = useState<JetpacStageProfileV2[]>([]);
  
  // Selection & Interactions
  const [tool, setTool] = useState<'move' | 'draw-platform' | 'draw-zone-item' | 'draw-zone-enemy' | 'draw-hazard' | 'draw-force-zone' | 'draw-object' | 'draw-powerup' | 'draw-key' | 'draw-gate' | 'draw-switch' | 'draw-enemy-placement'>('move');
  const [selectedType, setSelectedType] = useState<'platform' | 'zone' | 'playerStart' | 'player2Start' | 'rocketBase' | 'hazard' | 'forceZone' | 'stageObject' | 'powerup' | 'key' | 'gate' | 'switch' | 'enemyPlacement' | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'enemies' | 'diagnostics'>('properties');
  
  // Touch / Responsive Workspace States
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'phone'>('desktop');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(false);
  const [activeLeftDrawer, setActiveLeftDrawer] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Background panning support
  const [isPanningBackground, setIsPanningBackground] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Refs for tracking pointers and gestures
  const activePointers = useRef<Record<number, { x: number; y: number }>>({});
  const lastPinchDistance = useRef<number | null>(null);

  // Auto-detect view dimensions and touch screen profile
  useEffect(() => {
    const detectEnvironment = () => {
      const width = window.innerWidth;
      const possessesTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches;
      if (width < 768) {
        setDeviceMode('phone');
        setZoom(0.55);
      } else if (width < 1024 || possessesTouchDevice) {
        setDeviceMode('tablet');
        setZoom(0.85);
        setPan({ x: 25, y: 15 });
      } else {
        setDeviceMode('desktop');
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
      }
    };
    detectEnvironment();
    window.addEventListener('resize', detectEnvironment);
    return () => window.removeEventListener('resize', detectEnvironment);
  }, []);

  // Mouse / Touch Drag Tracking
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState<{ type: string; id: string | number; index?: number } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragResizeHandle, setDragResizeHandle] = useState<'w-right' | 'h-bottom' | 'both' | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Success Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Promotion Dialog Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoTitle, setPromoTitle] = useState(profile.name || draft.name || '');
  const [promoSubtitle, setPromoSubtitle] = useState(profile.subtitle || 'DEVIANT SECTOR');
  const [promoOrder, setPromoOrder] = useState(1);
  const [promoDifficulty, setPromoDifficulty] = useState(profile.editorMeta?.difficulty || 5);
  const [promoTags, setPromoTags] = useState<string[]>(profile.editorMeta?.tags || ['Custom']);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showBackdropDesigner, setShowBackdropDesigner] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load existing promoter fields if available
  useEffect(() => {
    if (draft.promotedId) {
      try {
        const promotedList = launchLabStorage.getPromotedStages();
        const existing = promotedList.find(p => p.promotedId === draft.promotedId);
        if (existing) {
          setPromoTitle(existing.title);
          setPromoSubtitle(existing.subtitle || '');
          setPromoOrder(existing.order);
          setPromoDifficulty(existing.difficulty);
          setPromoTags(existing.tags);
        }
      } catch (err) {
        console.error('Failed reading existing promotion details:', err);
      }
    }
  }, [draft.promotedId]);

  const handleSaveBlueprintClick = () => {
    try {
      const updatedDraft = {
        ...draft,
        name: profile.name || draft.name,
        profile: profile
      };
      launchLabStorage.saveDraft(updatedDraft);
      setToastMessage('✓ STAGE BLUEPRINT DRAFT SAVED & SYNCED!');
      audio.playPowerup();
    } catch (err: any) {
      setToastMessage(`❌ SAVE FAILED: ${err.message || err}`);
    }
  };

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      setPromoError('Stage Title is required');
      return;
    }

    try {
      // First ensure draft has latest profile saved
      const updatedProfile = {
        ...profile,
        name: promoTitle.toUpperCase(),
        subtitle: promoSubtitle.toUpperCase(),
        editorMeta: {
          ...profile.editorMeta,
          difficulty: Number(promoDifficulty),
          tags: promoTags
        }
      };
      
      const updatedDraft = {
        ...draft,
        name: promoTitle.toUpperCase(),
        profile: updatedProfile
      };
      
      setProfile(updatedProfile);
      launchLabStorage.saveDraft(updatedDraft);

      // Now promote it!
      const promotedStage = handcraftedStageRegistry.promoteDraft(updatedDraft, {
        title: promoTitle.toUpperCase(),
        subtitle: promoSubtitle.toUpperCase(),
        campaignName: 'LOCAL DESIGN CAMPAIGN',
        order: Number(promoOrder),
        difficulty: Number(promoDifficulty),
        tags: promoTags,
        notes: `Promoted draft ${updatedDraft.name}`
      });

      // Update draft properties to link them
      draft.promotedId = promotedStage.promotedId;
      draft.lastPromotedAt = promotedStage.promotedAt;

      // Show success feedback
      setToastMessage(`✓ STAGE PROMOTED TO PLAYABLE CAMPAIGN AS "${promoTitle.toUpperCase()}"!`);
      audio.playPowerup();
      setShowPromoteModal(false);
      setPromoError(null);
    } catch (err: any) {
      setPromoError(`Promotion failed: ${err.message || err}`);
    }
  };

  useEffect(() => {
    // Save draft periodically on change
    const updatedDraft = {
      ...draft,
      name: profile.name || draft.name,
      profile: profile
    };
    launchLabStorage.saveDraft(updatedDraft);
  }, [profile, draft]);

  // Record history state
  const recordState = (newProfile: JetpacStageProfileV2) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(profile))]);
    setRedoStack([]);
    setProfile(newProfile);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(profile))]);
    setProfile(previous);
    setHistory(prev => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(profile))]);
    setProfile(next);
    setRedoStack(prev => prev.slice(0, prev.length - 1));
  };

  // Convert client viewport pixels to 800x600 logical canvas coordinates matching zoom and pan
  const getLogicalCoords = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement> | { clientX: number; clientY: number }) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rectX = e.clientX - rect.left;
    const rectY = e.clientY - rect.top;
    
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;

    const logicalX = Math.round((rectX - pan.x) / (scaleX * zoom));
    const logicalY = Math.round((rectY - pan.y) / (scaleY * zoom));

    return {
      x: Math.max(0, Math.min(GAME_WIDTH, logicalX)),
      y: Math.max(0, Math.min(GAME_HEIGHT, logicalY))
    };
  };

  // Nudge selected entity's position or dimension
  const nudgeProps = (xDiff: number, yDiff: number, wDiff: number, hDiff: number) => {
    if (!selectedType || selectedId === null) return;
    const clone = JSON.parse(JSON.stringify(profile)) as JetpacStageProfileV2;
    
    if (selectedType === 'platform') {
      const plat = clone.platformLayout![selectedId as number];
      if (plat) {
        if (Array.isArray(plat)) {
          plat[0] = Math.max(0, Math.min(GAME_WIDTH, plat[0] + xDiff));
          plat[1] = Math.max(0, Math.min(GAME_HEIGHT, plat[1] + yDiff));
          plat[2] = Math.max(20, (plat[2] || 100) + wDiff);
          plat[3] = Math.max(5, (plat[3] || 15) + hDiff);
        } else {
          const pObj = plat as any;
          pObj.x = Math.max(0, Math.min(GAME_WIDTH, (pObj.x || 0) + xDiff));
          pObj.y = Math.max(0, Math.min(GAME_HEIGHT, (pObj.y || 0) + yDiff));
          pObj.w = Math.max(20, (pObj.w || 100) + wDiff);
          pObj.h = Math.max(5, (pObj.h || 15) + hDiff);
        }
      }
    } else if (selectedType === 'playerStart') {
      clone.playerStart = {
        x: Math.max(0, Math.min(GAME_WIDTH, (clone.playerStart?.x ?? GAME_WIDTH / 2) + xDiff)),
        y: Math.max(0, Math.min(GAME_HEIGHT, (clone.playerStart?.y ?? GAME_HEIGHT - 50) + yDiff))
      };
    } else if (selectedType === 'player2Start') {
      if ((clone as any).player2Start) {
        (clone as any).player2Start = {
          x: Math.max(0, Math.min(GAME_WIDTH, ((clone as any).player2Start.x) + xDiff)),
          y: Math.max(0, Math.min(GAME_HEIGHT, ((clone as any).player2Start.y) + yDiff))
        };
      }
    } else if (selectedType === 'rocketBase') {
      clone.rocketBase = {
        x: Math.max(10, Math.min(GAME_WIDTH - 60, (clone.rocketBase?.x ?? 550) + xDiff)),
        y: Math.max(100, Math.min(GAME_HEIGHT, (clone.rocketBase?.y ?? (GAME_HEIGHT - 20)) + yDiff))
      };
    } else if (selectedType === 'zone') {
      const isItem = profile.itemSpawnZones?.find(z => z.id === selectedId);
      const key = isItem ? 'itemSpawnZones' : 'enemySpawnZones';
      const zone = clone[key]?.find(z => z.id === selectedId);
      if (zone) {
        zone.x = Math.max(0, Math.min(GAME_WIDTH, zone.x + xDiff));
        zone.y = Math.max(0, Math.min(GAME_HEIGHT, zone.y + yDiff));
        zone.w = Math.max(20, zone.w + wDiff);
        zone.h = Math.max(10, zone.h + hDiff);
      }
    } else if (selectedType === 'hazard') {
      const item = clone.hazards?.find(h => h.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
        item.w = Math.max(20, item.w + wDiff);
        item.h = Math.max(10, item.h + hDiff);
      }
    } else if (selectedType === 'forceZone') {
      const item = clone.zones?.find(z => z.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
        item.w = Math.max(20, item.w + wDiff);
        item.h = Math.max(10, item.h + hDiff);
      }
    } else if (selectedType === 'stageObject') {
      const item = clone.objects?.find(o => o.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
        item.w = Math.max(20, item.w + wDiff);
        item.h = Math.max(10, item.h + hDiff);
      }
    } else if (selectedType === 'powerup') {
      const item = clone.powerups?.find(p => p.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
      }
    } else if (selectedType === 'key') {
      const item = clone.keys?.find(k => k.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
      }
    } else if (selectedType === 'gate') {
      const item = clone.gates?.find(g => g.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
        item.w = Math.max(20, item.w + wDiff);
        item.h = Math.max(10, item.h + hDiff);
      }
    } else if (selectedType === 'switch') {
      const item = clone.switches?.find(s => s.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
        item.w = Math.max(20, item.w + wDiff);
        item.h = Math.max(10, item.h + hDiff);
      }
    } else if (selectedType === 'enemyPlacement') {
      const item = clone.enemyPlacements?.find(ep => ep.id === selectedId);
      if (item) {
        item.x = Math.max(0, Math.min(GAME_WIDTH, item.x + xDiff));
        item.y = Math.max(0, Math.min(GAME_HEIGHT, item.y + yDiff));
      }
    }
    recordState(clone);
  };

  // Auto center/orient pan onto target coordinate offset
  const centerOnObject = (type: string, id: string | number) => {
    let targetX = GAME_WIDTH / 2;
    let targetY = GAME_HEIGHT / 2;
    
    if (type === 'platform') {
      const p = profile.platformLayout?.[id as number];
      if (p) {
        targetX = p[0] + p[2]/2;
        targetY = p[1] + p[3]/2;
      }
    } else if (type === 'playerStart') {
      targetX = profile.playerStart?.x ?? GAME_WIDTH / 2;
      targetY = profile.playerStart?.y ?? GAME_HEIGHT - 50;
    } else if (type === 'player2Start') {
      targetX = (profile as any).player2Start?.x ?? GAME_WIDTH / 2;
      targetY = (profile as any).player2Start?.y ?? GAME_HEIGHT - 50;
    } else if (type === 'rocketBase') {
      targetX = (profile.rocketBase?.x ?? 550) + 30;
      targetY = (profile.rocketBase?.y ?? (GAME_HEIGHT - 20)) - 60;
    } else if (type === 'zone') {
      const z = profile.itemSpawnZones?.find(x => x.id === id) || profile.enemySpawnZones?.find(x => x.id === id);
      if (z) {
        targetX = z.x + z.w/2;
        targetY = z.y + z.h/2;
      }
    } else if (type === 'hazard') {
      const h = profile.hazards?.find(x => x.id === id);
      if (h) {
        targetX = h.x + h.w/2;
        targetY = h.y + h.h/2;
      }
    } else if (type === 'forceZone') {
      const z = profile.zones?.find(x => x.id === id);
      if (z) {
        targetX = z.x + z.w/2;
        targetY = z.y + z.h/2;
      }
    } else if (type === 'stageObject') {
      const o = profile.objects?.find(x => x.id === id);
      if (o) {
        targetX = o.x + o.w/2;
        targetY = o.y + o.h/2;
      }
    } else if (type === 'powerup') {
      const p = profile.powerups?.find(x => x.id === id);
      if (p) {
        targetX = p.x;
        targetY = p.y;
      }
    } else if (type === 'key') {
      const k = profile.keys?.find(x => x.id === id);
      if (k) {
        targetX = k.x;
        targetY = k.y;
      }
    } else if (type === 'gate') {
      const g = profile.gates?.find(x => x.id === id);
      if (g) {
        targetX = g.x + g.w/2;
        targetY = g.y + g.h/2;
      }
    } else if (type === 'switch') {
      const s = profile.switches?.find(x => x.id === id);
      if (s) {
        targetX = s.x + s.w/2;
        targetY = s.y + s.h/2;
      }
    } else if (type === 'enemyPlacement') {
      const ep = profile.enemyPlacements?.find(x => x.id === id);
      if (ep) {
        targetX = ep.x;
        targetY = ep.y;
      }
    }
    
    setPan({
      x: (GAME_WIDTH / 2) - targetX * zoom,
      y: (GAME_HEIGHT / 2) - targetY * zoom
    });
  };

  // Unified Pointer handlers handling Touch Gestures and Mouse interactions
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    
    if (e.pointerType === 'touch') {
      (e.currentTarget as any).releasePointerCapture(e.pointerId);
    }
    
    activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const pointerCount = Object.keys(activePointers.current).length;

    if (pointerCount >= 2) {
      setIsDragging(false);
      const pIdList = Object.keys(activePointers.current).map(Number);
      const p1 = activePointers.current[pIdList[0]];
      const p2 = activePointers.current[pIdList[1]];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      return;
    }

    const { x, y } = getLogicalCoords(e);

    // Clicking backing svg canvas triggers backdrop panning
    if (tool === 'move' && e.target === svgRef.current) {
      setIsPanningBackground(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedId(null);
      setSelectedType(null);
      return;
    }

    handleMouseDown(e as any);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current[e.pointerId]) {
      activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    }

    const pointerCount = Object.keys(activePointers.current).length;

    if (pointerCount >= 2) {
      const pIdList = Object.keys(activePointers.current).map(Number);
      const p1 = activePointers.current[pIdList[0]];
      const p2 = activePointers.current[pIdList[1]];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDistance.current !== null) {
        const ratio = dist / lastPinchDistance.current;
        const newZoom = Math.max(0.4, Math.min(4, zoom * ratio));
        setZoom(newZoom);
      }
      lastPinchDistance.current = dist;
      return;
    }

    if (isPanningBackground) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    handleMouseMove(e as any);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    delete activePointers.current[e.pointerId];
    if (Object.keys(activePointers.current).length < 2) {
      lastPinchDistance.current = null;
    }
    
    if (isPanningBackground) {
      setIsPanningBackground(false);
      return;
    }
    
    handleMouseUp();
  };

  const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    delete activePointers.current[e.pointerId];
    lastPinchDistance.current = null;
    setIsPanningBackground(false);
    setIsDragging(false);
    setDragNode(null);
  };

  const snapPoint = (val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  // Mouse Handlers inside the visual canvas
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = getLogicalCoords(e);
    
    // Check if drawing new elements
    if (tool === 'draw-platform') {
      const newId = `platform-${Date.now()}`;
      const newPlatforms = [...(profile.platformLayout || [])];
      // Insert new platform definition [x, y, w, h]
      newPlatforms.push([x, y, 100, 15]);
      
      const newProf = { ...profile, platformLayout: newPlatforms };
      recordState(newProf);
      
      setSelectedType('platform');
      setSelectedId(newPlatforms.length - 1);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'platform-resize', id: newPlatforms.length - 1 });
      setDragResizeHandle('w-right');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-zone-item' || tool === 'draw-zone-enemy') {
      const isItem = tool === 'draw-zone-item';
      const zonesKey = isItem ? 'itemSpawnZones' : 'enemySpawnZones';
      const newZone: SpawnZoneDef = {
        id: `zone-${Date.now()}`,
        x,
        y,
        w: 120,
        h: 80,
        kind: isItem ? 'any' : 'enemy',
        enabled: true
      };

      const existingZones = [...(profile[zonesKey] || [])];
      existingZones.push(newZone);

      const newProf = { ...profile, [zonesKey]: existingZones };
      recordState(newProf);

      setSelectedType('zone');
      setSelectedId(newZone.id);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'zone-resize', id: newZone.id, index: existingZones.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-hazard') {
      const newId = `hazard-${Date.now()}`;
      const newHazards = [...(profile.hazards || [])];
      newHazards.push({
        id: newId,
        kind: 'water',
        x,
        y: GAME_HEIGHT - 40,
        w: 200,
        h: 40,
        enabled: true,
        props: { escapeWindow: 120, sinkSpeed: 0.7 }
      });
      const newProf = { ...profile, hazards: newHazards };
      recordState(newProf);
      setSelectedType('hazard');
      setSelectedId(newId);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'hazard-resize', id: newId, index: newHazards.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-force-zone') {
      const newId = `zone-${Date.now()}`;
      const newZones = [...(profile.zones || [])];
      newZones.push({
        id: newId,
        kind: 'wind',
        x,
        y,
        w: 160,
        h: 120,
        enabled: true,
        props: { forceX: 0.1, forceY: -0.05, affectsPlayer: true, affectsItems: true, affectsEnemies: false, visible: true }
      });
      const newProf = { ...profile, zones: newZones };
      recordState(newProf);
      setSelectedType('forceZone');
      setSelectedId(newId);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'forceZone-resize', id: newId, index: newZones.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-object') {
      const newId = `obj-${Date.now()}`;
      const newObjects = [...(profile.objects || [])];
      newObjects.push({
        id: newId,
        kind: 'fan',
        x,
        y,
        w: 50,
        h: 30,
        enabled: true,
        props: { direction: 'up', strength: 0.25, affectsPlayer: true, affectsItems: true, affectsEnemies: false }
      });
      const newProf = { ...profile, objects: newObjects };
      recordState(newProf);
      setSelectedType('stageObject');
      setSelectedId(newId);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'stageObject-resize', id: newId, index: newObjects.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-powerup') {
      const newId = `powerup-${Date.now()}`;
      const newPowerups = [...(profile.powerups || [])];
      newPowerups.push({
        id: newId,
        kind: 'gravityBoots',
        x,
        y,
        enabled: true,
        respawn: true,
        durationFrames: null,
        props: { permanent: true, requirePickup: true, glowColor: '#06b6d4' }
      });
      const newProf = { ...profile, powerups: newPowerups };
      recordState(newProf);
      setSelectedType('powerup');
      setSelectedId(newId);
      setTool('move');
      return;
    }

    if (tool === 'draw-key') {
      const newId = `key-${Date.now()}`;
      const newKeys = [...(profile.keys || [])];
      newKeys.push({
        id: newId,
        kind: 'redKey',
        x,
        y,
        enabled: true,
        opensGateIds: [],
        consumedOnUse: true
      });
      const newProf = { ...profile, keys: newKeys };
      recordState(newProf);
      setSelectedType('key');
      setSelectedId(newId);
      setTool('move');
      return;
    }

    if (tool === 'draw-gate') {
      const newId = `gate-${Date.now()}`;
      const newGates = [...(profile.gates || [])];
      newGates.push({
        id: newId,
        kind: 'locked',
        x,
        y,
        w: 20,
        h: 80,
        enabled: true,
        initiallyOpen: false,
        requiredKeyKind: 'redKey',
        props: { color: '#ef4444', orientation: 'vertical', blocksPlayer: true, blocksItems: true, blocksEnemies: true }
      });
      const newProf = { ...profile, gates: newGates };
      recordState(newProf);
      setSelectedType('gate');
      setSelectedId(newId);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'gate-resize', id: newId, index: newGates.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-switch') {
      const newId = `switch-${Date.now()}`;
      const newSwitches = [...(profile.switches || [])];
      newSwitches.push({
        id: newId,
        kind: 'toggle',
        x,
        y,
        w: 30,
        h: 15,
        enabled: true,
        targetGateIds: [],
        targetObjectIds: [],
        cooldownFrames: 60,
        durationFrames: 300,
        props: { canBeTriggeredByPlayer: true, canBeTriggeredByItems: true, canBeTriggeredByEnemies: false, color: '#eab308' }
      });
      const newProf = { ...profile, switches: newSwitches };
      recordState(newProf);
      setSelectedType('switch');
      setSelectedId(newId);
      setTool('move');
      setIsDragging(true);
      setDragNode({ type: 'switch-resize', id: newId, index: newSwitches.length - 1 });
      setDragResizeHandle('both');
      setDragStart({ x, y });
      return;
    }

    if (tool === 'draw-enemy-placement') {
      const newId = `enemyPlacement-${Date.now()}`;
      const newPlacements = [...(profile.enemyPlacements || [])];
      newPlacements.push({
        id: newId,
        type: 'gravity_jelly',
        x,
        y,
        enabled: true,
        props: { spawnInterval: 300 }
      });
      const newProf = { ...profile, enemyPlacements: newPlacements };
      recordState(newProf);
      setSelectedType('enemyPlacement');
      setSelectedId(newId);
      setTool('move');
      return;
    }

    // Default: Clicked background deselects
    setSelectedType(null);
    setSelectedId(null);
  };

  const handleNodeMouseDown = (
    e: React.MouseEvent, 
    type: 'platform' | 'zone' | 'playerStart' | 'player2Start' | 'rocketBase' | 'hazard' | 'forceZone' | 'stageObject' | 'powerup' | 'key' | 'gate' | 'switch' | 'enemyPlacement', 
    id: string | number, 
    meta?: { index?: number; isResize?: boolean; isRightEdge?: boolean; isBottomEdge?: boolean; isCorner?: boolean }
  ) => {
    e.stopPropagation();
    const { x, y } = getLogicalCoords(e as any);
    
    setSelectedType(type);
    setSelectedId(id);
    setIsDragging(true);

    if (meta?.isResize) {
      setDragNode({ type: `${type}-resize`, id, index: meta.index });
      if (meta.isRightEdge) setDragResizeHandle('w-right');
      else if (meta.isBottomEdge) setDragResizeHandle('h-bottom');
      else if (meta.isCorner) setDragResizeHandle('both');
    } else {
      setDragNode({ type, id, index: meta?.index });
      setDragResizeHandle(null);
      // calculate grab offset
      let grabX = x;
      let grabY = y;
      if (type === 'playerStart') {
        grabX = (profile.playerStart?.x ?? GAME_WIDTH / 2) - x;
        grabY = (profile.playerStart?.y ?? GAME_HEIGHT - 50) - y;
      } else if (type === 'player2Start') {
        grabX = ((profile as any).player2Start?.x ?? (GAME_WIDTH / 2 + 40)) - x;
        grabY = ((profile as any).player2Start?.y ?? (GAME_HEIGHT - 50)) - y;
      } else if (type === 'rocketBase') {
        grabX = (profile.rocketBase?.x ?? 550) - x;
        grabY = (profile.rocketBase?.y ?? (GAME_HEIGHT - 20)) - y;
      } else if (type === 'platform') {
        const plat = profile.platformLayout![id as number];
        grabX = plat[0] - x;
        grabY = plat[1] - y;
      } else if (type === 'zone') {
        const zoneList = profile.itemSpawnZones?.find(z => z.id === id) 
          ? profile.itemSpawnZones 
          : profile.enemySpawnZones || [];
        const zone = zoneList.find(z => z.id === id);
        if (zone) {
          grabX = zone.x - x;
          grabY = zone.y - y;
        }
      } else if (type === 'hazard') {
        const item = profile.hazards?.find(h => h.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'forceZone') {
        const item = profile.zones?.find(z => z.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'stageObject') {
        const item = profile.objects?.find(o => o.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'powerup') {
        const item = profile.powerups?.find(p => p.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'key') {
        const item = (profile.keys || []).find(k => k.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'gate') {
        const item = (profile.gates || []).find(g => g.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'switch') {
        const item = (profile.switches || []).find(s => s.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      } else if (type === 'enemyPlacement') {
        const item = (profile.enemyPlacements || []).find(ep => ep.id === id);
        if (item) {
          grabX = item.x - x;
          grabY = item.y - y;
        }
      }
      setDragOffset({ x: grabX, y: grabY });
    }
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragNode) return;
    const { x, y } = getLogicalCoords(e);
    
    const clone = JSON.parse(JSON.stringify(profile)) as JetpacStageProfileV2;

    if (dragNode.type === 'playerStart') {
      clone.playerStart = {
        x: x + dragOffset.x,
        y: y + dragOffset.y
      };
      setProfile(clone);
    } else if (dragNode.type === 'player2Start') {
      (clone as any).player2Start = {
        x: x + dragOffset.x,
        y: y + dragOffset.y
      };
      setProfile(clone);
    } else if (dragNode.type === 'rocketBase') {
      clone.rocketBase = {
        x: Math.max(10, Math.min(GAME_WIDTH - 60, x + dragOffset.x)),
        y: Math.max(100, Math.min(GAME_HEIGHT, y + dragOffset.y))
      };
      setProfile(clone);
    } else if (dragNode.type === 'platform') {
      const idx = dragNode.id as number;
      if (clone.platformLayout && clone.platformLayout[idx]) {
        clone.platformLayout[idx][0] = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
        clone.platformLayout[idx][1] = Math.max(0, Math.min(GAME_HEIGHT - 10, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'platform-resize') {
      const idx = dragNode.id as number;
      if (clone.platformLayout && clone.platformLayout[idx]) {
        const plat = clone.platformLayout[idx];
        if (dragResizeHandle === 'w-right') {
          const deltaX = x - plat[0];
          plat[2] = Math.max(20, deltaX);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'zone') {
      const isItem = profile.itemSpawnZones?.find(z => z.id === dragNode.id);
      const zonesKey = isItem ? 'itemSpawnZones' : 'enemySpawnZones';
      const idx = dragNode.index as number;
      if (clone[zonesKey] && clone[zonesKey]![idx]) {
         clone[zonesKey]![idx].x = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
         clone[zonesKey]![idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
         setProfile(clone);
      }
    } else if (dragNode.type === 'zone-resize') {
      const isItem = profile.itemSpawnZones?.find(s => s.id === dragNode.id);
      const zonesKey = isItem ? 'itemSpawnZones' : 'enemySpawnZones';
      const idx = dragNode.index as number;
      if (clone[zonesKey] && clone[zonesKey]![idx]) {
        const zone = clone[zonesKey]![idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          zone.w = Math.max(20, x - zone.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          zone.h = Math.max(20, y - zone.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'hazard') {
      const idx = dragNode.index as number;
      if (clone.hazards && clone.hazards[idx]) {
        clone.hazards[idx].x = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
        clone.hazards[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'hazard-resize') {
      const idx = dragNode.index as number;
      if (clone.hazards && clone.hazards[idx]) {
        const item = clone.hazards[idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          item.w = Math.max(20, x - item.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          item.h = Math.max(20, y - item.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'forceZone') {
      const idx = dragNode.index as number;
      if (clone.zones && clone.zones[idx]) {
        clone.zones[idx].x = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
        clone.zones[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'forceZone-resize') {
      const idx = dragNode.index as number;
      if (clone.zones && clone.zones[idx]) {
        const item = clone.zones[idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          item.w = Math.max(20, x - item.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          item.h = Math.max(20, y - item.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'stageObject') {
      const idx = dragNode.index as number;
      if (clone.objects && clone.objects[idx]) {
        clone.objects[idx].x = Math.max(0, Math.min(GAME_WIDTH - 25, x + dragOffset.x));
        clone.objects[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'stageObject-resize') {
      const idx = dragNode.index as number;
      if (clone.objects && clone.objects[idx]) {
        const item = clone.objects[idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          item.w = Math.max(20, x - item.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          item.h = Math.max(20, y - item.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'powerup') {
      const idx = dragNode.index as number;
      if (clone.powerups && clone.powerups[idx]) {
        clone.powerups[idx].x = Math.max(0, Math.min(GAME_WIDTH - 15, x + dragOffset.x));
        clone.powerups[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 15, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'key') {
      const idx = dragNode.index as number;
      if (clone.keys && clone.keys[idx]) {
        clone.keys[idx].x = Math.max(0, Math.min(GAME_WIDTH - 15, x + dragOffset.x));
        clone.keys[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 15, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'gate') {
      const idx = dragNode.index as number;
      if (clone.gates && clone.gates[idx]) {
        clone.gates[idx].x = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
        clone.gates[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'gate-resize') {
      const idx = dragNode.index as number;
      if (clone.gates && clone.gates[idx]) {
        const item = clone.gates[idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          item.w = Math.max(20, x - item.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          item.h = Math.max(20, y - item.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'switch') {
      const idx = dragNode.index as number;
      if (clone.switches && clone.switches[idx]) {
        clone.switches[idx].x = Math.max(0, Math.min(GAME_WIDTH - 20, x + dragOffset.x));
        clone.switches[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 20, y + dragOffset.y));
        setProfile(clone);
      }
    } else if (dragNode.type === 'switch-resize') {
      const idx = dragNode.index as number;
      if (clone.switches && clone.switches[idx]) {
        const item = clone.switches[idx];
        if (dragResizeHandle === 'w-right' || dragResizeHandle === 'both') {
          item.w = Math.max(20, x - item.x);
        }
        if (dragResizeHandle === 'h-bottom' || dragResizeHandle === 'both') {
          item.h = Math.max(10, y - item.y);
        }
        setProfile(clone);
      }
    } else if (dragNode.type === 'enemyPlacement') {
      const idx = dragNode.index as number;
      if (clone.enemyPlacements && clone.enemyPlacements[idx]) {
        clone.enemyPlacements[idx].x = Math.max(0, Math.min(GAME_WIDTH - 15, x + dragOffset.x));
        clone.enemyPlacements[idx].y = Math.max(0, Math.min(GAME_HEIGHT - 15, y + dragOffset.y));
        setProfile(clone);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Commit state change fully to history pile
      recordState(profile);
    }
    setIsDragging(false);
    setDragNode(null);
    setDragResizeHandle(null);
  };

  const handleDeleteSelected = () => {
    if (selectedType === 'platform' && selectedId !== null) {
      const platIdx = selectedId as number;
      if (profile.platformLayout && profile.platformLayout[platIdx]) {
        const filtered = profile.platformLayout.filter((_, idx) => idx !== platIdx);
        recordState({ ...profile, platformLayout: filtered });
        setSelectedType(null);
        setSelectedId(null);
      }
    } else if (selectedType === 'zone' && selectedId !== null) {
      const isItem = profile.itemSpawnZones?.find(s => s.id === selectedId);
      const key = isItem ? 'itemSpawnZones' : 'enemySpawnZones';
      const filtered = (profile[key] || []).filter(z => z.id !== selectedId);
      recordState({ ...profile, [key]: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'hazard' && selectedId !== null) {
      const filtered = (profile.hazards || []).filter(h => h.id !== selectedId);
      recordState({ ...profile, hazards: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'forceZone' && selectedId !== null) {
      const filtered = (profile.zones || []).filter(z => z.id !== selectedId);
      recordState({ ...profile, zones: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'stageObject' && selectedId !== null) {
      const filtered = (profile.objects || []).filter(o => o.id !== selectedId);
      recordState({ ...profile, objects: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'powerup' && selectedId !== null) {
      const filtered = (profile.powerups || []).filter(p => p.id !== selectedId);
      recordState({ ...profile, powerups: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'key' && selectedId !== null) {
      const filtered = (profile.keys || []).filter(k => k.id !== selectedId);
      recordState({ ...profile, keys: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'gate' && selectedId !== null) {
      const filtered = (profile.gates || []).filter(g => g.id !== selectedId);
      recordState({ ...profile, gates: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'switch' && selectedId !== null) {
      const filtered = (profile.switches || []).filter(s => s.id !== selectedId);
      recordState({ ...profile, switches: filtered });
      setSelectedType(null);
      setSelectedId(null);
    } else if (selectedType === 'enemyPlacement' && selectedId !== null) {
      const filtered = (profile.enemyPlacements || []).filter(ep => ep.id !== selectedId);
      recordState({ ...profile, enemyPlacements: filtered });
      setSelectedType(null);
      setSelectedId(null);
    }
  };

  // Diagnostics calculations
  const validation = validateJetpacStage(profile);

  return (
    <div className="absolute inset-0 bg-[#020205] text-cyan-100 flex flex-col md:flex-row z-30 font-sans select-none">
      
      {/* LEFT AREA: Interactive SVG Stage designer */}
      <div className="flex-1 flex flex-col bg-[#05050f]/70 border-r border-cyan-950/60 p-4">
        
        {/* Designer toolbar */}
        <div className="flex items-center justify-between border-b border-cyan-950/60 pb-3 mb-3">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs text-cyan-600 font-mono tracking-wider uppercase">Tools:</span>
            <button
              onClick={() => setTool('move')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'move' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              Move / Select
            </button>
            <button
              onClick={() => setTool('draw-platform')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-platform' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Draw Ledge
            </button>
            <button
              onClick={() => setTool('draw-zone-item')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-zone-item' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Item Zone
            </button>
            <button
              onClick={() => setTool('draw-zone-enemy')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-zone-enemy' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Enemy Zone
            </button>
            <button
              onClick={() => setTool('draw-hazard')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-hazard' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Hazard
            </button>
            <button
              onClick={() => setTool('draw-force-zone')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-force-zone' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Force Zone
            </button>
            <button
              onClick={() => setTool('draw-object')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-object' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
            >
              + Object
            </button>
            <button
              onClick={() => setTool('draw-powerup')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-powerup' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
              title="Place protective suits or boost equipment"
            >
              + Power-up
            </button>
            <button
              onClick={() => setTool('draw-key')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-key' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
              title="Place keys"
            >
              + Key
            </button>
            <button
              onClick={() => setTool('draw-gate')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-gate' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
              title="Place interactive laser barrier gates"
            >
              + Gate / Door
            </button>
            <button
              onClick={() => setTool('draw-switch')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-switch' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
              title="Place triggered switches"
            >
              + Switch
            </button>
            <button
              onClick={() => setTool('draw-enemy-placement')}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                tool === 'draw-enemy-placement' ? 'border-cyan-400 bg-cyan-950/50 text-cyan-400' : 'border-cyan-950 bg-black/40 text-cyan-700'
              }`}
              title="Define specific coordinates where a custom enemies spawn"
            >
              + Spawner
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2.5 py-1 bg-black/40 border border-cyan-950 hover:border-cyan-900 disabled:opacity-20 text-xs text-cyan-500 font-mono rounded"
              title="Undo (Ctrl+Z)"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-2.5 py-1 bg-black/40 border border-cyan-950 hover:border-cyan-900 disabled:opacity-20 text-xs text-cyan-500 font-mono rounded"
              title="Redo (Ctrl+Y)"
            >
              ↪ Redo
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedId === null}
              className="px-2.5 py-1 bg-[#22050f]/20 hover:bg-[#ff005510] border border-red-950 hover:border-red-800 disabled:opacity-10 text-xs text-red-500 font-mono rounded"
              title="Delete Selected Platform / Zone"
            >
              ✂ Delete Item
            </button>
          </div>
        </div>

        {/* WORKSPACE VIEWPORT 800X600 ASPECT RATIO */}
        <div className="flex-1 w-full flex items-center justify-center p-2">
          <div 
            className="relative border border-cyan-900/40 bg-[#010103] shadow-[0_0_40px_rgba(0,255,255,0.05)] rounded overflow-hidden leading-[0]"
            style={{
              width: '100%',
              aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
              maxWidth: '85vh',
            }}
          >
            {/* Draw a subtle grid backdrop */}
            <div className="absolute inset-0 bg-[#050510]/30 pointer-events-none opacity-40" style={{
              backgroundImage: 'linear-gradient(to right, #00ffff08 1px, transparent 1px), linear-gradient(to bottom, #00ffff08 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}></div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseDown={handleMouseDown}
              className="w-full h-full select-none cursor-crosshair overflow-visible relative"
            >
              {/* 1. Platforms Ledges renderer */}
              {(profile.platformLayout || []).map((p, idx) => {
                const isSelected = selectedType === 'platform' && selectedId === idx;
                return (
                  <g key={`plat-${idx}`}>
                    <rect
                      x={p[0]}
                      y={p[1]}
                      width={p[2]}
                      height={p[3]}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'platform', idx)}
                      fill={isSelected ? 'rgba(0, 255, 255, 0.2)' : 'rgba(6, 182, 212, 0.08)'}
                      stroke={isSelected ? NEON_COLORS.CYAN : '#08667a'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="cursor-move"
                      filter="drop-shadow(0 0 4px rgba(6, 182, 212, 0.3))"
                    />
                    
                    {/* Width Resize Handle right grip */}
                    <rect
                      x={p[0] + p[2] - 5}
                      y={p[1]}
                      width={8}
                      height={p[3]}
                      fill={isSelected ? NEON_COLORS.CYAN : '#114a57'}
                      className="cursor-ew-resize opacity-40 hover:opacity-100"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'platform', idx, { isResize: true, isRightEdge: true })}
                    />
                  </g>
                );
              })}

              {/* 2. Custom Item Spawn Zones */}
              {(profile.itemSpawnZones || []).map((z, idx) => {
                const isSelected = selectedType === 'zone' && selectedId === z.id;
                return (
                  <g key={z.id}>
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.w}
                      height={z.h}
                      fill="none"
                      stroke={isSelected ? '#00ff44' : '#00ff4425'}
                      strokeDasharray="4 4"
                      strokeWidth={isSelected ? 2 : 1.2}
                      className="cursor-move"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'zone', z.id, { index: idx })}
                    />
                    <text x={z.x + 8} y={z.y + 18} fill="#00ff4480" className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none">
                      ITEM ZONE
                    </text>
                    {/* Diagonal resize box bottom right corner */}
                    <rect
                      x={z.x + z.w - 8}
                      y={z.y + z.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? '#00ff44' : '#00ff4440'}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'zone', z.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 3. Custom Enemy Spawn Zones */}
              {(profile.enemySpawnZones || []).map((z, idx) => {
                const isSelected = selectedType === 'zone' && selectedId === z.id;
                return (
                  <g key={z.id}>
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.w}
                      height={z.h}
                      fill="none"
                      stroke={isSelected ? NEON_COLORS.MAGENTA : 'rgba(255, 0, 255, 0.15)'}
                      strokeDasharray="4 4"
                      strokeWidth={isSelected ? 2 : 1.2}
                      className="cursor-move"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'zone', z.id, { index: idx })}
                    />
                    <text x={z.x + 8} y={z.y + 18} fill="#ff00ff80" className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none">
                      ENEMY ZONE
                    </text>
                    {/* Diagonal resizing grip */}
                    <rect
                      x={z.x + z.w - 8}
                      y={z.y + z.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? NEON_COLORS.MAGENTA : 'rgba(255, 0, 255, 0.3)'}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'zone', z.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 4. Interactive Player Spawnpoint Token */}
              <g>
                <circle
                  cx={profile.playerStart?.x ?? GAME_WIDTH / 2}
                  cy={profile.playerStart?.y ?? GAME_HEIGHT - 50}
                  r={16}
                  fill="rgba(0, 255, 255, 0.12)"
                  stroke={selectedType === 'playerStart' ? '#ffffff' : NEON_COLORS.CYAN}
                  strokeWidth={2}
                  className="cursor-move"
                  onMouseDown={(e) => handleNodeMouseDown(e, 'playerStart', 'player')}
                  filter="drop-shadow(0 0 6px rgb(6, 182, 212))"
                />
                <text 
                  x={profile.playerStart?.x ?? GAME_WIDTH / 2} 
                  y={(profile.playerStart?.y ?? GAME_HEIGHT - 50) + 4} 
                  fill="#ffffff" 
                  textAnchor="middle" 
                  className="font-mono text-[8px] font-bold pointer-events-none select-none"
                >
                  P1
                </text>
                <text 
                  x={profile.playerStart?.x ?? GAME_WIDTH / 2} 
                  y={(profile.playerStart?.y ?? GAME_HEIGHT - 50) - 22} 
                  fill={NEON_COLORS.CYAN} 
                  textAnchor="middle" 
                  className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none tracking-widest opacity-80"
                >
                  PLAYER 1 START
                </text>
              </g>

              {/* 4.2 Interactive Player 2 Spawnpoint Token (optional) */}
              {(profile as any).player2Start && (
                <g>
                  <circle
                    cx={(profile as any).player2Start.x}
                    cy={(profile as any).player2Start.y}
                    r={16}
                    fill="rgba(34, 197, 94, 0.12)"
                    stroke={selectedType === 'player2Start' ? '#ffffff' : '#22c55e'}
                    strokeWidth={2}
                    className="cursor-move"
                    onMouseDown={(e) => handleNodeMouseDown(e, 'player2Start', 'player2')}
                    filter="drop-shadow(0 0 6px rgb(34, 197, 94))"
                  />
                  <text 
                    x={(profile as any).player2Start.x} 
                    y={(profile as any).player2Start.y + 4} 
                    fill="#ffffff" 
                    textAnchor="middle" 
                    className="font-mono text-[8px] font-bold pointer-events-none select-none"
                  >
                    P2
                  </text>
                  <text 
                    x={(profile as any).player2Start.x} 
                    y={(profile as any).player2Start.y - 22} 
                    fill="#22c55e" 
                    textAnchor="middle" 
                    className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none tracking-widest opacity-80"
                  >
                    PLAYER 2 START
                  </text>
                </g>
              )}

              {/* 5. Rocket Base Landing coordinates */}
              <g>
                <rect
                  x={(profile.rocketBase?.x ?? 550) - 15}
                  y={(profile.rocketBase?.y ?? (GAME_HEIGHT - 20)) - 75}
                  width={60}
                  height={80}
                  fill="rgba(255, 0, 255, 0.08)"
                  stroke={selectedType === 'rocketBase' ? '#ffffff' : NEON_COLORS.MAGENTA}
                  strokeWidth={2}
                  className="cursor-move"
                  onMouseDown={(e) => handleNodeMouseDown(e, 'rocketBase', 'rocket')}
                  filter="drop-shadow(0 0 6px rgba(255, 0, 255, 0.4))"
                />
                <path 
                  d={`M ${(profile.rocketBase?.x ?? 550) + 15} ${(profile.rocketBase?.y ?? (GAME_HEIGHT - 20)) + 5} l -15 30 l 30 0 Z`} 
                  fill="none" 
                  stroke={NEON_COLORS.MAGENTA} 
                  strokeWidth={1.5} 
                  className="pointer-events-none"
                />
                <text 
                  x={profile.rocketBase?.x ?? 550} 
                  y={(profile.rocketBase?.y ?? (GAME_HEIGHT - 20)) - 82} 
                  fill={NEON_COLORS.MAGENTA} 
                  textAnchor="middle" 
                  className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none tracking-wider opacity-80"
                >
                  ROCKET PAD
                </text>
              </g>

              {/* 1.5 Hazards Renderer */}
              {(profile.hazards || []).map((h, idx) => {
                const isSelected = selectedType === 'hazard' && selectedId === h.id;
                let colorClass = '#00a2ff';
                if (h.kind === 'lava') colorClass = '#ff4500';
                else if (h.kind === 'spikes') colorClass = '#ff0055';
                else if (h.kind === 'electric') colorClass = '#00ffff';

                return (
                  <g key={h.id}>
                    <rect
                      x={h.x}
                      y={h.y}
                      width={h.w}
                      height={h.h}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'hazard', h.id, { index: idx })}
                      fill={isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.5)'}
                      stroke={isSelected ? '#ffffff' : colorClass}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="cursor-move"
                    />
                    
                    {h.kind === 'water' && (
                      <path d={`M ${h.x} ${h.y + 4} q 10 -4, 20 0 t 20 0 t 20 0 t 20 0`} fill="none" stroke="#22cdff" strokeWidth="1.5" />
                    )}
                    {h.kind === 'lava' && (
                      <path d={`M ${h.x} ${h.y + 6} q 15 -6, 30 0 t 30 0 t 30 0 t 30 0`} fill="none" stroke="#ffaa00" strokeWidth="1.5" />
                    )}
                    {h.kind === 'spikes' && (
                      <path d={`M ${h.x} ${h.y + h.h} l 10 -15 l 10 15 l 10 -15 l 10 15`} fill="none" stroke="#ff0055" strokeWidth="2" />
                    )}
                    {h.kind === 'electric' && (
                      <path d={`M ${h.x} ${h.y + h.h / 2} l 20 -10 l 20 20 l 20 -20`} fill="none" stroke="#00ffcc" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    <text x={h.x + 8} y={h.y + 16} fill={colorClass} className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none">
                      {h.kind}
                    </text>

                    <rect
                      x={h.x + h.w - 8}
                      y={h.y + h.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? '#ffffff' : colorClass}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'hazard', h.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 1.6 Force Zones Renderer */}
              {(profile.zones || []).map((z, idx) => {
                const isSelected = selectedType === 'forceZone' && selectedId === z.id;
                const colorClass = z.kind === 'wind' ? '#00ffaa' : '#9900ff';

                return (
                  <g key={z.id}>
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.w}
                      height={z.h}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'forceZone', z.id, { index: idx })}
                      fill="none"
                      stroke={isSelected ? '#ffffff' : colorClass}
                      strokeWidth={isSelected ? 2 : 1.2}
                      strokeDasharray="5 5"
                      className="cursor-move"
                    />
                    
                    {z.kind === 'wind' && (
                      <path d={`M ${z.x + 20} ${z.y + z.h / 2} l 40 0 m -10 -10 l 10 10 l -10 10`} fill="none" stroke="#00ffaa60" strokeWidth="2" />
                    )}
                    {z.kind === 'gravity' && (
                      <circle cx={z.x + z.w / 2} cy={z.y + z.h / 2} r="15" fill="none" stroke="#9900ff40" strokeWidth="1.5" />
                    )}

                    <text x={z.x + 8} y={z.y + 16} fill={colorClass} className="font-mono text-[9px] uppercase font-bold select-none pointer-events-none">
                      {z.kind} ZONE
                    </text>

                    <rect
                      x={z.x + z.w - 8}
                      y={z.y + z.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? '#ffffff' : colorClass}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'forceZone', z.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 1.7 Stage Objects Renderer */}
              {(profile.objects || []).map((o, idx) => {
                const isSelected = selectedType === 'stageObject' && selectedId === o.id;
                let colorClass = '#ffaa00';
                if (o.kind === 'fan') colorClass = '#00ffcc';
                else if (o.kind === 'teleporter') colorClass = '#ff00ff';

                const p1x = o.props?.pathX1 ?? o.x;
                const p1y = o.props?.pathY1 ?? o.y;
                const p2x = o.props?.pathX2 ?? o.x + 160;
                const p2y = o.props?.pathY2 ?? o.y;

                return (
                  <g key={o.id}>
                    {o.kind === 'movingPlatform' && (
                      <line x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke="#ffaa0050" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    <rect
                      x={o.x}
                      y={o.y}
                      width={o.w}
                      height={o.h}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'stageObject', o.id, { index: idx })}
                      fill={isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.4)'}
                      stroke={isSelected ? '#ffffff' : colorClass}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="cursor-move"
                    />

                    {o.kind === 'fan' && (
                      <circle cx={o.x + o.w / 2} cy={o.y + o.h / 2} r="6" fill="#00ffcc80" />
                    )}
                    {o.kind === 'teleporter' && (
                      <rect x={o.x + 4} y={o.y + 4} width={o.w - 8} height={o.h - 8} rx="4" fill="none" stroke="#ff00ff" strokeWidth="1.5" />
                    )}

                    <text x={o.x + 6} y={o.y + 14} fill={colorClass} className="font-mono text-[8px] uppercase font-bold select-none pointer-events-none">
                      {o.kind === 'movingPlatform' ? 'M-PLAT' : o.kind}
                    </text>

                    <rect
                      x={o.x + o.w - 8}
                      y={o.y + o.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? '#ffffff' : colorClass}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'stageObject', o.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 1.8 Powerups Renderer */}
              {(profile.powerups || []).map((pu, idx) => {
                const isSelected = selectedType === 'powerup' && selectedId === pu.id;
                const glowColor = pu.props?.glowColor || '#06b6d4';
                return (
                  <g key={pu.id}>
                    <polygon
                      points={`${pu.x},${pu.y - 12} ${pu.x + 10},${pu.y} ${pu.x},${pu.y + 12} ${pu.x - 10},${pu.y}`}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'powerup', pu.id, { index: idx })}
                      fill={isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.7)'}
                      stroke={isSelected ? '#ffffff' : glowColor}
                      strokeWidth={2}
                      className="cursor-move"
                    />
                    <text
                      x={pu.x}
                      y={pu.y + 2.5}
                      fill="#ffffff"
                      textAnchor="middle"
                      className="font-mono text-[7px] font-bold select-none pointer-events-none"
                    >
                      {pu.kind === 'gravityBoots' ? 'GB' : pu.kind === 'heatShield' ? 'HS' : pu.kind === 'aquaHelmet' ? 'AH' : pu.kind === 'rubberSuit' ? 'RS' : pu.kind === 'jetpack' ? 'JP' : 'MB'}
                    </text>
                  </g>
                );
              })}

              {/* 1.9 Keys Renderer */}
              {(profile.keys || []).map((key, idx) => {
                const isSelected = selectedType === 'key' && selectedId === key.id;
                let color = '#ef4444';
                if (key.kind === 'blueKey') color = '#3b82f6';
                else if (key.kind === 'greenKey') color = '#10b981';
                else if (key.kind === 'goldKey') color = '#fbbf24';
                else if (key.kind === 'silverKey') color = '#94a3b8';

                return (
                  <g key={key.id}>
                    <circle
                      cx={key.x}
                      cy={key.y}
                      r={7}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'key', key.id, { index: idx })}
                      fill={isSelected ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.7)'}
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={2}
                      className="cursor-move"
                    />
                    <line x1={key.x} y1={key.y + 7} x2={key.x} y2={key.y + 16} stroke={color} strokeWidth={2} className="pointer-events-none" />
                    <line x1={key.x} y1={key.y + 11} x2={key.x + 4} y2={key.y + 11} stroke={color} strokeWidth={2} className="pointer-events-none" />
                    <line x1={key.x} y1={key.y + 14} x2={key.x + 4} y2={key.y + 14} stroke={color} strokeWidth={2} className="pointer-events-none" />
                  </g>
                );
              })}

              {/* 2.0 Gates Renderer */}
              {(profile.gates || []).map((gate, idx) => {
                const isSelected = selectedType === 'gate' && selectedId === gate.id;
                const glowColor = gate.props?.color || (gate.kind === 'locked' ? '#ef4444' : '#06b6d4');
                return (
                  <g key={gate.id}>
                    <rect
                      x={gate.x}
                      y={gate.y}
                      width={gate.w}
                      height={gate.h}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'gate', gate.id, { index: idx })}
                      fill={isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.5)'}
                      stroke={isSelected ? '#ffffff' : glowColor}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="cursor-move"
                    />
                    <text x={gate.x + 4} y={gate.y + 12} fill={glowColor} className="font-mono text-[7px] uppercase font-bold select-none pointer-events-none">
                      GATE
                    </text>
                    <rect
                      x={gate.x + gate.w - 8}
                      y={gate.y + gate.h - 8}
                      width={8}
                      height={8}
                      fill={isSelected ? '#ffffff' : glowColor}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'gate', gate.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 2.1 Switches Renderer */}
              {(profile.switches || []).map((sw, idx) => {
                const isSelected = selectedType === 'switch' && selectedId === sw.id;
                const color = sw.props?.color || '#eab308';
                return (
                  <g key={sw.id}>
                    <rect
                      x={sw.x}
                      y={sw.y}
                      width={sw.w}
                      height={sw.h}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'switch', sw.id, { index: idx })}
                      fill={isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(15, 23, 42, 0.8)'}
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={2}
                      className="cursor-move"
                      rx={2}
                    />
                    <circle cx={sw.x + sw.w/2} cy={sw.y + sw.h/2} r={3} fill={color} className="pointer-events-none" />
                    <text x={sw.x + 3} y={sw.y - 4} fill={color} className="font-mono text-[7px] font-bold select-none pointer-events-none">
                      SW
                    </text>
                    <rect
                      x={sw.x + sw.w - 6}
                      y={sw.y + sw.h - 6}
                      width={6}
                      height={6}
                      fill={isSelected ? '#ffffff' : color}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleNodeMouseDown(e, 'switch', sw.id, { index: idx, isResize: true, isCorner: true })}
                    />
                  </g>
                );
              })}

              {/* 2.2 Handcrafted Enemy Spawners Renderer */}
              {(profile.enemyPlacements || []).map((ep, idx) => {
                const isSelected = selectedType === 'enemyPlacement' && selectedId === ep.id;
                return (
                  <g key={ep.id}>
                    <circle
                      cx={ep.x}
                      cy={ep.y}
                      r={10}
                      onMouseDown={(e) => handleNodeMouseDown(e, 'enemyPlacement', ep.id, { index: idx })}
                      fill={isSelected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.1)'}
                      stroke={isSelected ? '#ffffff' : '#a855f7'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="cursor-move"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={ep.x}
                      y={ep.y + 3}
                      fill="#a855f7"
                      textAnchor="middle"
                      className="font-mono text-[8px] font-black select-none pointer-events-none"
                    >
                      EP
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>
        </div>

      </div>

      {/* RIGHT AREA: Inspector & Metadata configs */}
      <div className="w-full md:w-80 bg-black/80 flex flex-col border-l border-cyan-950 sticky right-0 overflow-y-auto">
        <div className="border-b border-cyan-950 p-4">
          <div className="text-xs text-cyan-600 font-mono uppercase tracking-widest">Editor Deck</div>
          <h3 className="text-xl font-bold tracking-tight text-white uppercase mt-0.5 truncate">{profile.name}</h3>
          
          <button
            onClick={() => onPlaytest(profile)}
            disabled={validation.status === 'errors'}
            className={`w-full py-2.5 mt-3 text-sm font-mono font-bold uppercase tracking-wider border rounded shadow-md transition-all ${
              validation.status === 'errors'
                ? 'border-cyan-950 text-cyan-900 cursor-not-allowed bg-black/40'
                : 'border-cyan-400 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}
          >
            ⚡ Launch Playtest
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-cyan-950 bg-black/40">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider text-center ${
              activeTab === 'properties' ? 'border-b border-cyan-400 text-cyan-400' : 'text-cyan-700'
            }`}
          >
            Meta
          </button>
          <button
            onClick={() => setActiveTab('enemies')}
            className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider text-center ${
              activeTab === 'enemies' ? 'border-b border-cyan-400 text-cyan-400' : 'text-cyan-700'
            }`}
          >
            Combat
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider text-center ${
              activeTab === 'diagnostics' ? 'border-b-2 border-orange-500 text-orange-400' : 'text-cyan-700'
            }`}
          >
            Diagnostics ({validation.errors.length + validation.warnings.length})
          </button>
        </div>

        {/* Tab 1: properties Inspector */}
        {activeTab === 'properties' && (
          <div className="p-4 flex flex-col gap-4 text-left font-mono text-xs overflow-y-auto max-h-[70vh]">
            
            {/* 1. Selected Platform Inspector */}
            {selectedType === 'platform' && selectedId !== null && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                  <span className="text-cyan-400 font-bold">PLATFORM INSPECTOR</span>
                  <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                </div>
                
                {profile.platformLayout && profile.platformLayout[selectedId as number] && (() => {
                  const plat = profile.platformLayout[selectedId as number];
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>X: {plat[0]}px</div>
                        <div>Y: {plat[1]}px</div>
                        <div>Width: {plat[2]}px</div>
                        <div>Thickness: {plat[3]}px</div>
                      </div>

                      <div className="flex flex-col gap-1 mt-2">
                        <label className="text-[10px] text-cyan-700 uppercase">Material/Kind</label>
                        <select
                          value={plat.kind || 'normal'}
                          onChange={(e) => {
                            const updated = [...profile.platformLayout];
                            updated[selectedId as number] = { ...updated[selectedId as number], kind: e.target.value as any };
                            setProfile({ ...profile, platformLayout: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                        >
                          <option value="normal">Normal Grid</option>
                          <option value="ice">Ice Ledge (Slippery)</option>
                          <option value="crumbling">Crumbling Shelf (Collapsing)</option>
                          <option value="conveyorLeft">Conveyor Left</option>
                          <option value="conveyorRight">Conveyor Right</option>
                          <option value="bounce">Vortex Bounce Pad</option>
                        </select>
                      </div>

                      <button
                        onClick={handleDeleteSelected}
                        className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                      >
                        ✂ Delete Platform
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 2. Selected Hazard Inspector */}
            {selectedType === 'hazard' && selectedId !== null && (() => {
              const hIndex = profile.hazards?.findIndex(h => h.id === selectedId);
              if (hIndex === undefined || hIndex === -1) return null;
              const h = profile.hazards![hIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-orange-400 font-bold">HAZARD INSPECTOR</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Hazard Class</label>
                    <select
                      value={h.kind}
                      onChange={(e) => {
                        const updated = [...(profile.hazards || [])];
                        updated[hIndex] = { ...updated[hIndex], kind: e.target.value as any };
                        setProfile({ ...profile, hazards: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value="water">Water Abyss (Sinks & Drows)</option>
                      <option value="lava">Lava Cavern (Slowly Melts Player)</option>
                      <option value="spikes">Nanospike Strips (Instant Death)</option>
                      <option value="electric">Electric Barrier (Cyclic Zap)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>X: {h.x}px</div>
                    <div>Y: {h.y}px</div>
                    <div>W: {h.w}px</div>
                    <div>H: {h.h}px</div>
                  </div>

                  {h.kind === 'water' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Drowntime Cooldown (Frames)</label>
                        <input
                          type="number"
                          value={h.props?.escapeWindow ?? 120}
                          onChange={(e) => {
                            const updated = [...(profile.hazards || [])];
                            updated[hIndex] = { ...updated[hIndex], props: { ...updated[hIndex].props, escapeWindow: Number(e.target.value) } };
                            setProfile({ ...profile, hazards: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Sink Force Speed ({h.props?.sinkSpeed ?? 0.7})</label>
                        <input
                          type="range"
                          min="0.2"
                          max="2.0"
                          step="0.1"
                          value={h.props?.sinkSpeed ?? 0.7}
                          onChange={(e) => {
                            const updated = [...(profile.hazards || [])];
                            updated[hIndex] = { ...updated[hIndex], props: { ...updated[hIndex].props, sinkSpeed: Number(e.target.value) } };
                            setProfile({ ...profile, hazards: updated });
                          }}
                          className="w-full bg-cyan-950 accent-cyan-400"
                        />
                      </div>
                    </>
                  )}

                  {h.kind === 'lava' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-cyan-700 uppercase">Damage Burn Delay Interval</label>
                      <input
                        type="number"
                        value={h.props?.damageDelay ?? 20}
                        onChange={(e) => {
                          const updated = [...(profile.hazards || [])];
                          updated[hIndex] = { ...updated[hIndex], props: { ...updated[hIndex].props, damageDelay: Number(e.target.value) } };
                          setProfile({ ...profile, hazards: updated });
                        }}
                        className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                      />
                    </div>
                  )}

                  {h.kind === 'electric' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-700 uppercase">Active (Frames)</label>
                        <input
                          type="number"
                          value={h.props?.activeFrames ?? 90}
                          onChange={(e) => {
                            const updated = [...(profile.hazards || [])];
                            updated[hIndex] = { ...updated[hIndex], props: { ...updated[hIndex].props, activeFrames: Number(e.target.value) } };
                            setProfile({ ...profile, hazards: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-700 uppercase">Inactive (Frames)</label>
                        <input
                          type="number"
                          value={h.props?.inactiveFrames ?? 70}
                          onChange={(e) => {
                            const updated = [...(profile.hazards || [])];
                            updated[hIndex] = { ...updated[hIndex], props: { ...updated[hIndex].props, inactiveFrames: Number(e.target.value) } };
                            setProfile({ ...profile, hazards: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Hazard
                  </button>
                </div>
              );
            })()}

            {/* 3. Selected Force Zone Inspector */}
            {selectedType === 'forceZone' && selectedId !== null && (() => {
              const zIndex = profile.zones?.findIndex(z => z.id === selectedId);
              if (zIndex === undefined || zIndex === -1) return null;
              const z = profile.zones![zIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-emerald-400 font-bold">ZONE INSPECTOR</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Zone Class</label>
                    <select
                      value={z.kind}
                      onChange={(e) => {
                        const updated = [...(profile.zones || [])];
                        updated[zIndex] = { ...updated[zIndex], kind: e.target.value as any };
                        setProfile({ ...profile, zones: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value="wind">Wind Current (Drifting airflow)</option>
                      <option value="gravity">Gravity Field (Custom weight multiplier)</option>
                      <option value="slow">Viscous / Sludge slowing zone</option>
                      <option value="radiation">Sub-orbital Radiation storm</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>X: {z.x}px</div>
                    <div>Y: {z.y}px</div>
                    <div>W: {z.w}px</div>
                    <div>H: {z.h}px</div>
                  </div>

                  {z.kind === 'wind' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Horizontal Wind Force ({z.props?.forceX ?? 0.1})</label>
                        <input
                          type="range"
                          min="-1.0"
                          max="1.0"
                          step="0.05"
                          value={z.props?.forceX ?? 0.1}
                          onChange={(e) => {
                            const updated = [...(profile.zones || [])];
                            updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, forceX: Number(e.target.value) } };
                            setProfile({ ...profile, zones: updated });
                          }}
                          className="w-full bg-cyan-950 accent-cyan-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Vertical Uplift Force ({z.props?.forceY ?? -0.05})</label>
                        <input
                          type="range"
                          min="-1.0"
                          max="1.0"
                          step="0.05"
                          value={z.props?.forceY ?? -0.05}
                          onChange={(e) => {
                            const updated = [...(profile.zones || [])];
                            updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, forceY: Number(e.target.value) } };
                            setProfile({ ...profile, zones: updated });
                          }}
                          className="w-full bg-cyan-950 accent-cyan-400"
                        />
                      </div>
                    </div>
                  )}

                  {z.kind === 'gravity' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-cyan-700 uppercase">Gravity Multiplier ({z.props?.gravityMultiplier ?? 0.35}x)</label>
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.05"
                        value={z.props?.gravityMultiplier ?? 0.35}
                        onChange={(e) => {
                          const updated = [...(profile.zones || [])];
                          updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, gravityMultiplier: Number(e.target.value) } };
                          setProfile({ ...profile, zones: updated });
                        }}
                        className="w-full bg-cyan-950 accent-cyan-500"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[10px] text-cyan-700 uppercase">Affiliation Targets:</span>
                    <label className="flex items-center gap-2 text-[10px] text-cyan-500">
                      <input
                        type="checkbox"
                        checked={z.props?.affectsPlayer ?? true}
                        onChange={(e) => {
                          const updated = [...(profile.zones || [])];
                          updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, affectsPlayer: e.target.checked } };
                          setProfile({ ...profile, zones: updated });
                        }}
                      />
                      Affects Player
                    </label>
                    <label className="flex items-center gap-2 text-[10px] text-cyan-500">
                      <input
                        type="checkbox"
                        checked={z.props?.affectsItems ?? true}
                        onChange={(e) => {
                          const updated = [...(profile.zones || [])];
                          updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, affectsItems: e.target.checked } };
                          setProfile({ ...profile, zones: updated });
                        }}
                      />
                      Affects Cargo/Items
                    </label>
                    <label className="flex items-center gap-2 text-[10px] text-cyan-500">
                      <input
                        type="checkbox"
                        checked={z.props?.visible ?? true}
                        onChange={(e) => {
                          const updated = [...(profile.zones || [])];
                          updated[zIndex] = { ...updated[zIndex], props: { ...updated[zIndex].props, visible: e.target.checked } };
                          setProfile({ ...profile, zones: updated });
                        }}
                      />
                      Render Wind/Gravity Field Particles
                    </label>
                  </div>

                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Zone
                  </button>
                </div>
              );
            })()}

            {/* 4. Selected Stage Object Inspector */}
            {selectedType === 'stageObject' && selectedId !== null && (() => {
              const oIndex = profile.objects?.findIndex(o => o.id === selectedId);
              if (oIndex === undefined || oIndex === -1) return null;
              const o = profile.objects![oIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">OBJECT INSPECTOR</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Object Class</label>
                    <select
                      value={o.kind}
                      onChange={(e) => {
                        const updated = [...(profile.objects || [])];
                        let updatedW = o.w;
                        let updatedH = o.h;
                        if (e.target.value === 'fan') { updatedW = 50; updatedH = 30; }
                        else if (e.target.value === 'teleporter') { updatedW = 35; updatedH = 40; }
                        else if (e.target.value === 'movingPlatform') { updatedW = 120; updatedH = 15; }
                        
                        updated[oIndex] = { ...updated[oIndex], kind: e.target.value as any, w: updatedW, h: updatedH };
                        setProfile({ ...profile, objects: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value="fan">Ventilation Fan (Blows Player)</option>
                      <option value="teleporter">Linked Quantum Gateway</option>
                      <option value="movingPlatform">Moving Transit Platform</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>X: {o.x}px</div>
                    <div>Y: {o.y}px</div>
                    <div>W: {o.w}px</div>
                    <div>H: {o.h}px</div>
                  </div>

                  {o.kind === 'fan' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Blow Direction</label>
                        <select
                          value={o.props?.direction ?? 'up'}
                          onChange={(e) => {
                            const updated = [...(profile.objects || [])];
                            updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, direction: e.target.value as any } };
                            setProfile({ ...profile, objects: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        >
                          <option value="up">Vent Airflow Upward</option>
                          <option value="down">Vent Airflow Downward</option>
                          <option value="left">Vent Airflow Leftward</option>
                          <option value="right">Vent Airflow Rightward</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Blow Strength Force ({o.props?.strength ?? 0.25})</label>
                        <input
                          type="range"
                          min="0.05"
                          max="1.5"
                          step="0.05"
                          value={o.props?.strength ?? 0.25}
                          onChange={(e) => {
                            const updated = [...(profile.objects || [])];
                            updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, strength: Number(e.target.value) } };
                            setProfile({ ...profile, objects: updated });
                          }}
                          className="w-full bg-cyan-950 accent-cyan-400"
                        />
                      </div>
                    </>
                  )}

                  {o.kind === 'teleporter' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Pair Linked Portal ID</label>
                        <select
                          value={o.props?.pairId || ''}
                          onChange={(e) => {
                            const updated = [...(profile.objects || [])];
                            updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, pairId: e.target.value } };
                            setProfile({ ...profile, objects: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        >
                          <option value="">-- UNLINKED PORTAL --</option>
                          {(profile.objects || []).filter(item => item.kind === 'teleporter' && item.id !== o.id).map(item => (
                            <option key={item.id} value={item.id}>{item.id} (at X:{item.x}, Y:{item.y})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Cooldown Frames</label>
                        <input
                          type="number"
                          value={o.props?.cooldownFrames ?? 60}
                          onChange={(e) => {
                            const updated = [...(profile.objects || [])];
                            updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, cooldownFrames: Number(e.target.value) } };
                            setProfile({ ...profile, objects: updated });
                          }}
                          className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1.5 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {o.kind === 'movingPlatform' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-cyan-700 uppercase">Path End X1</label>
                          <input
                            type="number"
                            value={o.props?.pathX1 ?? o.x}
                            onChange={(e) => {
                              const updated = [...(profile.objects || [])];
                              updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, pathX1: Number(e.target.value) } };
                              setProfile({ ...profile, objects: updated });
                            }}
                            className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1 text-xs w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-cyan-700 uppercase">Path End Y1</label>
                          <input
                            type="number"
                            value={o.props?.pathY1 ?? o.y}
                            onChange={(e) => {
                              const updated = [...(profile.objects || [])];
                              updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, pathY1: Number(e.target.value) } };
                              setProfile({ ...profile, objects: updated });
                            }}
                            className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1 text-xs w-full"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-cyan-700 uppercase">Path End X2</label>
                          <input
                            type="number"
                            value={o.props?.pathX2 ?? o.x + 160}
                            onChange={(e) => {
                              const updated = [...(profile.objects || [])];
                              updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, pathX2: Number(e.target.value) } };
                              setProfile({ ...profile, objects: updated });
                            }}
                            className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1 text-xs w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-cyan-700 uppercase">Path End Y2</label>
                          <input
                            type="number"
                            value={o.props?.pathY2 ?? o.y}
                            onChange={(e) => {
                              const updated = [...(profile.objects || [])];
                              updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, pathY2: Number(e.target.value) } };
                              setProfile({ ...profile, objects: updated });
                            }}
                            className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-1 text-xs w-full"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(profile.objects || [])];
                          updated[oIndex] = {
                            ...updated[oIndex],
                            props: {
                              ...updated[oIndex].props,
                              pathX1: o.x,
                              pathY1: o.y,
                              pathX2: o.x + 160,
                              pathY2: o.y,
                              speed: o.props?.speed ?? 1.5
                            }
                          };
                          setProfile({ ...profile, objects: updated });
                        }}
                        className="py-1 px-2 border border-cyan-900 bg-cyan-950/20 text-cyan-400 text-[10px] uppercase font-mono rounded"
                      >
                        Reset Path to X+160px
                      </button>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-700 uppercase">Travel Speed ({o.props?.speed ?? 1.5})</label>
                        <input
                          type="range"
                          min="0.5"
                          max="4.5"
                          step="0.1"
                          value={o.props?.speed ?? 1.5}
                          onChange={(e) => {
                            const updated = [...(profile.objects || [])];
                            updated[oIndex] = { ...updated[oIndex], props: { ...updated[oIndex].props, speed: Number(e.target.value) } };
                            setProfile({ ...profile, objects: updated });
                          }}
                          className="w-full bg-cyan-950 accent-cyan-400"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Object
                  </button>
                </div>
              );
            })()}

            {/* 5. Selected Spawn Zone Inspector */}
            {selectedType === 'zone' && selectedId !== null && (() => {
              const item = profile.itemSpawnZones?.find(s => s.id === selectedId);
              const key = item ? 'itemSpawnZones' : 'enemySpawnZones';
              const zList = profile[key] || [];
              const zIndex = zList.findIndex(z => z.id === selectedId);
              if (zIndex === -1) return null;
              const z = zList[zIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">{key === 'itemSpawnZones' ? 'ITEM' : 'ENEMY'} SPAWN ZONE</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>X: {z.x}px</div>
                    <div>Y: {z.y}px</div>
                    <div>W: {z.w}px</div>
                    <div>H: {z.h}px</div>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Spawn Zone
                  </button>
                </div>
              );
            })()}

            {/* 5.1 Selected Powerup Inspector */}
            {selectedType === 'powerup' && selectedId !== null && (() => {
              const pList = profile.powerups || [];
              const pIndex = pList.findIndex(p => p.id === selectedId);
              if (pIndex === -1) return null;
              const pu = pList[pIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">POWER-UP INSPECTOR</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>X: {pu.x}px</div>
                    <div>Y: {pu.y}px</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Power-up Type</label>
                    <select
                      value={pu.kind}
                      onChange={(e) => {
                        const updated = [...pList];
                        const kind = e.target.value;
                        if (kind === 'jetpack') {
                          const numJetpacks = pList.filter(p => p.kind === 'jetpack').length;
                          if (numJetpacks >= 2) {
                            alert("Maximum of 2 jetpacks can be placed in a level.");
                            return;
                          }
                        }
                        let color = '#06b6d4';
                        if (kind === 'gravityBoots') color = '#06b6d4';
                        else if (kind === 'heatShield') color = '#f97316';
                        else if (kind === 'aquaHelmet') color = '#3b82f6';
                        else if (kind === 'rubberSuit') color = '#eab308';
                        else if (kind === 'magnetBoots') color = '#ec4899';
                        else if (kind === 'jetpack') color = '#a855f7';
                        updated[pIndex] = { ...pu, kind: kind as any, props: { ...pu.props, glowColor: color } };
                        setProfile({ ...profile, powerups: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                    >
                      <option value="gravityBoots">GRAVITY BOOTS (FLIP GRAVITY)</option>
                      <option value="heatShield">HEAT SHIELD (LAVA PROTECTION)</option>
                      <option value="aquaHelmet">AQUA HELMET (BREATH UNDERWATER)</option>
                      <option value="rubberSuit">RUBBER SUIT (ELECTRICAL COAT)</option>
                      <option value="magnetBoots">MAGNET BOOTS (WALK CEILINGS)</option>
                      <option value="jetpack">🎒 JETPACK (FLIGHT GEAR UP)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="pu-respawn"
                      checked={pu.respawn !== false}
                      onChange={(e) => {
                        const updated = [...pList];
                        updated[pIndex] = { ...pu, respawn: e.target.checked };
                        setProfile({ ...profile, powerups: updated });
                      }}
                      className="accent-cyan-400"
                    />
                    <label htmlFor="pu-respawn" className="text-[11px] text-cyan-300">Respawns After 12 Seconds</label>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Power-up
                  </button>
                </div>
              );
            })()}

            {/* 5.2 Selected Key Inspector */}
            {selectedType === 'key' && selectedId !== null && (() => {
              const kList = profile.keys || [];
              const kIndex = kList.findIndex(k => k.id === selectedId);
              if (kIndex === -1) return null;
              const key = kList[kIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">KEY CARD INSPECTOR</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>X: {key.x}px</div>
                    <div>Y: {key.y}px</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Key Code Color</label>
                    <select
                      value={key.kind}
                      onChange={(e) => {
                        const updated = [...kList];
                        updated[kIndex] = { ...key, kind: e.target.value as any };
                        setProfile({ ...profile, keys: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                    >
                      <option value="redKey">RED ENCRYPTION KEY</option>
                      <option value="blueKey">BLUE ENCRYPTION KEY</option>
                      <option value="greenKey">GREEN ENCRYPTION KEY</option>
                      <option value="goldKey">GOLD ROYAL KEY</option>
                      <option value="silverKey">SILVER KEYCARD</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-[10px] text-cyan-700 uppercase">Target Gate Match Link (ID)</label>
                    <input
                      type="text"
                      value={(key.opensGateIds || []).join(', ')}
                      placeholder="e.g. gate-1"
                      onChange={(e) => {
                        const updated = [...kList];
                        updated[kIndex] = { ...key, opensGateIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                        setProfile({ ...profile, keys: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="key-consume"
                      checked={key.consumedOnUse !== false}
                      onChange={(e) => {
                        const updated = [...kList];
                        updated[kIndex] = { ...key, consumedOnUse: e.target.checked };
                        setProfile({ ...profile, keys: updated });
                      }}
                      className="accent-cyan-400"
                    />
                    <label htmlFor="key-consume" className="text-[11px] text-cyan-300">Dissolves/Consumed On Use</label>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Key Card
                  </button>
                </div>
              );
            })()}

            {/* 5.3 Selected Gate Inspector */}
            {selectedType === 'gate' && selectedId !== null && (() => {
              const gList = profile.gates || [];
              const gIndex = gList.findIndex(g => g.id === selectedId);
              if (gIndex === -1) return null;
              const gate = gList[gIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">LASER BARRIER GATE</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>X: {gate.x}px</div>
                    <div>Y: {gate.y}px</div>
                    <div>W: {gate.w}px</div>
                    <div>H: {gate.h}px</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Lock/Link Mechanism</label>
                    <select
                      value={gate.kind}
                      onChange={(e) => {
                        const updated = [...gList];
                        const kind = e.target.value;
                        let color = '#06b6d4';
                        if (kind === 'locked') color = '#ef4444';
                        else if (kind === 'switch') color = '#eab308';
                        else if (kind === 'timed') color = '#06b6d4';
                        else if (kind === 'powerup') color = '#ec4899';
                        else if (kind === 'oneWay') color = '#10b981';
                        updated[gIndex] = { ...gate, kind: kind as any, props: { ...gate.props, color } };
                        setProfile({ ...profile, gates: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                    >
                      <option value="locked">LOCKED FIELD (REQUIRES KEY)</option>
                      <option value="switch">SWITCH CONTROLLED (WIRED LINK)</option>
                      <option value="timed">TIMED GATE (TIMER INTERVALS)</option>
                    </select>
                  </div>
                  {gate.kind === 'locked' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-cyan-700 uppercase">Required Key Code</label>
                      <select
                        value={gate.requiredKeyKind || 'redKey'}
                        onChange={(e) => {
                          const updated = [...gList];
                          updated[gIndex] = { ...gate, requiredKeyKind: e.target.value as any };
                          setProfile({ ...profile, gates: updated });
                        }}
                        className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                      >
                        <option value="redKey">RED ENCRYPTION KEY</option>
                        <option value="blueKey">BLUE ENCRYPTION KEY</option>
                        <option value="greenKey">GREEN ENCRYPTION KEY</option>
                        <option value="goldKey">GOLD ROYAL KEY</option>
                        <option value="silverKey">SILVER KEYCARD</option>
                      </select>
                    </div>
                  )}
                  {gate.kind === 'timed' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-cyan-700 uppercase">Active/Open Duration (Frames)</label>
                      <input
                        type="number"
                        value={gate.openDurationFrames ?? 180}
                        onChange={(e) => {
                          const updated = [...gList];
                          updated[gIndex] = { ...gate, openDurationFrames: Number(e.target.value) };
                          setProfile({ ...profile, gates: updated });
                        }}
                        className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Gate
                  </button>
                </div>
              );
            })()}

            {/* 5.4 Selected Switch Inspector */}
            {selectedType === 'switch' && selectedId !== null && (() => {
              const sList = profile.switches || [];
              const sIndex = sList.findIndex(s => s.id === selectedId);
              if (sIndex === -1) return null;
              const sw = sList[sIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">SWITCH CONTROL MODEM</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>X: {sw.x}px</div>
                    <div>Y: {sw.y}px</div>
                    <div>W: {sw.w}px</div>
                    <div>H: {sw.h}px</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Switch Behavior</label>
                    <select
                      value={sw.kind}
                      onChange={(e) => {
                        const updated = [...sList];
                        updated[sIndex] = { ...sw, kind: e.target.value as any };
                        setProfile({ ...profile, switches: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                    >
                      <option value="toggle">TOGGLE (ON / OFF LOCKS)</option>
                      <option value="momentary">MOMENTARY TIMED DELAY</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-[10px] text-cyan-700 uppercase">Wired Target Gate Links (IDs)</label>
                    <input
                      type="text"
                      value={(sw.targetGateIds || []).join(', ')}
                      placeholder="e.g. gate-1"
                      onChange={(e) => {
                        const updated = [...sList];
                        updated[sIndex] = { ...sw, targetGateIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                        setProfile({ ...profile, switches: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs"
                    />
                  </div>
                  {sw.kind === 'momentary' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-cyan-700 uppercase">Hold Active Timer (Frames)</label>
                      <input
                        type="number"
                        value={sw.durationFrames ?? 300}
                        onChange={(e) => {
                          const updated = [...sList];
                          updated[sIndex] = { ...sw, durationFrames: Number(e.target.value) };
                          setProfile({ ...profile, switches: updated });
                        }}
                        className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Switch
                  </button>
                </div>
              );
            })()}

            {/* 5.5 Selected Enemy Placement Spawner Inspector */}
            {selectedType === 'enemyPlacement' && selectedId !== null && (() => {
              const epList = profile.enemyPlacements || [];
              const epIndex = epList.findIndex(ep => ep.id === selectedId);
              if (epIndex === -1) return null;
              const ep = epList[epIndex];
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                    <span className="text-cyan-400 font-bold">HANDCRAFTED SPAWNER</span>
                    <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>X: {ep.x}px</div>
                    <div>Y: {ep.y}px</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Spawn Alien Target Type</label>
                    <select
                      value={ep.type}
                      onChange={(e) => {
                        const updated = [...epList];
                        updated[epIndex] = { ...ep, type: e.target.value };
                        setProfile({ ...profile, enemyPlacements: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono"
                    >
                      <option value="gravity_jelly">GRAVITY JELLY</option>
                      <option value="mine_layer">MINE LAYER</option>
                      <option value="fuel_thief">FUEL THIEF ALIEN</option>
                      <option value="turret_orb">REACTIVE ORB TURRET</option>
                      <option value="swooper_bat">SWOOPER ALIEN</option>
                      <option value="splitter_spore">SPLITTER INJECTUALS</option>
                      <option value="chameleon_spinner">CHAMELEON SPINNER</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-[10px] text-cyan-700 uppercase">Periodic Spawn Interval (Frames)</label>
                    <input
                      type="number"
                      value={ep.spawnInterval ?? 300}
                      onChange={(e) => {
                        const updated = [...epList];
                        updated[epIndex] = { ...ep, spawnInterval: Number(e.target.value) };
                        setProfile({ ...profile, enemyPlacements: updated });
                      }}
                      className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-1.5 mt-2 bg-[#22050f]/60 hover:bg-[#ff005520] border border-red-900 text-red-400 hover:text-red-200 text-center rounded transition-all text-xs"
                  >
                    ✂ Delete Spawner
                  </button>
                </div>
              );
            })()}

            {/* 5.11 Selected Player Start (P1) Inspector */}
            {selectedType === 'playerStart' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                  <span className="text-cyan-400 font-bold">PLAYER 1 SPAWN STATE</span>
                  <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                </div>
                <div className="text-gray-400 text-xs leading-relaxed mb-1">
                  Customize the starting gear and conditions for Player 1 (Blue Astro) when spawning inside this custom level.
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border border-cyan-950/40 bg-black/40 p-2 rounded">
                  <div>X: {Math.round(profile.playerStart?.x ?? GAME_WIDTH / 2)}px</div>
                  <div>Y: {Math.round(profile.playerStart?.y ?? GAME_HEIGHT - 50)}px</div>
                </div>
                
                <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded mt-1">
                  <div>
                    <div className="text-xs font-bold text-orange-400 uppercase">WEAR JETPACK GEAR</div>
                    <div className="text-[9px] text-gray-400 uppercase mt-0.5">Enables thrusting. If OFF, gets standard jumping mechanics</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...profile,
                        playerStart: {
                          x: profile.playerStart?.x ?? GAME_WIDTH / 2,
                          y: profile.playerStart?.y ?? GAME_HEIGHT - 50,
                          jetpack: !(profile.playerStart?.jetpack !== false)
                        }
                      };
                      setProfile(updated);
                      audio.playPickup();
                    }}
                    className={`text-xs px-3 py-1 font-bold border transition-all rounded ${
                      profile.playerStart?.jetpack !== false
                        ? 'border-green-500 bg-green-950/30 text-green-400' 
                        : 'border-yellow-700 bg-yellow-950/20 text-yellow-500'
                    }`}
                  >
                    {profile.playerStart?.jetpack !== false ? 'WEARING' : 'PLATFORMER'}
                  </button>
                </div>
              </div>
            )}

            {/* 5.12 Selected Player 2 Start (P2) Inspector */}
            {selectedType === 'player2Start' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-1">
                  <span className="text-emerald-400 font-bold">PLAYER 2 SPAWN STATE</span>
                  <button onClick={() => { setSelectedType(null); setSelectedId(null); }} className="text-[10px] text-cyan-600 hover:text-cyan-400">DESELECT</button>
                </div>
                <div className="text-gray-400 text-xs leading-relaxed mb-1">
                  Customize the starting gear and conditions for Player 2 (Green Astro) when spawning inside this custom level.
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border border-cyan-950/40 bg-black/40 p-2 rounded">
                  <div>X: {Math.round((profile as any).player2Start?.x ?? (GAME_WIDTH / 2 + 40))}px</div>
                  <div>Y: {Math.round((profile as any).player2Start?.y ?? (GAME_HEIGHT - 50))}px</div>
                </div>
                
                <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded mt-1">
                  <div>
                    <div className="text-xs font-bold text-orange-400 uppercase">WEAR JETPACK GEAR</div>
                    <div className="text-[9px] text-gray-400 uppercase mt-0.5">Enables thrusting. If OFF, gets standard jumping mechanics</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...profile,
                        player2Start: {
                          x: (profile as any).player2Start?.x ?? (GAME_WIDTH / 2 + 40),
                          y: (profile as any).player2Start?.y ?? (GAME_HEIGHT - 50),
                          jetpack: !((profile as any).player2Start?.jetpack !== false)
                        }
                      };
                      setProfile(updated);
                      audio.playPickup();
                    }}
                    className={`text-xs px-3 py-1 font-bold border transition-all rounded ${
                      (profile as any).player2Start?.jetpack !== false
                        ? 'border-green-500 bg-green-950/30 text-green-400' 
                        : 'border-yellow-700 bg-yellow-950/20 text-yellow-500'
                    }`}
                  >
                    {(profile as any).player2Start?.jetpack !== false ? 'WEARING' : 'PLATFORMER'}
                  </button>
                </div>
              </div>
            )}

            {/* 6. Default General Stage Properties (When nothing is selected) */}
            {selectedType === null && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Stage Identifier (Name)</label>
                  <input
                    type="text"
                    value={profile.name}
                    maxLength={15}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value.toUpperCase() })}
                    className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Subtitle Description</label>
                  <input
                    type="text"
                    value={profile.subtitle}
                    maxLength={40}
                    onChange={(e) => setProfile({ ...profile, subtitle: e.target.value.toUpperCase() })}
                    className="bg-[#05050f] border border-cyan-950 focus:border-cyan-500 text-cyan-100 p-2 text-xs uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Objective</label>
                    <select
                      value={profile.objective}
                      onChange={(e) => setProfile({ ...profile, objective: e.target.value as any })}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value="build">Build Rocket</option>
                      <option value="fuel">Fuel Only</option>
                      <option value="boss">Boss Fight</option>
                      <option value="rescue">Rescue Astronauts</option>
                      <option value="escort">Escort Drone</option>
                      <option value="reactor">Reactor Core Switches</option>
                      <option value="artifact">Artifact Extraction</option>
                      <option value="survival">Survival Wave</option>
                      <option value="rush">Speed Rush</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Fuel Count</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={profile.fuelRequired || 0}
                      onChange={(e) => setProfile({ ...profile, fuelRequired: Math.max(0, Number(e.target.value)) })}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Rocket Type</label>
                    <select
                      value={profile.rocketType || 1}
                      onChange={(e) => setProfile({ ...profile, rocketType: Number(e.target.value) })}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value={1}>Type 1 (Red)</option>
                      <option value={2}>Type 2 (Yellow)</option>
                      <option value={3}>Type 3 (White)</option>
                      <option value={4}>Type 4 (Fever)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-700 uppercase">Pre-Assembled</label>
                    <select
                      value={profile.requiresBuild ? 'no' : 'yes'}
                      onChange={(e) => setProfile({ ...profile, requiresBuild: e.target.value === 'no' })}
                      className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                    >
                      <option value="no">Need Assembly</option>
                      <option value="yes">Built Ready</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-cyan-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-700 uppercase">Environmental Gravity</span>
                    <span className="text-[11px] text-cyan-400 font-bold">{profile.gravityMultiplier || 1.0}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={profile.gravityMultiplier || 1.0}
                    onChange={(e) => setProfile({ ...profile, gravityMultiplier: Number(e.target.value) })}
                    className="w-full accent-cyan-400 bg-cyan-950"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Visual Atmosphere</label>
                  <select
                    value={profile.visualTheme || 'classic_neon'}
                    onChange={(e) => setProfile({ ...profile, visualTheme: e.target.value as any })}
                    className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                  >
                    <option value="classic_neon">Classic Amber Grid</option>
                    <option value="fever_neon">Fever Magenta Shift</option>
                    <option value="meteor_nursery">Meteor Shower Green</option>
                    <option value="wormhole_fever">Wormhole Purple Dust</option>
                    <option value="boss_unicorn">Rainbow Unicorn Realm</option>
                    <option value="boss_kiwi">Acid Kiwi Toxic Swamp</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Celestial Backdrop</label>
                  <select
                    value={profile.backdropTheme || 'deep_stars'}
                    onChange={(e) => setProfile({ ...profile, backdropTheme: e.target.value })}
                    className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                  >
                    <option value="deep_stars">Classic Deep Stars Only</option>
                    <option value="layered_nebula">Layered Volumetric Vapor Nebulae</option>
                    <option value="black_hole">Glowing Singularity (Black Hole)</option>
                    <option value="alien_planet">Giant Ringed Gas Planet</option>
                    <option value="space_station">Orbital Docking Silhouette</option>
                    <option value="dying_sun">Dying Red Giant Sun</option>
                    <option value="crystal_clouds">Crystalline Star Cluster</option>
                    <option value="dimensional_void">Psychedelic Aurora Void</option>
                    <option value="alien_city">Skyscraper Neon Skyline Horizons</option>
                    <option value="mountain_world">Distant Mountains</option>
                    <option value="volcanic_horizon">Volcanic Red Moon / ridges</option>
                    <option value="frozen_peaks">Frozen Peaks / moons</option>
                    <option value="toxic_swamp_orbit">Toxic Swamp Canopy</option>
                    <option value="desert_moon_dunes">Desert Moon Dunes</option>
                    <option value="crystal_canyon">Crystalline Spires / Canyon</option>
                    <option value="orbital_shipyard">Orbital Shipyard</option>
                    <option value="ruined_alien_temple">Ruined Alien Temple</option>
                    <option value="ringworld_arc">Artificial Ringworld Sunrise</option>
                    <option value="twin_moon_night">Twin Moon Dawn</option>
                    <option value="storm_gas_giant">Storm Gas Giant</option>
                    <option value="neon_metropolis">Neon Metropolis Sunset</option>
                    <option value="biomechanical_hive">Biomechanical Hive Orbit</option>
                    <option value="derelict_fleet">Derelict Shipyard Graveyard</option>
                    <option value="coral_planet">Coral Planet Lagoon</option>
                    <option value="electric_ion_storm">Electric Ion Storm</option>
                    <option value="midnight_flashlight">Midnight Flashlight Mode</option>
                    <option value="aurora_mountains">Aurora Mountain Observatory</option>
                    <option value="eclipse_city">Eclipse Skyline Horizon</option>
                    <option value="cosmic_ocean">Cosmic Ocean Abyss</option>
                    <option value="asteroid_graveyard">Asteroid Drift Field</option>
                    <option value="data_rain_station">Cyber Grid Data Rain Station</option>
                    <option value="prismatic_dreamfield">Prismatic Rainbow Void</option>
                    <option value="black_lava_world">Black Lava World</option>
                    <option value="ancient_monolith_valley">Ancient Monolith Valley</option>
                    <option value="space_elevator_silhouette">Space Elevator Dawn</option>
                    <option value="moonbase_horizon">Moonbase Midnight</option>
                    <option value="nebula_citadel">Candy Nebula Citadel</option>
                    <option value="radioactive_jungle">Radioactive Jungle Night</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Sky Palette</label>
                  <select
                    value={profile.skyPalette || 'space_black'}
                    onChange={(e) => setProfile({ ...profile, skyPalette: e.target.value })}
                    className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                  >
                    <option value="space_black">Absolute Space Void</option>
                    <option value="neon_twilight">Hot Neon Pink Twilight</option>
                    <option value="radioactive_aurora">Radioactive Green Horizon</option>
                    <option value="acid_mist">Sickly Swamp Yellow Daze</option>
                    <option value="cosmic_pink">Cyber Violet Magenta Sunrise</option>
                    <option value="void_purple">High Contrast Void Purple</option>
                    <option value="deep_blue_night">Deep Blue Night</option>
                    <option value="alien_sunset_orange">Alien Sunset Orange</option>
                    <option value="pale_moon_dawn">Pale Moon Dawn</option>
                    <option value="crimson_eclipse">Crimson Lunar Eclipse</option>
                    <option value="emerald_twilight">Emerald Aurora Twilight</option>
                    <option value="frozen_cyan_haze">Frozen Cyan Haze</option>
                    <option value="golden_space_dusk">Golden Space Dusk</option>
                    <option value="toxic_yellow_sky">Toxic Yellow sky</option>
                    <option value="storm_indigo">Storm Indigo Night</option>
                    <option value="starless_black">Starless Darkness Black</option>
                    <option value="candy_nebula">Vibrant Candy Nebula</option>
                    <option value="radioactive_magenta">Radioactive Pink-Purple</option>
                    <option value="soft_pastel_dawn">Soft Pastel Dawn</option>
                    <option value="red_giant_glow">Red Giant Sun Glow</option>
                    <option value="underwater_space_blue">Underwater Deep Space Blue</option>
                    <option value="electric_violet">Electric Ion Violet</option>
                    <option value="synthwave_sunset">Synthwave Sunset Grid</option>
                    <option value="obsidian_green">Obsidian Green Abyss</option>
                    <option value="aurora_blue_green">Aurora Blue-Green Shimmer</option>
                    <option value="blacklight_purple">Blacklight Ultraviolet Purple</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-cyan-700 uppercase">Atmospheric Weather</label>
                  <select
                    value={profile.weatherEffect || 'none'}
                    onChange={(e) => setProfile({ ...profile, weatherEffect: e.target.value })}
                    className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                  >
                    <option value="none">Empty Space Vacuum</option>
                    <option value="spurs">Glow-Bio Floating Spores</option>
                    <option value="acid_rain">Electric Lime Acid Rain</option>
                    <option value="ash">Rotating Crimson Volcanic Ash</option>
                    <option value="embers">Blazing Upward Magma Embers</option>
                    <option value="ice_shards">Glittering Crystal Ice Shards</option>
                    <option value="solar_flare">Shimmering Solar Flare Ripples</option>
                    <option value="electrical_storm">Electrical Ion Tempest</option>
                    <option value="plasma_rain">Pink Neon Plasma Rain</option>
                    <option value="data_rain">Falling Green Binary Code</option>
                    <option value="underwater_bubbles">Rising Water Bubbles</option>
                    <option value="gentle_snow">Gentle Polar Snow</option>
                    <option value="heavy_snow">Heavy Blizzard Snow</option>
                    <option value="cosmic_dust">Fine Translucent Cosmic Dust</option>
                    <option value="ion_sparks">Zapping Violet Ion Sparks</option>
                    <option value="meteor_sparks">Frictional Orange Meteor Sparks</option>
                    <option value="neon_drizzle">Rose Dust Neon Drizzle</option>
                    <option value="fireflies">Blinking Golden Fireflies</option>
                    <option value="alien_pollen">Bioluminescent Green Pollen</option>
                    <option value="toxic_fumes">Spreading Acidic Toxic Fumes</option>
                    <option value="steam_mist">Pressurized Escape Valve Steam</option>
                    <option value="sandstorm">Violent Desert Sandstorm</option>
                    <option value="rain_streaks">High Contrast Rain Streaks</option>
                    <option value="star_snow">Sparkling Glitter Shimmer</option>
                    <option value="confetti_stars">Retro Rainbow Star Confetti</option>
                    <option value="aurora_particles">Magnetic Teal Aurora Dust</option>
                    <option value="orbital_debris">Shrapnel Orbital Scrap Metal</option>
                    <option value="falling_crystal_dust">Diamond Powder Crystal Dust</option>
                    <option value="glitch_pixels">Anomalous Digital Pixel Glitches</option>
                    <option value="prismatic_sparks">Color-Cycling Prismatic Sparks</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowBackdropDesigner(true)}
                    className="w-full py-2 px-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 font-mono text-xs uppercase rounded transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,165,255,0.1)] active:scale-98"
                  >
                    🎨 Design Cosmic Atmosphere
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-cyan-950 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-700 uppercase">2P Co-Op Support</span>
                    <span className={`text-[10px] font-bold ${profile.player2Start ? 'text-green-400' : 'text-cyan-700'}`}>
                      {profile.player2Start ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (profile.player2Start) {
                        const updated = { ...profile };
                        delete updated.player2Start;
                        setProfile(updated);
                      } else {
                        setProfile({
                          ...profile,
                          player2Start: { x: (profile.playerStart?.x ?? GAME_WIDTH / 2) + 40, y: profile.playerStart?.y ?? (GAME_HEIGHT - 50) }
                        });
                      }
                    }}
                    className={`w-full py-1.5 text-xs text-center border rounded transition-all active:scale-[0.98] cursor-pointer ${
                      profile.player2Start 
                        ? 'bg-green-950/45 text-green-400 border-green-800 hover:bg-green-900/40 font-bold' 
                        : 'bg-[#0a2f35]/25 text-cyan-400 border-cyan-800 hover:bg-cyan-900/30 font-bold'
                    }`}
                  >
                    {profile.player2Start ? 'REMOVE PLAYER 2 SPAWN' : 'ADD PLAYER 2 SPAWN'}
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* Tab 2: Enemies & Spawns Config */}
        {activeTab === 'enemies' && (
          <div className="p-4 flex flex-col gap-4 text-left font-mono text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-cyan-700 uppercase">Spawn Rate Multiplier</label>
              <select
                value={profile.spawnRateMultiplier || 1}
                onChange={(e) => setProfile({ ...profile, spawnRateMultiplier: Number(e.target.value) })}
                className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
              >
                <option value={0.5}>Sleepy (0.5x)</option>
                <option value={1.0}>Standard (1.0x)</option>
                <option value={1.5}>Hard (1.5x)</option>
                <option value={2.0}>Chaos (2.0x)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-cyan-700 uppercase">Encounter Flow Pattern</label>
              <select
                value={profile.encounterPattern || 'classic_random'}
                onChange={(e) => setProfile({ ...profile, encounterPattern: e.target.value as any })}
                className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
              >
                <option value="classic_random">Classic Random Wave</option>
                <option value="meteor_shower">Meteor Shower Shower</option>
                <option value="saucer_ring">Saucer Ring Homing</option>
                <option value="blob_swarm">Blob Swarm Split</option>
                <option value="sabotage_pressure">Saboteur Fuel Leech</option>
              </select>
            </div>

            {profile.objective === 'boss' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-700 uppercase">Active Boss Entity</label>
                <select
                  value={profile.bossId || 'fuel_leech'}
                  onChange={(e) => setProfile({ ...profile, bossId: e.target.value as any })}
                  className="bg-[#05050f] border border-cyan-950 text-cyan-100 p-2 text-xs"
                >
                  <option value="fuel_leech">Fuel Leech Boss</option>
                  <option value="rocket_eater">Rocket Eater Colossus</option>
                  <option value="rainbow_unicorn">Rainbow Unicorn</option>
                  <option value="acid_kiwi">Acid Kiwi</option>
                </select>
              </div>
            )}

            {profile.objective === 'rescue' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">RESCUE MISSION OPTIONS</span>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-cyan-600 uppercase">Required Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={profile.objectiveRules?.rescue?.requiredRescues || 1}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value));
                      const rules = {
                        ...(profile.objectiveRules || { mode: 'rescue' }),
                        mode: 'rescue' as const,
                        rescue: {
                          ...(profile.objectiveRules?.rescue || { requiredRescues: 1 }),
                          requiredRescues: count
                        }
                      };
                      setProfile({ ...profile, objectiveRules: rules });
                    }}
                    className="bg-black border border-cyan-950 p-1 w-16 text-right text-cyan-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rescues = [...(profile.rescueEntities || [])];
                    rescues.push({
                      id: `rescue_${Date.now()}`,
                      x: 100 + Math.random() * 150,
                      y: 200 + Math.random() * 100,
                      enabled: true,
                      kind: 'astronaut',
                      required: true,
                      value: 500
                    });

                    // Auto insert zone if missing
                    const zones = [...(profile.objectiveZones || [])];
                    if (!zones.some(z => z.kind === 'rescueDropoff')) {
                      zones.push({
                        id: `dropoff_${Date.now()}`,
                        x: 50,
                        y: 350,
                        w: 60,
                        h: 40,
                        enabled: true,
                        kind: 'rescueDropoff',
                        label: 'RESCUE SHIP',
                        props: { visible: true, color: '#22c55e' }
                      });
                    }

                    setProfile({
                      ...profile,
                      rescueEntities: rescues,
                      objectiveZones: zones
                    });
                  }}
                  className="bg-cyan-900 hover:bg-cyan-800 text-white rounded text-[10px] p-1.5 uppercase font-medium mt-1"
                >
                  + Spawn Astronaut & Drop-off Zone
                </button>
              </div>
            )}

            {profile.objective === 'escort' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">ESCORT DRONE OPTIONS</span>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-cyan-600 uppercase">Fail on Death</label>
                  <input
                    type="checkbox"
                    checked={profile.objectiveRules?.escort?.failOnEscortDeath ?? true}
                    onChange={(e) => {
                      const rules = {
                        ...(profile.objectiveRules || { mode: 'escort' }),
                        mode: 'escort' as const,
                        escort: {
                          ...(profile.objectiveRules?.escort || { mustSurvive: true, failOnEscortDeath: true }),
                          failOnEscortDeath: e.target.checked
                        }
                      };
                      setProfile({ ...profile, objectiveRules: rules });
                    }}
                    className="accent-cyan-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const escorts = [...(profile.escortEntities || [])];
                    escorts.push({
                      id: `escort_${Date.now()}`,
                      x: 150,
                      y: 150,
                      enabled: true,
                      kind: 'repairDrone',
                      destinationZoneId: 'escort_dest',
                      health: 3,
                      speed: 0.7,
                      followPlayer: true,
                      vulnerableToHazards: true,
                      vulnerableToEnemies: true,
                      canBeCarried: false
                    });

                    const zones = [...(profile.objectiveZones || [])];
                    if (!zones.some(z => z.kind === 'escortDestination')) {
                      zones.push({
                        id: `escort_dest`,
                        x: 480,
                        y: 320,
                        w: 60,
                        h: 50,
                        enabled: true,
                        kind: 'escortDestination',
                        label: 'GATEWAY RECEIVER',
                        props: { visible: true, color: '#06b6d4' }
                      });
                    }

                    setProfile({
                      ...profile,
                      escortEntities: escorts,
                      objectiveZones: zones
                    });
                  }}
                  className="bg-cyan-900 hover:bg-cyan-800 text-white rounded text-[10px] p-1.5 uppercase font-medium mt-1"
                >
                  + Spawn Drone & Destination Zone
                </button>
              </div>
            )}

            {profile.objective === 'reactor' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">REACTOR SWITCH OPTIONS</span>
                <button
                  type="button"
                  onClick={() => {
                    const switches = [...(profile.reactorSwitches || [])];
                    const count = switches.length;
                    switches.push({
                      id: `reactor_${Date.now()}`,
                      x: 80 + (count % 4) * 110,
                      y: 160 + (count % 3) * 60,
                      w: 28,
                      h: 18,
                      enabled: true,
                      requiresPlayerTouch: true,
                      oneShot: true,
                      resetIfWrongOrder: false,
                      orderIndex: count
                    });

                    // Ensure Rules are populated
                    const rules = {
                      ...(profile.objectiveRules || { mode: 'reactor' }),
                      mode: 'reactor' as const,
                      reactor: {
                        requiredSwitches: switches.length,
                        reactorSwitches: switches
                      }
                    };

                    setProfile({
                      ...profile,
                      reactorSwitches: switches,
                      objectiveRules: rules
                    });
                  }}
                  className="bg-cyan-900 hover:bg-cyan-800 text-white rounded text-[10px] p-1.5 uppercase font-medium mt-1"
                >
                  + Add Reactor Button Switch
                </button>
              </div>
            )}

            {profile.objective === 'artifact' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">ARTIFACT CRYSTAL OPTIONS</span>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-cyan-600 uppercase">Required Crystals</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={profile.objectiveRules?.artifact?.requiredArtifacts || 1}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value));
                      const rules = {
                        ...(profile.objectiveRules || { mode: 'artifact' }),
                        mode: 'artifact' as const,
                        artifact: {
                          ...(profile.objectiveRules?.artifact || { requiredArtifacts: 1 }),
                          requiredArtifacts: count
                        }
                      };
                      setProfile({ ...profile, objectiveRules: rules });
                    }}
                    className="bg-black border border-cyan-950 p-1 w-16 text-right text-cyan-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const arts = [...(profile.artifacts || [])];
                    arts.push({
                      id: `artifact_${Date.now()}`,
                      x: 120 + Math.random() * 200,
                      y: 100 + Math.random() * 120,
                      enabled: true,
                      kind: 'crystal',
                      required: true,
                      value: 250,
                      props: { floats: true, affectedByWind: true, affectedByGravity: true }
                    });

                    const zones = [...(profile.objectiveZones || [])];
                    if (!zones.some(z => z.kind === 'artifactDropoff')) {
                      zones.push({
                        id: `artifact_dest`,
                        x: 280,
                        y: 350,
                        w: 64,
                        h: 36,
                        enabled: true,
                        kind: 'artifactDropoff',
                        label: 'ANCIENT ALTAR',
                        props: { visible: true, color: '#fbbf24' }
                      });
                    }

                    setProfile({
                      ...profile,
                      artifacts: arts,
                      objectiveZones: zones
                    });
                  }}
                  className="bg-cyan-900 hover:bg-cyan-800 text-white rounded text-[10px] p-1.5 uppercase font-medium mt-1"
                >
                  + Spawn Crystal & Altar Zone
                </button>
              </div>
            )}

            {profile.objective === 'survival' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">SURVIVAL WAVE SETTINGS</span>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-cyan-600 uppercase">Seconds to Survive</label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={Math.round((profile.objectiveRules?.survival?.surviveFrames || 1800) / 60)}
                    onChange={(e) => {
                      const sec = Math.max(5, Number(e.target.value));
                      const rules = {
                        ...(profile.objectiveRules || { mode: 'survival' }),
                        mode: 'survival' as const,
                        survival: {
                          ...(profile.objectiveRules?.survival || { surviveFrames: 1800 }),
                          surviveFrames: sec * 60
                        }
                      };
                      setProfile({ ...profile, objectiveRules: rules });
                    }}
                    className="bg-black border border-cyan-950 p-1 w-16 text-right text-cyan-100"
                  />
                </div>
              </div>
            )}

            {profile.objective === 'rush' && (
              <div className="flex flex-col gap-2 p-2 bg-[#0a0f1d] border border-cyan-900 rounded my-1 text-xs">
                <span className="text-cyan-400 font-bold block mb-1">RUSH ACCELERATOR LIMITS</span>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-cyan-600 uppercase">Limit in Seconds</label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={Math.round((profile.objectiveRules?.rush?.timeLimitFrames || 1200) / 60)}
                    onChange={(e) => {
                      const sec = Math.max(5, Number(e.target.value));
                      const rules = {
                        ...(profile.objectiveRules || { mode: 'rush' }),
                        mode: 'rush' as const,
                        rush: {
                          ...(profile.objectiveRules?.rush || { timeLimitFrames: 1200, failOnTimeout: true }),
                          timeLimitFrames: sec * 60
                        }
                      };
                      setProfile({ ...profile, objectiveRules: rules });
                    }}
                    className="bg-black border border-cyan-950 p-1 w-16 text-right text-cyan-100"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-cyan-950">
              <label className="text-[10px] text-cyan-700 uppercase">Enemy Combat Team</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded border border-cyan-950">
                {['meteor', 'saucer', 'laser_saucer', 'classic_blob', 'saboteur', 'mine_layer'].map(type => {
                  const currentSet = profile.enemySet || [];
                  const active = currentSet.includes(type);
                  return (
                    <label 
                      key={type} 
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer select-none ${
                        active ? 'border-cyan-800 bg-[#0c252a]/50 text-cyan-300' : 'border-cyan-950 bg-[#030308] text-cyan-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        className="hidden"
                        onChange={() => {
                          const updated = active 
                            ? currentSet.filter(t => t !== type) 
                            : [...currentSet, type];
                          setProfile({ ...profile, enemySet: updated });
                        }}
                      />
                      <span className="text-[10px] uppercase truncate">{type.replace('_', ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Diagnostics Details */}
        {activeTab === 'diagnostics' && (
          <div className="p-4 flex flex-col gap-3 text-left font-mono text-xs overflow-y-auto">
            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <div className="text-center p-6 text-green-500 font-bold border border-green-950 bg-green-950/10">
                ✓ BLUEPRINT SECURE
                <div className="text-[10px] font-normal text-green-700 mt-1">Zero stability warning indicators. Ready to deploy.</div>
              </div>
            )}

            {validation.errors.map((err, i) => (
              <div key={`err-${i}`} className="border border-red-950/60 bg-red-950/20 px-3 py-2 text-xs rounded text-red-400">
                ❌ [ERROR] {err}
              </div>
            ))}

            {validation.warnings.map((wrn, i) => (
              <div key={`wrn-${i}`} className="border border-orange-950/60 bg-orange-950/15 px-3 py-2 text-xs rounded text-orange-400">
                ⚠ [WARN] {wrn}
              </div>
            ))}

            {validation.info.map((inf, i) => (
              <div key={`inf-${i}`} className="border border-cyan-950 bg-cyan-950/10 px-3 py-2 text-xs rounded text-cyan-500">
                ℹ [INFO] {inf}
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto border-t border-cyan-950 p-4 flex flex-col gap-2">
          {draft.promotedId && (
            <div className="text-[10px] text-emerald-400 bg-emerald-950/15 border border-emerald-900/60 p-2 text-center rounded">
              ✓ PROMOTED CAMPAIGN STAGE
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveBlueprintClick}
              className="flex-1 py-1.5 font-mono text-xs border border-cyan-700 bg-cyan-950/20 text-cyan-450 hover:text-cyan-200 hover:bg-cyan-900/40 uppercase tracking-wider transition-all font-bold cursor-pointer"
              title="Save current blueprint configuration immediately"
            >
              💾 Save Draft
            </button>
            
            <button
              onClick={() => {
                setPromoTitle(profile.name || draft.name || '');
                setPromoSubtitle(profile.subtitle || 'DEVIANT SECTOR');
                setShowPromoteModal(true);
              }}
              className="flex-1 py-1.5 font-mono text-xs border border-amber-700 bg-amber-950/20 text-amber-450 hover:text-amber-200 hover:bg-amber-900/40 uppercase tracking-wider transition-all font-bold cursor-pointer"
              title="Register this stage as a fully playable level in the campaign lineup"
            >
              👑 Promote
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 font-mono text-xs border border-cyan-950 hover:border-cyan-800 text-cyan-600 hover:text-cyan-400 uppercase tracking-widest transition-colors cursor-pointer"
          >
            Close Lab
          </button>
        </div>

      </div>

      {/* SUCCESS TOAST ALERTS */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0c252a]/95 border border-cyan-400 text-cyan-300 px-6 py-3 rounded font-mono text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-3 animate-pulse">
          <span className="tracking-wide">{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-cyan-500 hover:text-cyan-300 ml-2 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* DYNAMIC ATMOSPHERIC BACKDROP DESIGNER */}
      {showBackdropDesigner && (
        <BackdropDesigner
          initialSettings={profile.backdropSettings}
          initialSkyPalette={profile.skyPalette || 'space_black'}
          initialBackdropTheme={profile.backdropTheme || 'deep_stars'}
          initialWeatherEffect={profile.weatherEffect || 'none'}
          onClose={() => setShowBackdropDesigner(false)}
          onSave={({ backdropTheme, skyPalette, weatherEffect, backdropSettings }) => {
            setProfile({
              ...profile,
              backdropTheme,
              skyPalette,
              weatherEffect,
              backdropSettings,
            });
            setShowBackdropDesigner(false);
            setToastMessage('ATMOSPHERIC COSMIC THEME LOCKED SUCCESSFULLY!');
          }}
        />
      )}

      {/* CAMPAIGN PROMOTION DIALOG */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handlePromoteSubmit}
            className="w-full max-w-md bg-[#04040a] border border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.25)] p-6 rounded flex flex-col gap-4 font-mono select-none"
          >
            <div className="flex items-center justify-between border-b border-cyan-950 pb-2.5">
              <h3 className="text-amber-400 font-bold text-sm uppercase flex items-center gap-1.5 m-0 p-0">
                👑 Campaign Promotion Registry
              </h3>
              <button 
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="text-cyan-600 hover:text-cyan-400 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-cyan-600 uppercase tracking-wider leading-relaxed my-0 text-left">
              Promoting registers this blueprint as a fully playable stage inside the local Custom Campaign. Adjust titles and settings below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-600 uppercase font-bold">Stage Title</label>
                <input 
                  type="text" 
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  maxLength={15}
                  required
                  className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-xs uppercase"
                  placeholder="E.G., DEVIANT ORBIT"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-600 uppercase font-bold">Stage Subtitle</label>
                <input 
                  type="text" 
                  value={promoSubtitle}
                  onChange={(e) => setPromoSubtitle(e.target.value)}
                  maxLength={32}
                  className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-xs uppercase"
                  placeholder="E.G., COBALT FLIGHTLINE"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-600 uppercase font-bold">Order (Position)</label>
                <input 
                  type="number" 
                  min={1} 
                  value={promoOrder}
                  onChange={(e) => setPromoOrder(Math.max(1, Number(e.target.value)))}
                  className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-600 uppercase font-bold">Difficulty (1-10)</label>
                <input 
                  type="number" 
                  min={1} 
                  max={10} 
                  value={promoDifficulty}
                  onChange={(e) => setPromoDifficulty(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-600 uppercase font-bold">Tags (Comma Sep)</label>
                <input 
                  type="text" 
                  value={promoTags.join(', ')}
                  onChange={(e) => setPromoTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-xs"
                />
              </div>
            </div>

            {promoError && (
              <div className="text-xs text-red-450 border border-red-950 bg-red-950/20 px-3 py-2 text-left">
                ⚠ {promoError}
              </div>
            )}

            <div className="flex items-center gap-2 justify-end mt-2 pt-2 border-t border-cyan-950">
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 text-xs border border-cyan-900 hover:border-cyan-700 text-cyan-500 uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 border border-amber-605 text-black uppercase transition-colors cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              >
                {draft.promotedId ? 'Update Promotion' : 'Promote Stage 👑'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
