
export interface CurriculumNode {
  id: string;
  type: string;
  title: string;
  totalLessons?: number;
  dataSource: string;
  originalData?: any;
}

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  themeColor: string;
  folderName: string;
  nodes: CurriculumNode[];
}

export interface CurriculumLevel {
  id: string;
  modules: CurriculumModule[];
}

const metaFiles = import.meta.glob('/data/**/module_meta.json', { eager: true });
const nodeFiles = import.meta.glob('/data/**/node*.json', { eager: true });

export const getCurriculum = (lang: string = 'hu'): Record<string, CurriculumLevel> => {
  const curriculum: Record<string, CurriculumLevel> = {};

  for (const path in metaFiles) {
    if (!path.startsWith(`/data/${lang}/`)) continue;
    const parts = path.split('/');
    if (parts.length >= 6) {
      const levelId = parts[3];
      const folderName = parts[4];

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

  for (const path in nodeFiles) {
    if (!path.startsWith(`/data/${lang}/`)) continue;
    const parts = path.split('/');
    if (parts.length >= 6) {
      const levelId = parts[3];
      const folderName = parts[4];
      const fileName = parts[5];
      const nodeId = fileName.replace('.json', '');

      const nodeData = (nodeFiles[path] as any).default || nodeFiles[path];

      const node: CurriculumNode = {
        id: nodeId,
        type: nodeData.type || 'multi_level_node',
        title: nodeData.title || nodeId,
        totalLessons: nodeData.lessons ? nodeData.lessons.length : (nodeData.totalLessons || 0),
        dataSource: path.replace(/^\//, ''),
        originalData: { id: nodeId, ...nodeData }
      };

      if (curriculum[levelId]) {
        const moduleIndex = curriculum[levelId].modules.findIndex(m => m.folderName === folderName);
        if (moduleIndex !== -1) {
          curriculum[levelId].modules[moduleIndex].nodes.push(node);
        } else {
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

  for (const level in curriculum) {
    curriculum[level].modules.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    curriculum[level].modules.forEach(m => {
      m.nodes.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      if (m.nodes.length > 0) {
        const middleIndex = Math.floor(m.nodes.length / 2);
        m.nodes.splice(middleIndex, 0, {
          id: `chest_${m.id}`,
          type: 'chest',
          title: 'Jutalom Láda',
          totalLessons: 1,
          dataSource: 'virtual'
        });
      }
    });
  }

  return curriculum;
};
