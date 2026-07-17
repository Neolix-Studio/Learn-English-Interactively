export interface StoryNode {
    id: string;
    title: string;
    type: string;
    story: {
        en: string;
        hu: string;
    };
    items: any[];
}

export function getAllStories(lang: string = 'hu'): StoryNode[] {
    const modules = import.meta.glob('../../data/**/stories/*.json', { eager: true });
    const stories: StoryNode[] = [];

    for (const path in modules) {
        if (!path.includes(`/data/${lang}/stories/`)) continue;
        const data = (modules[path] as any).default || modules[path];
        const filename = path.split('/').pop()?.replace('.json', '') || 'unknown_story';
        stories.push({
            id: `story_${filename}`,
            ...data
        });
    }

    return stories;
}

export function getRandomStory(lang: string = 'hu'): StoryNode | null {
    const stories = getAllStories(lang);
    if (stories.length === 0) return null;
    return stories[Math.floor(Math.random() * stories.length)];
}
