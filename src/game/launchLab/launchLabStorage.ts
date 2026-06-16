import { LaunchLabDraft, PromotedJetpacStage, StageTestSummary } from '../LaunchLabTypes';

// Local storage keys
const DRAFTS_KEY = 'neonJetpac.launchLab.drafts.v1';
const PROMOTED_KEY = 'neonJetpac.handcrafted.promoted.v1';
const PROGRESS_KEY = 'neonJetpac.handcrafted.progress.v1';
const EDITOR_SETTINGS_KEY = 'neonJetpac.launchLab.editorSettings.v1';

// Safe wrapper for JSON parse
function safeParse<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage, resetting:`, err);
    return defaultValue;
  }
}

// Safely write to storage
function safeWrite(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export const launchLabStorage = {
  // DRAFTS
  getDrafts(): LaunchLabDraft[] {
    return safeParse<LaunchLabDraft[]>(DRAFTS_KEY, []);
  },
  
  saveDraft(draft: LaunchLabDraft) {
    const drafts = this.getDrafts();
    const idx = drafts.findIndex(d => d.id === draft.id);
    draft.updatedAt = new Date().toISOString();
    
    if (idx >= 0) {
      drafts[idx] = draft;
    } else {
      drafts.push(draft);
    }
    safeWrite(DRAFTS_KEY, drafts);
  },
  
  deleteDraft(id: string) {
    const drafts = this.getDrafts();
    const filtered = drafts.filter(d => d.id !== id);
    safeWrite(DRAFTS_KEY, filtered);
  },
  
  // PROMOTED STAGES
  getPromotedStages(): PromotedJetpacStage[] {
    return safeParse<PromotedJetpacStage[]>(PROMOTED_KEY, []);
  },
  
  savePromotedStage(stage: PromotedJetpacStage) {
    const promoted = this.getPromotedStages();
    const idx = promoted.findIndex(p => p.promotedId === stage.promotedId);
    stage.updatedAt = new Date().toISOString();
    
    if (idx >= 0) {
      promoted[idx] = stage;
    } else {
      promoted.push(stage);
    }
    // Re-index/sort by order
    promoted.sort((a, b) => a.order - b.order);
    safeWrite(PROMOTED_KEY, promoted);
  },
  
  deletePromotedStage(promotedId: string) {
    const promoted = this.getPromotedStages();
    const filtered = promoted.filter(p => p.promotedId !== promotedId);
    safeWrite(PROMOTED_KEY, filtered);
    
    // Also un-promote associated draft
    const drafts = this.getDrafts();
    const updatedDrafts = drafts.map(d => {
      if (d.promotedId === promotedId) {
        return { ...d, promotedId: undefined, lastPromotedAt: undefined };
      }
      return d;
    });
    safeWrite(DRAFTS_KEY, updatedDrafts);
  },

  // HANDCRAFTED PROGRESS
  getProgress(): Record<string, any> {
    return safeParse<Record<string, any>>(PROGRESS_KEY, {});
  },
  
  saveStageProgress(stageId: string, summary: StageTestSummary) {
    const progress = this.getProgress();
    const current = progress[stageId] || {
      attempts: 0,
      completed: false,
      bestScore: 0,
      bestTime: Infinity,
      bestFuelDelivered: 0,
    };
    
    current.attempts += 1;
    if (summary.result === 'launched') {
      current.completed = true;
    }
    
    current.bestScore = Math.max(current.bestScore, summary.score);
    current.bestFuelDelivered = Math.max(current.bestFuelDelivered, summary.fuelDelivered);
    
    if (summary.result === 'launched' && summary.timeSurvived > 0) {
      current.bestTime = Math.min(current.bestTime, summary.timeSurvived);
    }
    
    current.lastPlayedAt = new Date().toISOString();
    progress[stageId] = current;
    safeWrite(PROGRESS_KEY, progress);
  },

  // EDITOR SETTINGS
  getEditorSettings(): Record<string, any> {
    return safeParse<Record<string, any>>(EDITOR_SETTINGS_KEY, {
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      showLabels: true,
      showSpawnZones: true,
      showValidation: true,
      showClearance: true,
    });
  },
  
  saveEditorSettings(settings: Record<string, any>) {
    safeWrite(EDITOR_SETTINGS_KEY, settings);
  }
};
