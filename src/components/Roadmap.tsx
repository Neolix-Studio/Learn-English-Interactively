import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useUser } from '../context/UserContext';
import { getCurriculum } from '../utils/roadmapLoader';
import { ModuleBanner } from './ModuleBanner';
import { GrammarModal } from './modals/GrammarModal';
import { TreasureChest } from './icons/TreasureChest';
import '../assets/css/roadmap.css';

interface RoadmapProps {
  onNodeClick?: (nodeData: any) => void;
}

export const Roadmap: React.FC<RoadmapProps> = ({ onNodeClick }) => {
  const { activeLevel, data: userProgress, updateProgress } = useUser();
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [activeGrammarModule, setActiveGrammarModule] = useState<string | null>(null);
  const [openingChestId, setOpeningChestId] = useState<string | null>(null);

  // Load the curriculum once
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
  const gap = 48; // 3rem = 48px
  const stepY = nodeHeight + gap; // 128px
  const initialY = nodeHeight / 2; // 40px
  const centerX = 200;

  const handleChestClick = (node: any, status: string, totalNodes: number) => {
    if (status !== 'current' || openingChestId === node.id) return;
    
    setOpeningChestId(node.id);

    // Wait for the shake animation to finish before popping open
    setTimeout(() => {
      // Fire confetti from the middle-bottom of the screen
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FDE047', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6']
      });

      // Calculate rewards
      let xpReward = 50;
      let energyReward = 0;
      let bonesReward = 0;
      
      // If module is hard (e.g. 5 or more learning nodes)
      // The chest node is included in totalNodes, so a module with 5 regular nodes has 6 totalNodes
      if (totalNodes >= 6) {
          energyReward = 1;
          bonesReward = 25;
      }

      // Update progress using existing updateProgress
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

  return (
    <div className="roadmap-container">
      {modules.map((mod, moduleIndex) => {
        // SVG paths for this module
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
            isCompleted: isPrevCompleted || (moduleIndex === 0 && index === 1) // first node unlocked visual test
          });
        });

        // Add 1.5rem bottom margin logic mapped in CSS anyway, but we just need the path to stop at the last node.
        const totalHeight = moduleNodes.length * stepY - gap; // Exactly to the bottom of the last node!

        return (
          <React.Fragment key={mod.id}>
            {/* The Module Banner */}
            <ModuleBanner module={mod} onOpenGrammar={setActiveGrammarModule} />
            
            {/* Inline Grammar Accordion */}
            {activeGrammarModule === mod.id && (
              <div style={{ width: '90%', margin: '0 auto 2rem auto', zIndex: 10, position: 'relative' }}>
                <GrammarModal 
                  moduleId={mod.id} 
                  onClose={() => setActiveGrammarModule(null)} 
                  isInline={true}
                />
              </div>
            )}
            
            {/* The nodes wrapper for this module */}
            <div className="roadmap-nodes-wrapper">
              
              {/* SVG Background for this module only */}
              <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '400px', height: `${totalHeight}px`, zIndex: 1, pointerEvents: 'none' }}>
                <svg viewBox={`0 0 400 ${totalHeight}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  
                  {/* Progress Rings (Lowest layer) */}
                  {moduleNodes.map((node, index) => {
                    const cycle = index % 4;
                    let offsetX = 0;
                    if (cycle === 1) offsetX = 40;
                    if (cycle === 3) offsetX = -40;
                    const cx = centerX + offsetX;
                    const cy = initialY + (index * stepY);
                    
                    const completedCount = userProgress.scores?.node_state?.[node.id]?.completedLessons?.length || 0;
                    const totalLessons = node.totalLessons || 1;
                    let progressFraction = Math.min(completedCount / totalLessons, 1);
                    if (userProgress.scores?.node_state?.[node.id] && completedCount > 0 && completedCount >= totalLessons) {
                      progressFraction = 1;
                    }

                    return (
                      <g key={`ring-${node.id}`}>
                        <circle 
                          cx={cx} cy={cy} r="44" 
                          stroke="#F59E0B" strokeWidth="8" fill="none" 
                          strokeDasharray="276.46" 
                          strokeDashoffset={276.46 - (276.46 * progressFraction)}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.5s', transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
                        />
                      </g>
                    );
                  })}

                  {/* Path Lines (Over rings, under nodes) */}
                  {pathSegments.map((seg, i) => (
                    <path key={i} d={seg.d} stroke={seg.isCompleted ? "#F59E0B" : "#E5E7EB"} strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              </div>

              {/* Render Nodes */}
              {moduleNodes.map((node, index) => {
                const cycle = index % 4;
                let offsetClass = 'node-center';
                if (cycle === 1) offsetClass = 'node-right';
                if (cycle === 3) offsetClass = 'node-left';

                const completedCount = userProgress.scores?.node_state?.[node.id]?.completedLessons?.length || 0;
                const totalLessons = node.totalLessons || 1;
                let progressFraction = Math.min(completedCount / totalLessons, 1);
                
                let isNodeCompleted = isNodeFinished(node.id, totalLessons);

                let status = 'locked';
                if (isNodeCompleted) {
                  status = 'completed';
                  progressFraction = 1;
                } else if (completedCount > 0) {
                  status = 'current';
                } else if (moduleIndex === 0 && index === 0) {
                  status = 'current';
                }
                
                // Sequential unlock check
                if (status === 'locked') {
                  if (index > 0) {
                    const prevNode = moduleNodes[index - 1];
                    if (isNodeFinished(prevNode.id, prevNode.totalLessons || 1)) status = 'current';
                  } else if (moduleIndex > 0) {
                    const prevModule = modules[moduleIndex - 1];
                    const prevNode = prevModule.nodes[prevModule.nodes.length - 1];
                    if (isNodeFinished(prevNode.id, prevNode.totalLessons || 1)) status = 'current';
                  }
                }

                const isBelowFold = moduleIndex > 0 || index >= 3;

                // Handle Reward type icons
                let defaultIcon: React.ReactNode = <img src="/single-star.svg" alt="Star" width={56} height={56} loading={isBelowFold ? "lazy" : undefined} style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />;
                if (userProgress?.scores?.active_theme === 'halloween') {
                    defaultIcon = (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="currentColor">
                           <path d="M12 2c-1.5 0-3 1-3 2s1 2 1 2c-2.5.5-5 2.5-5 6s2 8 7 8 7-4 7-8-2.5-5.5-5-6c0 0 1-1 1-2s-1.5-2-3-2zm-3 9l2 2-2 2v-4zm6 0v4l-2-2 2-2zm-3 3l2 2h-4l2-2z" />
                        </svg>
                    );
                }

                let icon: React.ReactNode = defaultIcon;
                if (node.type === 'reward') icon = '🎁';
                else if (node.id === 'Boss' || node.title.includes('Boss')) icon = '👹';
                else if (status === 'completed') icon = defaultIcon;

                // Render Chest Node separately
                if (node.type === 'chest') {
                  const isOpening = openingChestId === node.id;
                  const wrapperClass = status === 'current' && !isOpening ? 'ready-to-open' : (isOpening ? 'opening' : '');
                  
                  return (
                    <div key={node.id} className={`roadmap-node-container ${offsetClass}`} style={{ position: 'relative', zIndex: 2 }}>
                      {status === 'current' && !isOpening && (
                        <div className="node-chat-bubble" style={{ zIndex: 10 }}>Nyisd ki!</div>
                      )}
                      <div 
                        className={`treasure-chest-wrapper ${wrapperClass}`}
                        onClick={() => handleChestClick(node, status, moduleNodes.length)}
                        style={{ background: 'none', boxShadow: 'none' }}
                      >
                        <div style={{ filter: status === 'locked' ? 'grayscale(100%)' : 'none', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
                          <TreasureChest isOpen={status === 'completed' || isOpening} loading={isBelowFold ? "lazy" : undefined} />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={node.id} className={`roadmap-node-container ${offsetClass}`} style={{ position: 'relative', zIndex: activeTooltipId === node.id ? 50 : 2 }}>
                    <div 
                      className={`roadmap-node ${status} ${activeTooltipId === node.id ? 'active-tooltip' : ''}`}
                      title={node.title}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (activeTooltipId === node.id) setActiveTooltipId(null);
                        else setActiveTooltipId(node.id);
                      }}
                    >
                      {status === 'current' && activeTooltipId !== node.id && (
                        <div className="node-chat-bubble" style={{ zIndex: 10 }}>Kezdés</div>
                      )}

                      <div className="node-icon-wrapper" style={{ position: 'relative', zIndex: 2, background: 'none', boxShadow: 'none' }}>
                        <img src="/new-icon.svg" alt="Platform" width={80} height={80} loading={isBelowFold ? "lazy" : undefined} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', zIndex: -1, filter: status === 'locked' ? 'grayscale(100%) opacity(0.5)' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
                        <span className="node-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>{icon}</span>
                      </div>
                      
                      {/* Tooltip */}
                      <div className={`node-tooltip ${index === 0 ? 'tooltip-bottom' : ''}`}>
                        <div className="tooltip-header">
                          <div className="tooltip-title">{node.title}</div>
                          {(node.totalLessons || 0) > 0 && (
                            <div className="tooltip-subtitle">
                              {Math.min((userProgress.scores?.node_state?.[node.id]?.completedLessons?.length || 0) + 1, node.totalLessons || 0)}/{node.totalLessons}. lecke
                            </div>
                          )}
                        </div>
                        <button 
                          className="tooltip-start-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNodeClick) onNodeClick(node.originalData);
                          }}
                        >
                          INDÍTÁS
                        </button>
                      </div>
                    </div>
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
