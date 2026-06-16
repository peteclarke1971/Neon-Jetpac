import { BUILT_IN_HANDCRAFTED_STAGES } from '../HandcraftedStages';
import { launchLabStorage } from './launchLabStorage';
import { PlayableHandcraftedJetpacStage, PromotedJetpacStage, LaunchLabDraft, JetpacStageProfileV2 } from '../LaunchLabTypes';
import { normalizeStageProfile } from './launchLabDataHelpers';

export const handcraftedStageRegistry = {
  // Get all built-in + local promoted stages sorted by order
  getMergedHandcraftedStages(): PlayableHandcraftedJetpacStage[] {
    const localPromoted = launchLabStorage.getPromotedStages();
    
    // Convert built-in stages to PlayableHandcraftedJetpacStage if needed
    const builtInPlayable: PlayableHandcraftedJetpacStage[] = BUILT_IN_HANDCRAFTED_STAGES.map(b => ({
      promotedId: b.id,
      title: b.title,
      subtitle: b.subtitle,
      campaignName: b.campaignName,
      order: b.order,
      difficulty: b.difficulty,
      tags: b.tags,
      promotedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: b.profile,
      localOnly: false as any, // builtIn is not localOnly
    }));

    const merged = [...builtInPlayable, ...localPromoted];
    
    // Sort primarily by order, then title
    return merged.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });
  },

  // Promote a draft to handcrafted local campaign
  promoteDraft(draft: LaunchLabDraft, fields: {
    title: string;
    subtitle?: string;
    campaignName?: string;
    description?: string;
    order: number;
    difficulty: number;
    tags: string[];
    notes?: string;
  }): PromotedJetpacStage {
    const existingPromotedId = draft.promotedId || `promoted-${Math.floor(Math.random() * 1000000)}`;
    
    const profileCopy = normalizeStageProfile(draft.profile);
    
    // Ensure stage ID in profile matches some range or stays consistent
    profileCopy.name = fields.title.substring(0, 15).toUpperCase();
    profileCopy.subtitle = (fields.subtitle || 'HANDCRAFTED').toUpperCase();
    
    const promotedStage: PromotedJetpacStage = {
      promotedId: existingPromotedId,
      draftId: draft.id,
      title: fields.title,
      subtitle: fields.subtitle,
      campaignName: fields.campaignName || 'LOCAL CAMPAIGN',
      description: fields.description,
      order: fields.order,
      difficulty: fields.difficulty,
      tags: fields.tags,
      notes: fields.notes,
      promotedAt: draft.lastPromotedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localOnly: true,
      profile: profileCopy
    };
    
    // Save in storage
    launchLabStorage.savePromotedStage(promotedStage);
    
    // Update draft reference
    const updatedDraft: LaunchLabDraft = {
      ...draft,
      promotedId: existingPromotedId,
      lastPromotedAt: new Date().toISOString(),
    };
    launchLabStorage.saveDraft(updatedDraft);
    
    return promotedStage;
  },

  // Unpromote
  unpromoteStage(promotedId: string) {
    launchLabStorage.deletePromotedStage(promotedId);
  },

  // Export local promoted as JSON pack
  exportAllPromotedToJSON(): string {
    const stages = launchLabStorage.getPromotedStages();
    const pack = {
      version: 1,
      type: "neon-jetpac-promoted-stages",
      exportedAt: new Date().toISOString(),
      stages: stages.map(s => ({
        promotedId: s.promotedId,
        title: s.title,
        subtitle: s.subtitle,
        campaignName: s.campaignName,
        description: s.description,
        order: s.order,
        difficulty: s.difficulty,
        tags: s.tags,
        notes: s.notes,
        profile: s.profile
      }))
    };
    return JSON.stringify(pack, null, 2);
  },

  // Export local promoted as TypeScript campaign code
  exportAllPromotedToTypeScript(): string {
    const stages = launchLabStorage.getPromotedStages();
    
    let entriesCode = '';
    
    stages.forEach((s, idx) => {
      const escapedTitle = s.title.replace(/"/g, '\\"');
      const escapedSubtitle = (s.subtitle || '').replace(/"/g, '\\"');
      const escapedCampaign = (s.campaignName || 'HANDCRAFTED').replace(/"/g, '\\"');
      
      entriesCode += `  {\n`;
      entriesCode += `    id: "${s.promotedId}",\n`;
      entriesCode += `    title: "${escapedTitle}",\n`;
      entriesCode += `    subtitle: "${escapedSubtitle}",\n`;
      entriesCode += `    campaignName: "${escapedCampaign}",\n`;
      entriesCode += `    order: ${s.order},\n`;
      entriesCode += `    difficulty: ${s.difficulty},\n`;
      entriesCode += `    tags: ${JSON.stringify(s.tags)},\n`;
      entriesCode += `    builtIn: true,\n`;
      entriesCode += `    profile: ${JSON.stringify(s.profile, null, 6).split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n')}\n`;
      entriesCode += `  }${idx < stages.length - 1 ? ',' : ''}\n`;
    });

    const code = `import { BuiltInHandcraftedJetpacStage } from './LaunchLabTypes';

export const BUILT_IN_HANDCRAFTED_STAGES: BuiltInHandcraftedJetpacStage[] = [
${entriesCode}];
`;
    return code;
  },

  // Import JSON pack
  importPastedJSONPack(rawJson: string, importAs: 'drafts' | 'promoted' = 'drafts'): { importedCount: number; error?: string } {
    try {
      const data = JSON.parse(rawJson);
      if (!data || data.type !== 'neon-jetpac-promoted-stages') {
        return { importedCount: 0, error: 'Invalid file format. Must be neon-jetpac-promoted-stages' };
      }
      
      const stages = data.stages || [];
      if (!Array.isArray(stages)) {
        return { importedCount: 0, error: 'Imported stages must be an array' };
      }
      
      let importedCount = 0;
      
      if (importAs === 'drafts') {
        const existingDrafts = launchLabStorage.getDrafts();
        stages.forEach((s: any) => {
          const draftId = `draft-${Math.floor(Math.random() * 1000000)}`;
          const profile = normalizeStageProfile(s.profile);
          const draft: LaunchLabDraft = {
            id: draftId,
            name: s.title || 'Imported Stage',
            source: 'imported',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: s.notes || 'Imported ' + new Date().toLocaleDateString(),
            profile
          };
          launchLabStorage.saveDraft(draft);
          importedCount++;
        });
      } else {
        stages.forEach((s: any) => {
          const promotedStage: PromotedJetpacStage = {
            promotedId: s.promotedId || `promoted-${Math.floor(Math.random() * 1000000)}`,
            title: s.title || 'Imported Title',
            subtitle: s.subtitle || 'Imported Subtitle',
            campaignName: s.campaignName || 'Imported Campaign',
            description: s.description || '',
            order: typeof s.order === 'number' ? s.order : 1,
            difficulty: typeof s.difficulty === 'number' ? s.difficulty : 5,
            tags: Array.isArray(s.tags) ? s.tags : [],
            notes: s.notes || '',
            promotedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            localOnly: true,
            profile: normalizeStageProfile(s.profile)
          };
          launchLabStorage.savePromotedStage(promotedStage);
          importedCount++;
        });
      }
      
      return { importedCount };
    } catch (err: any) {
      return { importedCount: 0, error: `JSON Parse error: ${err.message || err}` };
    }
  }
};
