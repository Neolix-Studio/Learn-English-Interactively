import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { useUser } from '../context/UserContext';
import { getCurriculum, type CurriculumNode } from '../utils/roadmapLoader';
import { ModuleBanner } from './ModuleBanner';
import { GrammarModal } from './modals/GrammarModal';
import { TreasureChest } from './icons/TreasureChest';
import '../assets/css/roadmap.css';

interface RoadmapProps {
  onNodeClick?: (nodeData: any) => void;
}

type NodeStatus = 'locked' | 'current' | 'completed';

export const Roadmap: React.FC<RoadmapProps> = ({ onNodeClick }) => {
  const { activeLevel, data: userProgress, updateProgress } = useUser();
  const { t } = useTranslation();
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [activeGrammarModule, setActiveGrammarModule] = useState<string | null>(null);
  const [openingChestId, setOpeningChestId] = useState<string | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const curriculum = useMemo(() => getCurriculum(), []);

  if (activeLevel === 'A2' || activeLevel === 'B1' || activeLevel === 'B2') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', minHeight: '50vh' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem', animation: 'pulse 2s infinite' }}>🚧</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text-main)' }}>Hamarosan érkezik!</h2>
        <p style={{ fontSize: '1.1rem', maxWidth: '450px', lineHeight: 1.6 }}>
          A(z) <strong>{activeLevel}</strong> szintű tananyag és gyakorlatok jelenleg fejlesztés alatt állnak. Kérjük, nézz vissza később!
        </p>
      </div>
    );
  }

  const levelData = curriculum[activeLevel];
  if (!levelData) return null;

  const modules = levelData.modules;
  const nodeHeight = 80;
  const gap = 48;
  const stepY = nodeHeight + gap;
  const initialY = nodeHeight / 2;
  const centerX = 200;
  const isPremium = userProgress.subscription_tier === 'premium' || userProgress.subscription_tier === 'lifetime';

  const handleChestClick = (node: any, status: string, totalNodes: number) => {
    if (status !== 'current' || openingChestId === node.id) return;

    setOpeningChestId(node.id);

    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FDE047', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6']
      });

      let xpReward = 50;
      let energyReward = 0;
      let bonesReward = 0;

      if (totalNodes >= 6) {
          energyReward = 1;
          bonesReward = 25;
      }

      const newScores = { ...userProgress.scores };
      if (!newScores.node_state) newScores.node_state = {};
      newScores.node_state[node.id] = { completedLessons: ['chest_opened'] };
      newScores.bones = (newScores.bones || 0) + bonesReward;

      updateProgress({
          points: (userProgress.points || 0) + xpReward,
          energy: Math.min((userProgress.energy || 0) + energyReward, 5),
          scores: newScores
      });

      setTimeout(() => {
        setOpeningChestId(null);
      }, 1000);
    }, 600);
  };

  const isNodeFinished = (nodeId: string, totalLessons: number) => {
    if (userProgress.completed?.[activeLevel]?.includes(nodeId)) return true;
    const count = userProgress.scores?.node_state?.[nodeId]?.completedLessons?.length || 0;
    return count > 0 && count >= totalLessons;
  };

  const getCompletedCount = (nodeId: string): number => userProgress.scores?.node_state?.[nodeId]?.completedLessons?.length || 0;

  // Locks are hard (Q12, #369): in path order every finished node is completed, the first unfinished
  // node is the only current one, and every unfinished node after it is locked, whatever progress it has.
  const statusById: Record<string, NodeStatus> = {};
  let currentNode: CurriculumNode | null = null;
  for (const mod of modules) {
    for (const node of mod.nodes) {
      if (isNodeFinished(node.id, node.totalLessons || 1)) statusById[node.id] = 'completed';
      else if (!currentNode) {
        statusById[node.id] = 'current';
        currentNode = node;
      } else statusById[node.id] = 'locked';
    }
  }

  const toggleTooltip = (nodeId: string) => {
    setActiveTooltipId(activeTooltipId === nodeId ? null : nodeId);
  };

  const closeTooltipOnEscape = (event: React.KeyboardEvent, nodeId: string) => {
    if (event.key !== 'Escape' || activeTooltipId !== nodeId) return;
    setActiveTooltipId(null);
    nodeRefs.current[nodeId]?.focus();
  };

  const goToCurrentNode = () => {
    if (!currentNode) return;
    const target = nodeRefs.current[currentNode.id];
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
    setActiveTooltipId(currentNode.type === 'chest' ? null : currentNode.id);
  };

  const startNode = (node: CurriculumNode) => {
    // A locked node never starts a lesson or spends energy.
    if (statusById[node.id] === 'locked' || !onNodeClick) return;
    setActiveTooltipId(null);
    onNodeClick(node.originalData);
  };

  const renderTooltip = (node: CurriculumNode, status: NodeStatus, title: string, placeBelow: boolean) => {
    const completedCount = getCompletedCount(node.id);
    const totalLessons = node.totalLessons || 0;
    const startLabel = completedCount > 0 ? t('roadmap.continue') : t('roadmap.start');
    const costLabel = t('roadmap.energy_cost', { amount: 1 });

    let subtitle: React.ReactNode = null;
    if (status === 'locked') subtitle = t('roadmap.locked');
    else if (status === 'completed') subtitle = t('roadmap.completed');
    else if (totalLessons > 0) subtitle = t('roadmap.lesson_progress', { current: Math.min(completedCount + 1, totalLessons), total: totalLessons });

    return (
      <div id={`node-tooltip-${node.id}`} className={`node-tooltip tooltip-${status} ${placeBelow ? 'tooltip-bottom' : ''}`}>
        <div className="tooltip-header">
          <div className="tooltip-title">{title}</div>
          {subtitle && <div className="tooltip-subtitle">{subtitle}</div>}
        </div>
        {status === 'locked' && (
          <>
            <p className="tooltip-reason">
              {currentNode?.type === 'chest'
                ? t('roadmap.open_chest_first')
                : <>{t('roadmap.finish_first')} <strong>{currentNode?.title}</strong></>}
            </p>
            <button type="button" className="tooltip-goto-btn" onClick={goToCurrentNode}>
              {t('roadmap.go_there')}
            </button>
          </>
        )}
        {status === 'current' && (
          <button type="button" className="tooltip-start-btn" onClick={() => startNode(node)}>
            {startLabel}
          </button>
        )}
        {status === 'completed' && (
          <button
            type="button"
            className="tooltip-start-btn"
            aria-label={isPremium ? undefined : `${t('roadmap.practice_again')}, ${costLabel}`}
            onClick={() => startNode(node)}
          >
            <span>{t('roadmap.practice_again')}</span>
            {!isPremium && (
              <span className="tooltip-cost" aria-hidden="true">
                <img src="/assets/images/energy.svg" alt="" width={18} height={18} />
                1
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="roadmap-container">
      {modules.map((mod, moduleIndex) => {
        const pathSegments: { d: string, isCompleted: boolean }[] = [];
        const moduleNodes = mod.nodes;

        moduleNodes.forEach((_, index) => {
          if (index === 0) return;

          const cycle = index % 4;
          let offsetX = 0;
          if (cycle === 1) offsetX = 40;
          if (cycle === 3) offsetX = -40;
          const x = centerX + offsetX;
          const y = initialY + (index * stepY);

          const prevCycle = (index - 1) % 4;
          let prevOffsetX = 0;
          if (prevCycle === 1) prevOffsetX = 40;
          if (prevCycle === 3) prevOffsetX = -40;
          const prevX = centerX + prevOffsetX;
          const prevY = initialY + ((index - 1) * stepY);

          const cp1y = prevY + (stepY / 2);
          const cp2y = y - (stepY / 2);

          const dPath = `M ${prevX} ${prevY} C ${prevX} ${cp1y}, ${x} ${cp2y}, ${x} ${y}`;

          const prevNode = moduleNodes[index - 1];
          const isPrevCompleted = isNodeFinished(prevNode.id, prevNode.totalLessons || 1);

          pathSegments.push({
            d: dPath,
            isCompleted: isPrevCompleted || (moduleIndex === 0 && index === 1)
          });
        });

        const totalHeight = moduleNodes.length * stepY - gap;

        return (
          <React.Fragment key={mod.id}>
            <ModuleBanner module={mod} onOpenGrammar={setActiveGrammarModule} />

            {activeGrammarModule === mod.id && (
              <div style={{ width: '90%', margin: '0 auto 2rem auto', zIndex: 10, position: 'relative' }}>
                <GrammarModal
                  moduleId={mod.id}
                  onClose={() => setActiveGrammarModule(null)}
                  isInline={true}
                />
              </div>
            )}

            <div className="roadmap-nodes-wrapper">

              <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '400px', height: `${totalHeight}px`, zIndex: 1, pointerEvents: 'none' }}>
                <svg viewBox={`0 0 400 ${totalHeight}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  {pathSegments.map((seg, i) => (
                    <path key={i} d={seg.d} stroke={seg.isCompleted ? "#F59E0B" : "#E5E7EB"} strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              </div>

              {moduleNodes.map((node, index) => {
                const cycle = index % 4;
                let offsetClass = 'node-center';
                if (cycle === 1) offsetClass = 'node-right';
                if (cycle === 3) offsetClass = 'node-left';

                const status = statusById[node.id];
                const isTooltipOpen = activeTooltipId === node.id;
                const completedCount = getCompletedCount(node.id);
                const totalLessons = node.totalLessons || 1;
                const progressFraction = status === 'completed' ? 1 : Math.min(completedCount / totalLessons, 1);

                const isBelowFold = moduleIndex > 0 || index >= 3;

                if (node.type === 'chest') {
                  const isOpening = openingChestId === node.id;
                  const wrapperClass = status === 'current' && !isOpening ? 'ready-to-open' : (isOpening ? 'opening' : '');
                  const chestLabel = status === 'locked' ? t('roadmap.locked') : status === 'completed' ? t('roadmap.chest_opened') : t('roadmap.open_chest');

                  return (
                    <div
                      key={node.id}
                      className={`roadmap-node-container ${offsetClass}`}
                      style={{ position: 'relative', zIndex: isTooltipOpen ? 50 : 2 }}
                      onKeyDown={(event) => closeTooltipOnEscape(event, node.id)}
                    >
                      {status === 'current' && !isOpening && activeTooltipId === null && (
                        <div className="node-chat-bubble" style={{ zIndex: 10 }}>{t('roadmap.open_chest')}</div>
                      )}
                      <button
                        type="button"
                        ref={(element) => { nodeRefs.current[node.id] = element; }}
                        className={`treasure-chest-wrapper ${wrapperClass} ${isTooltipOpen ? 'active-tooltip' : ''}`}
                        aria-label={`${t('roadmap.chest')} – ${chestLabel}`}
                        aria-disabled={status === 'completed' || undefined}
                        aria-expanded={status === 'locked' ? isTooltipOpen : undefined}
                        aria-controls={status === 'locked' ? `node-tooltip-${node.id}` : undefined}
                        onClick={() => {
                          if (status === 'locked') toggleTooltip(node.id);
                          else handleChestClick(node, status, moduleNodes.length);
                        }}
                        style={{ background: 'none', boxShadow: 'none' }}
                      >
                        <span style={{ display: 'block', filter: status === 'locked' ? 'grayscale(100%)' : 'none', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
                          <TreasureChest isOpen={status === 'completed' || isOpening} loading={isBelowFold ? "lazy" : undefined} />
                        </span>
                      </button>
                      {status === 'locked' && renderTooltip(node, status, t('roadmap.chest'), index === 0)}
                    </div>
                  );
                }

                let defaultIcon: React.ReactNode = <img src="/single-star.svg" alt="" width={56} height={56} loading={isBelowFold ? "lazy" : undefined} style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />;
                if (userProgress?.scores?.active_theme === 'halloween') {
                    defaultIcon = (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="currentColor" aria-hidden="true">
                           <path d="M12 2c-1.5 0-3 1-3 2s1 2 1 2c-2.5.5-5 2.5-5 6s2 8 7 8 7-4 7-8-2.5-5.5-5-6c0 0 1-1 1-2s-1.5-2-3-2zm-3 9l2 2-2 2v-4zm6 0v4l-2-2 2-2zm-3 3l2 2h-4l2-2z" />
                        </svg>
                    );
                }

                let icon: React.ReactNode = defaultIcon;
                if (node.type === 'reward') icon = '🎁';
                else if (node.id === 'Boss' || node.title.includes('Boss')) icon = '👹';

                const bubbleLabel = completedCount > 0 ? t('roadmap.continue') : t('roadmap.start');
                const statusLabel = status === 'locked' ? t('roadmap.locked') : status === 'completed' ? t('roadmap.completed') : bubbleLabel;

                return (
                  <div
                    key={node.id}
                    className={`roadmap-node-container ${offsetClass}`}
                    style={{ position: 'relative', zIndex: isTooltipOpen ? 50 : 2 }}
                    onKeyDown={(event) => closeTooltipOnEscape(event, node.id)}
                  >
                    <button
                      type="button"
                      ref={(element) => { nodeRefs.current[node.id] = element; }}
                      className={`roadmap-node ${status} ${isTooltipOpen ? 'active-tooltip' : ''}`}
                      style={{ '--node-progress': progressFraction } as React.CSSProperties}
                      title={node.title}
                      aria-label={`${node.title} – ${statusLabel}`}
                      aria-expanded={isTooltipOpen}
                      aria-controls={`node-tooltip-${node.id}`}
                      onClick={() => toggleTooltip(node.id)}
                    >
                      {status === 'current' && activeTooltipId === null && (
                        <span className="node-chat-bubble">{bubbleLabel}</span>
                      )}

                      <span className="node-icon-wrapper" style={{ position: 'relative', zIndex: 2, background: 'none', boxShadow: 'none' }}>
                        <img src="/new-icon.svg" alt="" width={80} height={80} loading={isBelowFold ? "lazy" : undefined} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', zIndex: -1, filter: status === 'locked' ? 'grayscale(100%) opacity(0.5)' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
                        <span className="node-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>{icon}</span>
                      </span>
                    </button>

                    {renderTooltip(node, status, node.title, index === 0)}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}

    </div>
  );
};
