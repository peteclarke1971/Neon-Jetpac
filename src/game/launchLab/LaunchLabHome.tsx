import React, { useState, useEffect } from 'react';
import { LAUNCH_LAB_TEMPLATES } from './launchLabTemplates';
import { LaunchLabDraft, PromotedJetpacStage } from '../LaunchLabTypes';
import { launchLabStorage } from './launchLabStorage';
import { handcraftedStageRegistry } from './handcraftedStageRegistry';
import { validateJetpacStage } from './launchLabValidation';
import { GAME_WIDTH, GAME_HEIGHT } from '../Constants';

interface LaunchLabHomeProps {
  onBack: () => void;
  onEditDraft: (draft: LaunchLabDraft) => void;
  onPlayCampaign: (stages: any[], startIndex: number) => void;
}

export default function LaunchLabHome({ onBack, onEditDraft, onPlayCampaign }: LaunchLabHomeProps) {
  const [drafts, setDrafts] = useState<LaunchLabDraft[]>([]);
  const [promoted, setPromoted] = useState<PromotedJetpacStage[]>([]);
  const [activeTab, setActiveTab] = useState<'drafts' | 'campaign' | 'exchange'>('drafts');
  
  // Promotion fields
  const [promoDraft, setPromoDraft] = useState<LaunchLabDraft | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSubtitle, setPromoSubtitle] = useState('LOCAL SECTOR');
  const [promoOrder, setPromoOrder] = useState(1);
  const [promoDifficulty, setPromoDifficulty] = useState(5);
  const [promoTags, setPromoTags] = useState<string[]>(['Neon']);
  const [promoError, setPromoError] = useState('');

  // Import / Export
  const [exchangeBox, setExchangeBox] = useState('');
  const [exchangeMsg, setExchangeMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setDrafts(launchLabStorage.getDrafts());
    setPromoted(launchLabStorage.getPromotedStages());
  };

  const handleCreateDraft = (templateId: string) => {
    const template = LAUNCH_LAB_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newId = `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newDraft: LaunchLabDraft = {
      id: newId,
      name: `${template.name} Draft`,
      source: templateId === 'template-blank' ? 'blank' : 'template',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Created from ${template.name}`,
      profile: JSON.parse(JSON.stringify(template.profile))
    };

    newDraft.profile.id = Math.floor(Math.random() * 1000000);
    launchLabStorage.saveDraft(newDraft);
    onEditDraft(newDraft);
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to scrap this blueprint draft? This cannot be undone.')) {
      launchLabStorage.deleteDraft(id);
      loadData();
    }
  };

  const handleUnpromote = (promotedId: string) => {
    if (confirm('Remove this stage from the local campaign pipeline? (Don\'t worry, the editor draft is preserved)')) {
      handcraftedStageRegistry.unpromoteStage(promotedId);
      loadData();
    }
  };

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoDraft) return;

    if (!promoTitle.trim()) {
      setPromoError('Stage Title is required');
      return;
    }

    try {
      handcraftedStageRegistry.promoteDraft(promoDraft, {
        title: promoTitle.toUpperCase(),
        subtitle: promoSubtitle.toUpperCase(),
        campaignName: 'LOCAL DESIGN CAMPAIGN',
        order: Number(promoOrder),
        difficulty: Number(promoDifficulty),
        tags: promoTags,
        notes: `Promoted draft ${promoDraft.name}`
      });
      loadData();
      setPromoDraft(null);
      setActiveTab('campaign');
    } catch (err: any) {
      setPromoError(`Promotion failed: ${err.message || err}`);
    }
  };

  const handleExportJSON = () => {
    try {
      const code = handcraftedStageRegistry.exportAllPromotedToJSON();
      setExchangeBox(code);
      setExchangeMsg({ type: 'success', text: 'JSON Campaign Pack copied below! Select All and Copy.' });
    } catch (err: any) {
      setExchangeMsg({ type: 'error', text: `Export failed: ${err.message || err}` });
    }
  };

  const handleExportTS = () => {
    try {
      const code = handcraftedStageRegistry.exportAllPromotedToTypeScript();
      setExchangeBox(code);
      setExchangeMsg({ type: 'success', text: 'TypeScript campaign source code generated! Use this file inside HandcraftedStages.ts.' });
    } catch (err: any) {
      setExchangeMsg({ type: 'error', text: `Export failed: ${err.message || err}` });
    }
  };

  const handleImport = (importAs: 'drafts' | 'promoted') => {
    if (!exchangeBox.trim()) {
      setExchangeMsg({ type: 'error', text: 'Paste your Campaign JSON in the box first.' });
      return;
    }

    const res = handcraftedStageRegistry.importPastedJSONPack(exchangeBox, importAs);
    if (res.error) {
      setExchangeMsg({ type: 'error', text: res.error });
    } else {
      setExchangeMsg({ type: 'success', text: `Successfully imported ${res.importedCount} level(s) as ${importAs}!` });
      setExchangeBox('');
      loadData();
    }
  };

  const handleMoveOrder = (ptIdx: number, direction: 'up' | 'down') => {
    const list = [...promoted];
    if (direction === 'up' && ptIdx > 0) {
      const temp = list[ptIdx].order;
      list[ptIdx].order = list[ptIdx - 1].order;
      list[ptIdx - 1].order = temp;
    } else if (direction === 'down' && ptIdx < list.length - 1) {
      const temp = list[ptIdx].order;
      list[ptIdx].order = list[ptIdx + 1].order;
      list[ptIdx + 1].order = temp;
    }
    
    // Sort and re-save
    list.sort((a,b) => a.order - b.order);
    list.forEach((item, index) => {
      item.order = index + 1;
      launchLabStorage.savePromotedStage(item);
    });
    setPromoted(list);
  };

  const handlePlayPromoted = (ptIdx: number) => {
    const mergedList = handcraftedStageRegistry.getMergedHandcraftedStages();
    // find index in merged list
    const targetPromotedId = promoted[ptIdx].promotedId;
    const mergeIdx = mergedList.findIndex(p => p.promotedId === targetPromotedId);
    if (mergeIdx >= 0) {
      onPlayCampaign(mergedList, mergeIdx);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#020205] text-cyan-100 flex flex-col z-20 overflow-y-auto font-sans">
      {/* Header Banner */}
      <div className="border-b border-cyan-950/80 bg-black/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-3xl font-bold tracking-tight italic text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            LAUNCH LAB
          </h2>
          <p className="text-xs text-cyan-700 tracking-wider uppercase font-mono mt-0.5">
            Level Assembly, Validation & Pipeline Operations
          </p>
        </div>
        <button 
          onClick={onBack}
          className="border border-cyan-800 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-400 font-mono text-sm px-4 py-2 uppercase tracking-wider transition-all"
        >
          &lt; Return to Deck
        </button>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-2">
          <button
            onClick={() => { setActiveTab('drafts'); setPromoDraft(null); }}
            className={`w-full text-left font-mono px-4 py-3 border text-sm transition-all flex justify-between items-center ${
              activeTab === 'drafts' 
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'bg-black/20 border-cyan-950 text-cyan-700 hover:text-cyan-400 hover:border-cyan-900'
            }`}
          >
            <span>Stage Blueprints</span>
            <span className="text-xs px-2 py-0.5 bg-cyan-950 rounded border border-cyan-900">{drafts.length}</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('campaign'); setPromoDraft(null); }}
            className={`w-full text-left font-mono px-4 py-3 border text-sm transition-all flex justify-between items-center ${
              activeTab === 'campaign' 
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'bg-black/20 border-cyan-950 text-cyan-700 hover:text-cyan-400 hover:border-cyan-900'
            }`}
          >
            <span>Local Campaign Pipeline</span>
            <span className="text-xs px-2 py-0.5 bg-cyan-950 rounded border border-cyan-900">{promoted.length}</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('exchange'); setPromoDraft(null); }}
            className={`w-full text-left font-mono px-4 py-3 border text-sm transition-all flex justify-between items-center ${
              activeTab === 'exchange' 
                ? 'bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'bg-black/20 border-cyan-950 text-cyan-700 hover:text-cyan-400 hover:border-cyan-900'
            }`}
          >
            <span>Blueprints Exchange</span>
          </button>

          <div className="mt-8 border border-cyan-950 bg-black/40 p-4 rounded font-mono text-[11px] text-cyan-800 leading-relaxed">
            <div className="text-cyan-500 font-bold uppercase mb-1">Assembly Manual:</div>
            1. Select a Blueprint Starter Template.<br/>
            2. Visually place platform ledges, start point, and custom item/enemy spawn bounds.<br/>
            3. Test it instantly with responsive flight keys.<br/>
            4. Promote to Campaign Pipeline.<br/>
            5. Play through campaign or export JSON keys to share!
          </div>
        </div>

        {/* Primary Workspace Panel */}
        <div className="md:col-span-3 flex flex-col min-h-[460px]">
          
          {/* TAB 1: BLUEPRINT DRAFTS */}
          {activeTab === 'drafts' && !promoDraft && (
            <div className="flex flex-col gap-6">
              {/* Ready Starters Section */}
              <div>
                <h3 className="font-mono text-sm tracking-wider uppercase text-cyan-600 mb-3 font-semibold">
                  Assemble New Level Blueprint
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {LAUNCH_LAB_TEMPLATES.map(tmpl => (
                    <div 
                      key={tmpl.id}
                      onClick={() => handleCreateDraft(tmpl.id)}
                      className="border border-cyan-950 hover:border-cyan-500/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-[#030308]/60 p-4 rounded cursor-pointer transition-all flex flex-col text-left group"
                    >
                      <div className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase tracking-tight">
                        {tmpl.name}
                      </div>
                      <div className="text-xs text-cyan-800 font-mono mt-1 flex-1 leading-relaxed">
                        {tmpl.description}
                      </div>
                      <div className="mt-4 text-[10px] uppercase font-mono text-cyan-600 tracking-wider">
                        + Deploy Assembly &gt;
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Drafts List */}
              <div className="mt-4">
                <h3 className="font-mono text-sm tracking-wider uppercase text-cyan-600 mb-3 font-semibold">
                  Saved Blueprints ({drafts.length})
                </h3>
                {drafts.length === 0 ? (
                  <div className="border border-dashed border-cyan-950 bg-black/20 p-12 text-center text-sm text-cyan-800 font-mono">
                    No active blueprint drafts saved in this shipyard.<br/>Deploy a template from above to establish your first level layout.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {drafts.map(d => {
                      const val = validateJetpacStage(d.profile);
                      return (
                        <div 
                          key={d.id}
                          onClick={() => onEditDraft(d)}
                          className="border border-cyan-950 hover:border-cyan-800 bg-[#030308]/50 p-4 rounded cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-cyan-300 group-hover:text-cyan-400 uppercase tracking-tight">
                                {d.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-900 text-cyan-500 font-mono rounded uppercase">
                                {d.profile.objective}
                              </span>
                              {val.status === 'errors' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-950 border border-red-900 text-red-400 font-mono rounded">
                                  {val.errors.length} ERRORS
                                </span>
                              )}
                              {val.status === 'warnings' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-orange-950 border border-orange-900 text-orange-400 font-mono rounded">
                                  {val.warnings.length} WARNINGS
                                </span>
                              )}
                              {val.status === 'clean' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-950 border border-green-900 text-green-400 font-mono rounded">
                                  STABLE
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-cyan-800 font-mono mt-1">
                              Modified: {new Date(d.updatedAt).toLocaleString()}
                              {d.profile.platformLayout && ` • Platforms: ${d.profile.platformLayout.length}`}
                              {d.promotedId && ' • Promoted Campaign'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromoDraft(d);
                                setPromoTitle(d.name.toUpperCase().replace(/\sDRAFT$/g, ''));
                                setPromoOrder(promoted.length + 1);
                              }}
                              disabled={val.status === 'errors'}
                              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-bold border transition-all ${
                                val.status === 'errors'
                                  ? 'border-cyan-950 text-cyan-900 cursor-not-allowed'
                                  : 'border-cyan-600 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 text-cyan-400'
                              }`}
                            >
                              {d.promotedId ? 'Update Promotion' : 'Promote Stage'}
                            </button>
                            
                            <button
                              onClick={(e) => handleDeleteDraft(d.id, e)}
                              className="px-3 py-1.5 text-xs font-mono border border-cyan-950 hover:border-red-900 hover:bg-red-950/20 text-cyan-800 hover:text-red-400 transition-all uppercase"
                            >
                              Scrap
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Promotion Form Panel */}
          {activeTab === 'drafts' && promoDraft && (
            <form onSubmit={handlePromoteSubmit} className="border border-cyan-800 bg-[#04040a]/80 p-6 rounded flex flex-col gap-4 font-mono select-none">
              <h3 className="text-cyan-400 font-bold text-lg border-b border-cyan-950 pb-2 uppercase text-left">
                Campaign Promotion Registry
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-cyan-600 uppercase">Stage Title</label>
                  <input 
                    type="text" 
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    maxLength={20}
                    className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-sm uppercase"
                    placeholder="E.G., DEVIANT ORBIT"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-cyan-600 uppercase">Stage Subtitle</label>
                  <input 
                    type="text" 
                    value={promoSubtitle}
                    onChange={(e) => setPromoSubtitle(e.target.value)}
                    maxLength={32}
                    className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-sm uppercase"
                    placeholder="E.G., FUEL DRAIN DEFENSIVE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-cyan-600 uppercase">Campaign Progression Order</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={promoOrder}
                    onChange={(e) => setPromoOrder(Math.max(1, Number(e.target.value)))}
                    className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-cyan-600 uppercase">Difficulty Rating (1-10)</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={promoDifficulty}
                    onChange={(e) => setPromoDifficulty(Math.max(1, Math.min(10, Number(e.target.value))))}
                    className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-cyan-600 uppercase">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    value={promoTags.join(', ')}
                    onChange={(e) => setPromoTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    className="bg-black/60 border border-cyan-900 focus:border-cyan-500 text-cyan-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {promoError && (
                <div className="text-sm text-red-500 border border-red-950/50 bg-red-950/20 px-3 py-2 text-left">
                  {promoError}
                </div>
              )}

              <div className="flex items-center gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setPromoDraft(null)}
                  className="px-4 py-2 text-sm border border-cyan-900 hover:border-cyan-700 text-cyan-700 hover:text-cyan-400 uppercase transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-cyan-600 border border-cyan-600 hover:bg-cyan-500 text-black uppercase transition-colors"
                >
                  {promoDraft.promotedId ? 'Update Campaign Stage' : 'Register Promotion'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LOCAL CAMPAIGN PIPELINE */}
          {activeTab === 'campaign' && (
            <div className="flex flex-col gap-4 text-left font-mono">
              <div className="flex items-center justify-between border-b border-cyan-950 pb-2">
                <h3 className="font-mono text-sm tracking-wider uppercase text-cyan-600 font-semibold">
                  Local Live Campaign Pack ({promoted.length} custom, {handcraftedStageRegistry.getMergedHandcraftedStages().filter(st => (st as any).builtIn).length} built-in)
                </h3>
                <div className="text-xs text-cyan-800">
                  Total playable levels: {handcraftedStageRegistry.getMergedHandcraftedStages().length}
                </div>
              </div>

              {promoted.length === 0 ? (
                <div className="border border-dashed border-cyan-950 bg-black/20 p-12 text-center text-sm text-cyan-800">
                  No handcrafted stages have been promoted here yet.<br/>
                  Design levels in the Stage Blueprints tab, validate them, and click "Promote Stage" to build your custom campaign cascade!
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {promoted.map((p, idx) => (
                    <div 
                      key={p.promotedId}
                      className="border border-cyan-950 bg-[#030308]/60 px-4 py-3 rounded flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {/* Order Arrangers */}
                        <div className="flex flex-col gap-1 border-r border-cyan-950 pr-3">
                          <button 
                            type="button" 
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, 'up')}
                            className="text-[10px] h-4 w-4 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-20 text-cyan-400 flex items-center justify-center rounded border border-cyan-900"
                          >
                            ▲
                          </button>
                          <button 
                            type="button" 
                            disabled={idx === promoted.length - 1}
                            onClick={() => handleMoveOrder(idx, 'down')}
                            className="text-[10px] h-4 w-4 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-20 text-cyan-400 flex items-center justify-center rounded border border-cyan-900"
                          >
                            ▼
                          </button>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider">
                            STAGE {idx + 1}
                          </div>
                          <div className="text-base font-bold text-cyan-300 uppercase leading-snug">
                            {p.title}
                          </div>
                          <div className="text-[10px] text-cyan-700">
                            {p.subtitle || 'HANDCRAFTED RUN'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayPromoted(idx)}
                          className="px-3 py-1.5 bg-[#082025] hover:bg-cyan-950 text-cyan-400 border border-cyan-900 hover:border-cyan-400 text-xs uppercase transition-all font-bold"
                        >
                          Test Stage
                        </button>
                        <button
                          onClick={() => handleUnpromote(p.promotedId)}
                          className="px-3 py-1.5 border border-cyan-950 hover:border-cyan-800 text-cyan-800 hover:text-cyan-500 text-xs uppercase transition-colors"
                        >
                          De-List
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BLUEPRINTS EXCHANGE (IMPORT/EXPORT) */}
          {activeTab === 'exchange' && (
            <div className="flex flex-col gap-4 text-left font-mono">
              <h3 className="font-mono text-sm tracking-wider uppercase text-cyan-600 font-semibold border-b border-cyan-950 pb-2">
                Blueprints Exchange and Export Hub
              </h3>
              
              <p className="text-xs text-cyan-800 leading-relaxed mb-1">
                Import others' levels by pasting their JSON blocks here, or generate a JSON campaign pack to share!
                Additionally, generate production-ready TypeScript code directly compatible with the internal HandcraftedStages file.
              </p>

              <textarea
                value={exchangeBox}
                onChange={(e) => setExchangeBox(e.target.value)}
                placeholder="Paste code blocks here, then choose an operation..."
                className="w-full h-48 bg-black/80 border border-cyan-900 focus:border-cyan-500 p-3 text-cyan-300 text-xs font-mono rounded"
              />

              {exchangeMsg.text && (
                <div className={`text-xs border px-3 py-2 rounded ${
                  exchangeMsg.type === 'success' 
                    ? 'border-green-950 bg-green-950/20 text-green-400' 
                    : 'border-red-950 bg-red-950/20 text-red-400'
                }`}>
                  {exchangeMsg.text}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImport('drafts')}
                    className="px-3 py-2 bg-[#0c1f24] hover:bg-cyan-950 text-cyan-400 border border-cyan-900 hover:border-cyan-400 text-xs uppercase font-bold transition-all"
                  >
                    Import as drafts
                  </button>
                  <button
                    onClick={() => handleImport('promoted')}
                    className="px-3 py-2 border border-cyan-800 hover:border-cyan-600 text-cyan-400 text-xs uppercase font-semibold transition-colors"
                  >
                    Direct import to pipeline
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-2 border border-cyan-900 hover:bg-[#0c1f24] hover:border-cyan-805 text-cyan-600 hover:text-cyan-400 text-xs uppercase font-medium transition-colors"
                  >
                    Export Pack JSON
                  </button>
                  <button
                    onClick={handleExportTS}
                    className="px-3 py-2 border border-cyan-900 hover:bg-[#0c1f24] hover:border-cyan-805 text-cyan-600 hover:text-cyan-400 text-xs uppercase font-medium transition-colors"
                  >
                    Compile to TypeScript
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
