import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export interface UserProgressData {
    username: string;
    points: number;
    completed: Record<string, any>;
    scores: {
        level?: number;
        streak_count?: number;
        streak_shields?: number;
        bones?: number;
        earned_xp_per_node?: Record<string, number>;
        active_theme?: string;
        active_nameplate?: string;
        node_state?: Record<string, any>;
        achievements?: string[];
    };
    role: "user" | "admin";
    subscription_tier: "free" | "premium" | "lifetime";
    daily_quests_date: string | null;
    active_quests: any[];
    quest_progress: Record<string, any>;
    completed_quests_today: any[];
    onboarding_completed?: boolean;
    base_language?: string;
    avatar?: string | null;
    energy?: number;
    last_energy_refill?: string;
    learnedWords: string[];
    unlocked_themes?: string[];
    notification_preferences?: {
        marketing?: boolean;
        inactivity?: boolean;
        milestones?: boolean;
        weekly_report?: boolean;
    };
}

export interface UserContextType {
    isGuest: boolean;
    data: UserProgressData;
    activeLevel: string;
    setActiveLevel: (level: string) => void;
    updateProgress: (newData: Partial<UserProgressData>) => void;
    clearGuestData: () => void;
    addXP: (amount: number) => void;
    completeLesson: (nodeId: string, xpEarned: number, accuracy: number, subLessonId?: string, isNodeComplete?: boolean, isTutorial?: boolean) => void;
    syncLearnedWords: (words: string[]) => void;
    buyCosmetic: (type: string, id: string, cost: number) => Promise<{success: boolean, message: string}>;
    updatePreferences: (prefs: any) => Promise<{success: boolean, message?: string}>;
    updateLanguage: (lang: string) => Promise<{success: boolean, message?: string}>;
    isLoading: boolean;
}

const hostname = window.location.hostname;
let defaultLng = localStorage.getItem('guest_base_language') || 'hu';
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');

if (langParam && (langParam === 'sk' || langParam === 'hu')) {
  defaultLng = langParam;
} else if (hostname.endsWith('.sk')) {
  defaultLng = 'sk';
} else if (hostname.endsWith('.hu')) {
  defaultLng = 'hu';
}

const defaultUserData: UserProgressData = {
    username: "Vendég",
    points: 0,
    completed: {},
    scores: { bones: 100, streak_shields: 0, achievements: [] },
    role: "user",
    subscription_tier: "free",
    base_language: defaultLng,
    daily_quests_date: null,
    active_quests: [],
    quest_progress: {},
    completed_quests_today: [],
    onboarding_completed: false,
    energy: 5,
    last_energy_refill: new Date().toISOString(),
    learnedWords: [],
    unlocked_themes: ['system', 'light', 'dark'],
    notification_preferences: {
        marketing: true,
        inactivity: true,
        milestones: true,
        weekly_report: true
    }
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Initial State for Active Level (A1, A2, B1, B2)
    const [activeLevel, setActiveLevelState] = useState<string>(() => {
        return localStorage.getItem("selectedLevel") || "A1";
    });

    // 2. Initial State for User Data & Guest Status
    const [isGuest, setIsGuest] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [data, setData] = useState<UserProgressData>(defaultUserData);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: sessionData, isLoading: isSessionLoading } = useQuery({
        queryKey: ['session'],
        queryFn: () => api.fetch('get_session'),
        staleTime: Infinity
    });

    useEffect(() => {
        if (isSessionLoading) return;
        const res = sessionData;
                // Initialize data variable (can be server data or guest data)
                let initialData = defaultUserData;

                if (res && res.session) {
                    // User is authenticated
                    setIsGuest(false);
                    const serverData = res.session;
                    
                    let completed = {};
                    let scores: Record<string, any> = {};
                    let questProgress = {};
                    let activeQuests = [];
                    let completedQuestsToday = [];
                    
                    const progressData = serverData.progress || {};
                    const userData = serverData.user || {};
                    const subData = serverData.subscription || {};
                    const userMetadata = userData.user_metadata || {};
                    
                    try { completed = typeof progressData.completed === 'string' ? JSON.parse(progressData.completed) : progressData.completed; } catch(e){}
                    try { scores = typeof progressData.scores === 'string' ? JSON.parse(progressData.scores) : progressData.scores; } catch(e){}
                    try { questProgress = typeof progressData.quest_progress === 'string' ? JSON.parse(progressData.quest_progress) : progressData.quest_progress; } catch(e){}
                    try { activeQuests = typeof progressData.active_quests === 'string' ? JSON.parse(progressData.active_quests) : progressData.activeQuests; } catch(e){}
                    try { completedQuestsToday = typeof progressData.completed_quests_today === 'string' ? JSON.parse(progressData.completed_quests_today) : progressData.completed_quests_today; } catch(e){}
                    // Ensure active_theme is correctly mapped to scores
                    if (progressData.active_theme) {
                        scores.active_theme = progressData.active_theme === 'default' ? 'system' : progressData.active_theme;
                    }

                    initialData = {
                        username: userMetadata.username || userData.username || 'Vendég',
                        points: progressData.points || 0,
                        completed: completed || {},
                        scores: scores || {},
                        role: subData.role || 'user',
                        subscription_tier: subData.subscription_tier || 'free',
                        daily_quests_date: progressData.daily_quests_date,
                        active_quests: activeQuests || [],
                        quest_progress: questProgress || {},
                        completed_quests_today: completedQuestsToday || [],
                        base_language: langParam && (langParam === 'sk' || langParam === 'hu') ? langParam : (hostname.endsWith('.sk') ? 'sk' : (hostname.endsWith('.hu') ? 'hu' : (userMetadata.base_language || 'hu'))),
                        avatar: userMetadata.avatar || null,
                        onboarding_completed: Object.keys(completed || {}).length > 0 || (progressData.points || 0) > 0,
                        energy: progressData.energy ?? 5,
                        last_energy_refill: progressData.last_energy_refill ?? new Date().toISOString(),
                        learnedWords: progressData.learnedWords || [],
                        unlocked_themes: progressData.unlocked_themes || ['system', 'light', 'dark'],
                        notification_preferences: userMetadata.notification_preferences || defaultUserData.notification_preferences
                    };
                    
                    // Fetch vocabulary
                    api.fetch('get_vocabulary').then(vocabRes => {
                        if (vocabRes && vocabRes.success && vocabRes.vocabulary) {
                            setData(prev => ({...prev, learnedWords: vocabRes.vocabulary}));
                        }
                    });
                } else {
                    // Fallback to Guest / LocalStorage if no session
                    setIsGuest(true);
                    const savedData = localStorage.getItem("neolix_guest_progress");
                    if (savedData) {
                        try {
                            initialData = { ...initialData, ...JSON.parse(savedData) };
                        } catch (e) {
                            console.error("Failed to parse guest data", e);
                        }
                    }
                    
                    // Ensure existing guests have the bones property initialized
                    if (initialData.scores.bones === undefined) {
                        initialData.scores.bones = 100;
                    }
                    
                    if (initialData.energy === undefined) {
                        initialData.energy = 5;
                        initialData.last_energy_refill = new Date().toISOString();
                    }
                }

                // Daily Quest Generation (For both guest and authenticated)
                const today = new Date().toISOString().split('T')[0];
                let questsUpdated = false;
                if (initialData.daily_quests_date !== today) {
                    initialData.daily_quests_date = today;
                    
                    const questPool = [
                        { id: 'q_xp_50', description: 'Szerezz 50 XP-t', target: 50, reward: 1 },
                        { id: 'q_tasks_3', description: 'Végezz el 3 feladatot', target: 3, reward: 1 },
                        { id: 'q_acc_100', description: 'Érj el 100% pontosságot', target: 1, reward: 2 },
                        { id: 'q_xp_100', description: 'Szerezz 100 XP-t', target: 100, reward: 2 },
                        { id: 'q_tasks_5', description: 'Végezz el 5 feladatot', target: 5, reward: 2 },
                        { id: 'q_acc_90', description: 'Érj el 90% feletti pontosságot 2 alkalommal', target: 2, reward: 1 }
                    ];
                    
                    // Shuffle and pick 3
                    const shuffled = [...questPool].sort(() => 0.5 - Math.random());
                    initialData.active_quests = shuffled.slice(0, 3);
                    
                    initialData.quest_progress = {};
                    initialData.active_quests.forEach(q => initialData.quest_progress[q.id] = 0);
                    initialData.completed_quests_today = [];
                    questsUpdated = true;
                    
                    if (initialData.scores) {
                        initialData.scores.streak_count = (initialData.scores.streak_count || 0) + 1;
                    }
                }
                
                if (langParam && (langParam === 'sk' || langParam === 'hu')) {
                    initialData.base_language = langParam;
                    localStorage.setItem('guest_base_language', langParam);
                }
                
                import('i18next').then((i18n) => {
                    i18n.default.changeLanguage(initialData.base_language);
                });

                setData(initialData);

                // If quests were regenerated for an authenticated user, sync with backend
                if (questsUpdated && res && res.session) {
                    api.fetch('update_progress', {
                        active_quests: initialData.active_quests,
                        quest_progress: initialData.quest_progress,
                        completed_quests_today: initialData.completed_quests_today,
                        daily_quests_date: initialData.daily_quests_date,
                        scores: initialData.scores
                    }).catch(console.error);
                }
                
                setIsLoading(false);
    }, [sessionData, isSessionLoading]);

    // Energy Regeneration Effect
    useEffect(() => {
        if (data.energy !== undefined && data.last_energy_refill && data.energy < 5) {
            const checkRegeneration = () => {
                const refillTime = new Date(data.last_energy_refill!).getTime();
                const now = new Date().getTime();
                const hoursPassed = (now - refillTime) / (1000 * 60 * 60);
                
                if (hoursPassed >= 2) {
                    const energyToAdd = Math.floor(hoursPassed / 2);
                    const newEnergy = Math.min(5, data.energy! + energyToAdd);
                    
                    // Advance refill time by 2 hours per energy gained
                    const addedTimeMs = energyToAdd * 2 * 60 * 60 * 1000;
                    const newRefillTime = new Date(refillTime + addedTimeMs).toISOString();
                    
                    updateProgress({
                        energy: newEnergy,
                        last_energy_refill: newEnergy === 5 ? new Date().toISOString() : newRefillTime
                    });
                }
            };
            
            // Check immediately
            checkRegeneration();
            
            // Then check every minute
            const interval = setInterval(checkRegeneration, 60000);
            return () => clearInterval(interval);
        }
    }, [data.energy, data.last_energy_refill]);

    // Theme Application Effect
    useEffect(() => {
        const applyTheme = (theme: string) => {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else if (theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else if (theme === 'fall') {
                document.documentElement.setAttribute('data-theme', 'fall');
            } else if (theme === 'halloween') {
                document.documentElement.setAttribute('data-theme', 'halloween');
            } else {
                // system default: remove attribute to let CSS media queries take over
                document.documentElement.removeAttribute('data-theme');
            }
        };

        const storedTheme = data.scores?.active_theme;
        const activeTheme = (!storedTheme || storedTheme === 'default') ? 'system' : storedTheme;
        applyTheme(activeTheme);
    }, [data.scores?.active_theme]);

    const setActiveLevel = (level: string) => {
        setActiveLevelState(level);
        localStorage.setItem("selectedLevel", level);
        // Expose to window for legacy JS compatibility during transition
        window.localStorage.setItem("selectedLevel", level);
        
        // Dispatch custom event so the old dashboard.js can react to level change
        window.document.dispatchEvent(new CustomEvent('levelChanged', { detail: { level } }));
    };

    const buyCosmetic = async (type: string, id: string, cost: number) => {
        if (isGuest) {
            // Instant success for guests
            updateProgress({
                unlocked_themes: [...(data.unlocked_themes || ['system', 'light', 'dark']), id],
                scores: { ...data.scores, bones: Math.max(0, (data.scores?.bones || 0) - cost) }
            });
            return { success: true, message: 'Sikeres vásárlás!' };
        }
        
        try {
            const res = await api.fetch('buy_cosmetic', { item_type: type, item_id: id, cost });
            if (res && res.status === 'success') {
                // Update local state directly with new data
                setData(prev => ({
                    ...prev,
                    unlocked_themes: res.unlocked_themes,
                    scores: {
                        ...prev.scores,
                        bones: res.new_bones
                    }
                }));
                return { success: true, message: res.message };
            }
            return { success: false, message: res?.message || 'Hiba történt' };
        } catch (e) {
            return { success: false, message: 'Hálózati hiba' };
        }
    };

    const updatePreferences = async (prefs: any) => {
        if (isGuest) return {success: false, message: "Jelentkezz be a beállítások mentéséhez!"};
        setData(prev => ({
            ...prev,
            notification_preferences: { ...prev.notification_preferences, ...prefs }
        }));
        const res = await api.fetch('update_preferences', { preferences: prefs });
        if (res.success) {
            return {success: true};
        }
        return {success: false, message: res.error || "Hiba történt a mentés során."};
    };

    const updateLanguage = async (lang: string) => {
        if (isGuest) {
            localStorage.setItem('guest_base_language', lang);
            setData(prev => ({ ...prev, base_language: lang }));
            return {success: true};
        }
        
        setData(prev => ({ ...prev, base_language: lang }));
        const res = await api.fetch('update_preferences', { base_language: lang });
        if (res.success) {
            return {success: true};
        }
        return {success: false, message: res.error || "Hiba történt a mentés során."};
    };

    const updateProgress = (newData: Partial<UserProgressData>) => {
        setData(prev => {
            const updated = { ...prev, ...newData };
            
            // Re-evaluate onboarding_completed dynamically if not already true
            if (!updated.onboarding_completed) {
                updated.onboarding_completed = Object.keys(updated.completed || {}).length > 0 || (updated.points || 0) > 0;
            }
            
            if (isGuest) {
                localStorage.setItem("neolix_guest_progress", JSON.stringify(updated));
            } else {
                // Debounce API calls to prevent spamming the database
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                    api.fetch('save_progress', {
                        points: updated.points,
                        completed: updated.completed,
                        scores: updated.scores,
                        quest_progress: updated.quest_progress,
                        completed_quests_today: updated.completed_quests_today
                    }).then((res) => {
                        if (res?.success) {
                            window.dispatchEvent(new CustomEvent('lexipawsProgressSaved'));
                        }
                    });
                }, 1500);
            }
            
            return updated;
        });
    };

    const clearGuestData = () => {
        if (isGuest) {
            localStorage.removeItem("neolix_guest_progress");
            setData(defaultUserData);
            window.location.reload();
        }
    };

    const addXP = (amount: number) => {
        updateProgress({ points: (data.points || 0) + amount });
    };

    const syncLearnedWords = (words: string[]) => {
        if (!words || words.length === 0) return;
        
        // Update local state immediately to avoid UI lag
        setData(prev => {
            const newWords = words.filter(w => !prev.learnedWords.includes(w));
            if (newWords.length === 0) return prev;
            return {
                ...prev,
                learnedWords: [...prev.learnedWords, ...newWords]
            };
        });
        
        if (!isGuest) {
            api.fetch('sync_vocabulary', { words }).catch(console.error);
        }
    };

    const completeLesson = (nodeId: string, xpEarned: number, accuracy: number, subLessonId?: string, isNodeComplete?: boolean, isTutorial?: boolean) => {
        if (!data || !data.completed) return;
        const newCompleted = { ...data.completed };
        
        // Only mark the node as completed if isNodeComplete is true, or if no sub-lessons are used.
        if (isNodeComplete || !subLessonId) {
            if (!newCompleted[activeLevel]) {
                newCompleted[activeLevel] = [];
            }
            if (!newCompleted[activeLevel].includes(nodeId)) {
                newCompleted[activeLevel].push(nodeId);
            }
        }

        const newScores = { ...data.scores };
        if (!newScores.earned_xp_per_node) {
            newScores.earned_xp_per_node = {};
        }
        newScores.earned_xp_per_node[nodeId] = (newScores.earned_xp_per_node[nodeId] || 0) + xpEarned;

        if (subLessonId) {
            if (!newScores.node_state) newScores.node_state = {};
            if (!newScores.node_state[nodeId]) newScores.node_state[nodeId] = { completedLessons: [] };
            if (!newScores.node_state[nodeId].completedLessons.includes(subLessonId)) {
                newScores.node_state[nodeId].completedLessons.push(subLessonId);
            }
        }

        // Bones logic
        if (isTutorial) {
            newScores.bones = (newScores.bones || 0) + 5;
            newScores.streak_shields = (newScores.streak_shields || 0) + 1;
            newScores.streak_count = 1;
        } else {
            const earnedBones = data.subscription_tier === 'premium' || data.subscription_tier === 'lifetime' ? 3 : 1;
            newScores.bones = (newScores.bones || 0) + earnedBones;
        }

        // Progress Daily Quests dynamically
        const newQuestProgress = { ...data.quest_progress };
        data.active_quests.forEach(quest => {
            if (data.completed_quests_today.includes(quest.id)) return;
            
            if (quest.id === 'q_xp_50' || quest.id === 'q_xp_100') {
                newQuestProgress[quest.id] = (newQuestProgress[quest.id] || 0) + xpEarned;
            } else if (quest.id === 'q_tasks_3' || quest.id === 'q_tasks_5') {
                newQuestProgress[quest.id] = (newQuestProgress[quest.id] || 0) + 1;
            } else if (quest.id === 'q_acc_100' && accuracy === 100) {
                newQuestProgress[quest.id] = (newQuestProgress[quest.id] || 0) + 1;
            } else if (quest.id === 'q_acc_90' && accuracy >= 90) {
                newQuestProgress[quest.id] = (newQuestProgress[quest.id] || 0) + 1;
            }
        });

        // Check for completed quests
        const newCompletedQuests = [...data.completed_quests_today];
        let bonesFromQuests = 0;
        data.active_quests.forEach(quest => {
            if (!newCompletedQuests.includes(quest.id) && newQuestProgress[quest.id] >= quest.target) {
                newCompletedQuests.push(quest.id);
                bonesFromQuests += quest.reward;
                // If all 3 are completed, give an extra 2 bones
                if (newCompletedQuests.length === 3) {
                    bonesFromQuests += 2;
                }
            }
        });
        
        newScores.bones += bonesFromQuests;

        // Achievements Logic
        if (!newScores.achievements) newScores.achievements = [];
        const unlockedNow = [];

        // 1. First Steps: Complete 1st lesson
        if (!newScores.achievements.includes('first_steps') && (isNodeComplete || subLessonId)) {
            newScores.achievements.push('first_steps');
            unlockedNow.push('first_steps');
        }

        // 2. Flawless: Get 100% accuracy in a lesson
        if (!newScores.achievements.includes('flawless') && accuracy === 100) {
            newScores.achievements.push('flawless');
            unlockedNow.push('flawless');
        }

        // 3. On a Roll: 7-day streak
        if (!newScores.achievements.includes('on_a_roll') && newScores.streak_count && newScores.streak_count >= 7) {
            newScores.achievements.push('on_a_roll');
            unlockedNow.push('on_a_roll');
        }

        // 4. Overachiever: Reach 1000 XP
        const totalXP = (data.points || 0) + xpEarned;
        if (!newScores.achievements.includes('overachiever') && totalXP >= 1000) {
            newScores.achievements.push('overachiever');
            unlockedNow.push('overachiever');
        }

        if (unlockedNow.length > 0) {
            window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: { achievements: unlockedNow } }));
        }

        const progressUpdate: Partial<UserProgressData> = { 
            points: (data.points || 0) + xpEarned,
            completed: newCompleted,
            scores: newScores,
            quest_progress: newQuestProgress,
            completed_quests_today: newCompletedQuests
        };

        if (isTutorial) {
            progressUpdate.energy = 5;
            progressUpdate.last_energy_refill = new Date().toISOString();
        }

        updateProgress(progressUpdate);
    };

    return (
        <UserContext.Provider value={{ 
            isGuest, 
            data, 
            activeLevel, 
            setActiveLevel, 
            updateProgress, 
            clearGuestData, 
            addXP, 
            completeLesson, 
            syncLearnedWords, 
            buyCosmetic,
            updatePreferences,
            updateLanguage,
            isLoading 
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
