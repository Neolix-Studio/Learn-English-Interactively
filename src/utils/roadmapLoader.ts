// src/utils/roadmapLoader.ts

export interface CurriculumNode {
  id: string; // e.g. node1_ordering_a_drink
  type: string; // e.g. multi_level_node, reward
  title: string;
  totalLessons?: number;
  dataSource: string; // relative path from root
  originalData?: any; 
}

export interface CurriculumModule {
  id: string; // e.g. Module_1
  title: string;
  description: string;
  themeColor: string;
  folderName: string; // e.g. Module_1_Hello_World
  nodes: CurriculumNode[];
}

export interface CurriculumLevel {
  id: string; // e.g. A1
  modules: CurriculumModule[];
}

// Vite glob imports for meta files and nodes
// eager: true parses the JSONs at build time
const metaFiles = import.meta.glob('/data/**/module_meta.json', { eager: true });
const nodeFiles = import.meta.glob('/data/**/node*.json', { eager: true });

export const getCurriculum = (lang: string = 'hu'): Record<string, CurriculumLevel> => {
  const curriculum: Record<string, CurriculumLevel> = {};

  // First, parse meta files to establish modules
  for (const path in metaFiles) {
    if (!path.startsWith(`/data/${lang}/`)) continue;
    const parts = path.split('/');
    if (parts.length >= 6) {
      const levelId = parts[3]; // A1 (after /data/hu/)
      const folderName = parts[4]; // Module_1_Hello_World
      
      const meta = (metaFiles[path] as any).default || metaFiles[path];
      
      if (!curriculum[levelId]) {
        curriculum[levelId] = { id: levelId, modules: [] };
      }
      
      curriculum[levelId].modules.push({
        id: meta.id || folderName,
        title: meta.title || folderName,
        description: meta.description || '',
        themeColor: meta.themeColor || '#3b82f6',
        folderName: folderName,
        nodes: []
      });
    }
  }

  // Next, parse node files and assign them to modules
  for (const path in nodeFiles) {
    if (!path.startsWith(`/data/${lang}/`)) continue;
    const parts = path.split('/');
    if (parts.length >= 6) {
      const levelId = parts[3];
      const folderName = parts[4];
      const fileName = parts[5]; // node1_ordering_a_drink.json
      const nodeId = fileName.replace('.json', '');
      
      const nodeData = (nodeFiles[path] as any).default || nodeFiles[path];
      
      const node: CurriculumNode = {
        id: nodeId,
        type: nodeData.type || 'multi_level_node',
        title: nodeData.title || nodeId,
        totalLessons: nodeData.lessons ? nodeData.lessons.length : (nodeData.totalLessons || 0),
        dataSource: path.replace(/^\//, ''), // remove leading slash
        originalData: { id: nodeId, ...nodeData }
      };
      
      if (curriculum[levelId]) {
        const moduleIndex = curriculum[levelId].modules.findIndex(m => m.folderName === folderName);
        if (moduleIndex !== -1) {
          curriculum[levelId].modules[moduleIndex].nodes.push(node);
        } else {
           // Fallback if module_meta is missing
           curriculum[levelId].modules.push({
             id: folderName,
             title: folderName,
             description: '',
             themeColor: '#3b82f6',
             folderName: folderName,
             nodes: [node]
           });
        }
      }
    }
  }

  // Sort modules by folder name or id (Module_1, Module_2)
  for (const level in curriculum) {
    curriculum[level].modules.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    // Sort nodes by file name (node1, node2)
    curriculum[level].modules.forEach(m => {
      m.nodes.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      
      // Inject Chest Node in the middle
      if (m.nodes.length > 0) {
        const middleIndex = Math.floor(m.nodes.length / 2);
        m.nodes.splice(middleIndex, 0, {
          id: `chest_${m.id}`,
          type: 'chest',
          title: 'Jutalom Láda',
          totalLessons: 1, // Requires 1 action (click) to complete
          dataSource: 'virtual'
        });
      }
    });
  }

  return curriculum;
};
