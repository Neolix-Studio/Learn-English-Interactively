// js/dashboard.js

document.addEventListener("DOMContentLoaded", async () => {
    // Accordion listeners are now initialized dynamically inside renderSidebar()
    initTopNavbarListeners();
    // Initialize standard modal and profile listeners if they exist in external scripts or below
    if (typeof initModalListeners === "function") initModalListeners();
    if (typeof initProfileListeners === "function") initProfileListeners();
    initResumeCTAListener();
    
    // Initialize progression tracking for the logged-in user
    await initUserProgress();
    
    // Read what level was clicked on index.html (fallback to A1 if empty)
    const levelToLoad = localStorage.getItem("selectedLevel") || "A1";
    
    // Automatically launch the workspace with the correct level data context
    switchGlobalLevel(levelToLoad, true);
});

// Track the currently active module context
let currentLevel = "A1";
let currentSection = "ToBe";
let currentSubsection = "explanation";

// LocalStorage Persistence Layer specifically for Guests
const LocalSavingsService = {
    getKey: () => `neolix_guest_progress`,
    save: (data) => {
        localStorage.setItem(LocalSavingsService.getKey(), JSON.stringify(data));
    },
    load: () => {
        const saved = localStorage.getItem(LocalSavingsService.getKey());
        return saved ? JSON.parse(saved) : null;
    },
    clear: () => {
        localStorage.removeItem(LocalSavingsService.getKey());
    }
};

// Global Progress Tracking Object & Abstraction Layer
const ProgressManager = {
    isGuest: true,
    data: {
        username: "Vendég",
        points: 0,
        completed: {},
        scores: {},
        role: "user",
        subscription_tier: "free"
    },
    getGuestPayload: function() {
        return LocalSavingsService.load();
    },
    clearGuestData: function() {
        if (this.isGuest) {
            LocalSavingsService.clear();
            window.location.reload();
        }
    }
};

// Individual user progress state tracking alias
let userProgress = ProgressManager.data;

// Global cache for fetched vocabulary data to prevent redundant network hits
const vocabCache = {};

// Global API Client Endpoint for local WebSupport MariaDB backend
// Uses config.js API_URL constraint

// Stopwatch timer state
let stopwatchInterval = null;
let stopwatchSeconds = 0;

// Tracking correctness attempts map for the current active exercise view (maps question index -> boolean correctness)
let exerciseAttempts = {};

// Global classification helpers to distinguish types cleanly
function isExplanation(subsectionData) {
    return subsectionData && subsectionData.type === "explanation";
}

function isVocabulary(subsectionData) {
    return subsectionData && subsectionData.type === "words";
}

function isExercise(subsectionData) {
    return subsectionData && ["fill_blanks", "word_order", "true_false"].includes(subsectionData.type);
}

function isExam(subsectionData) {
    return subsectionData && subsectionData.type === "section_exam";
}

// Gatekeeper logic for content access (Limits guests, respects RBAC/subscriptions)
function isContentAccessible(level, courseKey, subsectionType = null) {
    if (!ProgressManager.isGuest) {
        // Admin or Lifetime bypasses everything
        if (ProgressManager.data.role === "admin" || ProgressManager.data.subscription_tier === "lifetime") {
            return true;
        }

        // BETA GIFT: Currently giving all registered users full access
        return true; 
        
        // FUTURE IMPLEMENTATION:
        // Here we would check their subscription tier against the required tier for this level
        // if (level !== "A1" && ProgressManager.data.subscription_tier === "free") return false;
    }

    // Calculate total valid courses across all levels (excluding exams)
    let totalCourses = 0;
    const courseList = []; // Ordered list of course paths to determine index

    // Define predictable level order
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    
    for (const lvl of levels) {
        if (learningContent[lvl]) {
            for (const key in learningContent[lvl]) {
                // If the section is a global level exam, don't count it as a "course" for the 20% pool
                if (key !== "level_exam" && key !== "final_exam") {
                    totalCourses++;
                    courseList.push(`${lvl}_${key}`);
                }
            }
        }
    }

    const allowedCount = Math.ceil(totalCourses * 0.20);
    const targetPath = `${level}_${courseKey}`;
    const courseIndex = courseList.indexOf(targetPath);

    // 1. Is the course outside the 20% cap or an explicitly blocked global exam?
    if (courseIndex === -1 || courseIndex >= allowedCount || courseKey === "level_exam" || courseKey === "final_exam") {
        return false;
    }

    // 2. Even within allowed courses, block premium features
    if (subsectionType) {
        if (subsectionType === "explanation" || subsectionType === "section_exam" || subsectionType === "sectionExam" || subsectionType === "final_exam" || subsectionType === "finalExam") {
            return false;
        }
    }

    return true;
}

// Stopwatch actions
function startStopwatch() {
    stopStopwatch();
    stopwatchSeconds = 0;
    updateStopwatchDisplay();
    
    stopwatchInterval = setInterval(() => {
        stopwatchSeconds++;
        updateStopwatchDisplay();
    }, 1000);
}

function stopStopwatch() {
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
}

function updateStopwatchDisplay() {
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        const minutes = Math.floor(stopwatchSeconds / 60);
        const seconds = stopwatchSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerDisplay.textContent = formatted;
    }
}

// Dynamic success rate tracker
function updateSuccessRateDisplay(isActive) {
    const displayEl = document.getElementById("success-rate-display");
    if (!displayEl) return;
    
    if (!isActive) {
        displayEl.textContent = "-";
        return;
    }
    
    const attempted = Object.keys(exerciseAttempts).length;
    if (attempted === 0) {
        displayEl.textContent = "0%";
        return;
    }
    
    let correctCount = 0;
    for (let key in exerciseAttempts) {
        if (exerciseAttempts[key]) {
            correctCount++;
        }
    }
    const rate = Math.round((correctCount / attempted) * 100);
    displayEl.textContent = `${rate}%`;
}

// Global section exam locking checks
function isSectionExamLocked(level, section) {
    const moduleData = learningContent[level]?.[section];
    if (!moduleData || !moduleData.subsections) return false;
    
    for (const subKey in moduleData.subsections) {
        const subData = moduleData.subsections[subKey];
        if (isExam(subData)) {
            continue; // Skip the exam itself
        }
        const key = `${level}_${section}_${subKey}`;
        if (!userProgress.completed[key]) {
            return true; // Lock the exam because a preceding lesson is not completed
        }
    }
    return false; // All preceding lessons completed, unlocked!
}

// Calculates the next logical lesson step based on completion state across ALL sections
function getNextUncompletedLesson(level) {
    const sections = Object.keys(learningContent[level] || {});
    for (const secKey of sections) {
        const moduleData = learningContent[level][secKey];
        if (!moduleData || !moduleData.subsections) continue;
        
        // If the entire section is deemed complete (registered users pass the exam)
        if (userProgress.completed[`${level}_${secKey}_sectionExam`]) {
            continue; // Skip this entire section!
        }
        
        for (const subKey in moduleData.subsections) {
            // Check if the user is even allowed to access this subsection
            const isAccessible = isContentAccessible(level, secKey, subKey);
            if (!isAccessible) continue; // Skip asking them to complete inaccessible lessons!

            const key = `${level}_${secKey}_${subKey}`;
            if (!userProgress.completed[key]) {
                return {
                    section: secKey,
                    key: subKey,
                    title: moduleData.subsections[subKey].title || subKey,
                    isExam: isExam(moduleData.subsections[subKey])
                };
            }
        }
    }
    return null; // All sections in the level are completely finished
}

// Scans forward through the entire curriculum to find the next valid, accessible lesson
function findNextGuestAccessibleLesson(level, section) {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    let foundCurrentSec = false;
    
    for (const lvl of levels) {
        if (!learningContent[lvl]) continue;
        
        const sections = Object.keys(learningContent[lvl]);
        for (const secKey of sections) {
            // Fast-forward to current section
            if (!foundCurrentSec) {
                if (lvl === level && secKey === section) {
                    foundCurrentSec = true;
                } else {
                    continue; // Skip until we find the current section
                }
            }
            
            // Check the current or subsequent section
            const moduleData = learningContent[lvl][secKey];
            if (!moduleData || !moduleData.subsections) continue;
            
            for (const subKey in moduleData.subsections) {
                const subData = moduleData.subsections[subKey];
                const key = `${lvl}_${secKey}_${subKey}`;
                
                // Skip if completed
                if (userProgress.completed[key]) continue;
                
                // Check if accessible
                const isAccessible = isContentAccessible(lvl, secKey, subData.type || subKey);
                if (isAccessible) {
                    return {
                        level: lvl,
                        section: secKey,
                        key: subKey,
                        title: subData.title || subKey,
                        isExam: isExam(subData)
                    };
                }
            }
        }
    }
    
    // Completely exhausted 20% cap or all content
    return { endOfGuestContent: true };
}

// Extracts the logged-in user's name from the header welcome message dynamically
function getLoggedInUser() {
    const welcomeSpan = document.querySelector(".user-welcome");
    if (welcomeSpan) {
        const text = welcomeSpan.textContent;
        const match = text.match(/Szia,?\s+(.+)!/);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return "Vendég";
}

// Loads progression from backend database or LocalStorage fallback
async function initUserProgress() {
    let loggedInUser = "Vendég";
    let userId = null;

    // Hook sign out to ALL logout buttons unconditionally at the START
    // This allows users to always log out, regardless of early returns or guest mode
    const logoutBtns = document.querySelectorAll(".btn-logout");
    logoutBtns.forEach(logoutBtn => {
        logoutBtn.textContent = "Kijelentkezés";
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_URL}?action=logout`);
            } catch (err) {
                console.warn("Logout API failed, proceeding with local wipe:", err);
            }
            // Force hard wipe of any leftover Supabase auth tokens in LocalStorage
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') && key.includes('auth-token')) {
                    localStorage.removeItem(key);
                }
            });
            // Mark the guest as visibly logged out without deleting their progress
            localStorage.setItem("guest_logged_out", "true");
            window.location.href = "index.html";
        });
    });

    try {
        const res = await fetch(`${API_URL}?action=get_session`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.session) {
                const session = data.session;
                const user = session.user;
                loggedInUser = user.user_metadata?.username || user.email.split('@')[0];
                userId = user.id;

                // Sync header username display
                const welcomeSpan = document.querySelector(".user-welcome");
                if (welcomeSpan) {
                    welcomeSpan.textContent = `Szia, ${loggedInUser}!`;
                }

                const progress = session.progress;
                const subscription = session.subscription;

                let completedObj = progress.completed;
                if (!completedObj || Array.isArray(completedObj)) {
                    completedObj = {};
                }
                let scoresObj = progress.scores;
                if (!scoresObj || Array.isArray(scoresObj)) {
                    scoresObj = {};
                }

                ProgressManager.isGuest = false;
                LocalSavingsService.clear(); // Ensure guest data is wiped when successfully logged in
                userProgress = {
                    username: loggedInUser,
                    email: user.email || "",
                    points: progress.points || 0,
                    completed: completedObj,
                    scores: scoresObj,
                    role: subscription?.role || "user",
                    subscription_tier: subscription?.subscription_tier || "free",
                    id: userId
                };
                ProgressManager.data = userProgress;

                // Set profile email field in the modal since it is available in the session
                const emailDisplay = document.getElementById("profile-email-display");
                if (emailDisplay) {
                    emailDisplay.textContent = user.email || "";
                }
                
                console.log("🔓 User Loaded:", ProgressManager.data);
                
                updateProgressUI();
                refreshProfileDOM(); // Wipe loading states
                return;
            }
        }
    } catch (authErr) {
        console.warn("Hiba a munkamenet lekérése során:", authErr);
    }

    // Fallback to ProgressManager for guest
    ProgressManager.isGuest = true;
    const localData = LocalSavingsService.load();
    if (localData) {
        userProgress = localData;
        userProgress.username = "Vendég";
        if (typeof userProgress.points === "undefined") userProgress.points = 0;
        if (!userProgress.scores) userProgress.scores = {};
    } else {
        userProgress = {
            username: "Vendég",
            points: 0,
            completed: {},
            scores: {}
        };
    }
    ProgressManager.data = userProgress;

    // Set profile email display for guest
    const emailDisplay = document.getElementById("profile-email-display");
    if (emailDisplay) {
        emailDisplay.textContent = "Nincs (Vendég)";
    }

    updateProgressUI();
    refreshProfileDOM(); // Ensure "Betöltés" states are wiped for guests too
}

// Explicit Profile DOM refresh to avoid "Betöltés" loading hangs
function refreshProfileDOM() {
    const usernameDisplay = document.getElementById("profile-username-display");
    const subDisplay = document.getElementById("profile-subscription-display");
    
    if (usernameDisplay && userProgress) {
        usernameDisplay.textContent = userProgress.username;
    }
    
    if (subDisplay && userProgress) {
        const tier = userProgress.subscription_tier || "free";
        const role = userProgress.role || "user";
        
        if (role === "admin") {
            subDisplay.textContent = "Örökös Prémium (Admin)";
            subDisplay.style.background = "oklch(0.65 0.2 25 / 0.15)";
            subDisplay.style.color = "var(--color-accent-in)";
            subDisplay.style.border = "1px solid var(--color-accent-in)";
        } else if (tier === "lifetime") {
            subDisplay.textContent = "Örökös Prémium";
            subDisplay.style.background = "oklch(0.65 0.2 25 / 0.15)";
            subDisplay.style.color = "var(--color-accent-in)";
            subDisplay.style.border = "1px solid var(--color-accent-in)";
        } else {
            subDisplay.textContent = "Ingyenes Béta";
            subDisplay.style.background = "oklch(0.6 0.05 250 / 0.15)";
            subDisplay.style.color = "var(--color-text-muted)";
            subDisplay.style.border = "1px solid oklch(0.6 0.05 250 / 0.3)";
        }
    }
}

// Saves progression to database or updates local cache fallback via abstraction
async function saveUserProgress() {
    if (ProgressManager.isGuest) {
        // Isolated guest traffic, purely client-side
        LocalSavingsService.save(userProgress);
    } else {
        if (userProgress.id) {
            try {
                const res = await fetch(`${API_URL}?action=save_progress`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        points: userProgress.points || 0,
                        completed: userProgress.completed || {},
                        scores: userProgress.scores || {}
                    })
                });
                if (!res.ok) {
                    console.error("Sikertelen mentés a szerverre");
                } else {
                    const data = await res.json();
                    if (data.error) {
                        console.error("Sikertelen mentés:", data.error);
                    }
                }
            } catch (err) {
                console.warn("Hiba a mentés során:", err);
            }
        }
    }
    
    updateProgressUI();
}

// Debounced answer saver
let saveAnswerTimeout = null;
function saveExerciseAnswer(level, section, subsection, index, value) {
    const key = `${level}_${section}_${subsection}_answers`;
    if (!userProgress.completed[key]) {
        userProgress.completed[key] = {};
    }
    userProgress.completed[key][index] = value;
    
    if (saveAnswerTimeout) clearTimeout(saveAnswerTimeout);
    saveAnswerTimeout = setTimeout(() => {
        saveUserProgress();
    }, 500);
}

// Marks a specific section page as completed
function markSubsectionCompleted(level, section, subsection, score = null) {
    const key = `${level}_${section}_${subsection}`;
    userProgress.completed[key] = true;
    if (score !== null) {
        userProgress.scores[key] = score;
    }
    saveUserProgress();
}

// Generates the completion button HTML based on completion state
function getCompleteButtonHtml(level, section, subsection, requiresAttempt = false) {
    const key = `${level}_${section}_${subsection}`;
    const isCompleted = userProgress.completed[key];
    
    let disabledAttr = "";
    if (requiresAttempt && !isCompleted) {
        disabledAttr = "disabled";
    }

    if (isCompleted) {
        return `
            <div class="completion-button-container">
                <button class="btn-complete-section completed-badge" disabled>
                    Teljesítve ✓
                </button>
            </div>
        `;
    } else {
        return `
            <div class="completion-button-container">
                <button class="btn-complete-section" ${disabledAttr} onclick="completeSubsectionAction('${level}', '${section}', '${subsection}', this)">
                    <span>Teljesítettem (+5 pont)</span>
                </button>
            </div>
        `;
    }
}

// Action handler for manual section completion
function completeSubsectionAction(level, section, subsection, buttonEl) {
    const key = `${level}_${section}_${subsection}`;
    
    // Prevent duplicate point claims
    if (userProgress.completed[key]) return;
    
    // Stop the timer
    stopStopwatch();

    // Reward points
    userProgress.points = (userProgress.points || 0) + 5;
    
    // Add to time spent & exercises count (saved within scores to avoid DB schema migrations)
    if (!userProgress.scores) userProgress.scores = {};
    userProgress.scores.totalTimeSpent = (userProgress.scores.totalTimeSpent || 0) + stopwatchSeconds;
    userProgress.scores.exercisesCompleted = (userProgress.scores.exercisesCompleted || 0) + 1;
    
    // Mark as completed
    userProgress.completed[key] = true;
    
    // Trigger floating +5 points pop animation
    const container = buttonEl.closest(".completion-button-container");
    if (container) {
        const pop = document.createElement("div");
        pop.className = "floating-points-pop";
        pop.textContent = "+5 Pont! 🎉";
        container.appendChild(pop);
        
        // Remove pop element after animation completes
        setTimeout(() => {
            pop.remove();
        }, 1200);
    }
    
    // Transform button to completed state
    buttonEl.className = "btn-complete-section completed-badge";
    buttonEl.disabled = true;
    buttonEl.innerHTML = "Teljesítve ✓";
    
    // Save state and update UI
    saveUserProgress();

    // Render convenient "Next Lesson" button right next to it so user doesn't have to scroll up
    if (container) {
        const nextLessonInfo = findNextGuestAccessibleLesson(level, section);
        if (nextLessonInfo) {
            container.style.display = "flex";
            container.style.gap = "1rem";
            container.style.justifyContent = "center";
            container.style.flexWrap = "wrap";
            
            const nextBtn = document.createElement("button");
            nextBtn.className = "btn-complete-section";
            nextBtn.style.background = "linear-gradient(135deg, var(--color-accent-in), var(--color-accent-on))";
            nextBtn.style.color = "#000";
            
            if (nextLessonInfo.endOfGuestContent) {
                nextBtn.innerHTML = `<span>Teljes Hozzáférés Feloldása</span>`;
                nextBtn.onclick = () => {
                    openPaywallModal();
                };
            } else {
                nextBtn.innerHTML = `<span>Tovább: ${nextLessonInfo.title}</span> <span style="font-size: 1.2rem;">→</span>`;
                nextBtn.onclick = () => {
                    const targetLevel = nextLessonInfo.level;
                    const targetSection = nextLessonInfo.section;
                    const targetKey = nextLessonInfo.key;
                    
                    const accordion = document.querySelector(`.course-accordion[data-level="${targetLevel}"][data-section="${targetSection}"]`);
                    if (accordion) accordion.open = true;

                    const links = document.querySelectorAll(".subsection-link");
                    links.forEach(l => l.classList.remove("active"));
                    
                    if (accordion) {
                        const targetLink = accordion.querySelector(`.subsection-link[data-subsection="${targetKey}"]`);
                        if (targetLink) targetLink.classList.add("active");
                    }
                    currentLevel = targetLevel;
                    currentSection = targetSection;
                    currentSubsection = targetKey;
                    renderSubsection(targetLevel, targetSection, targetKey);
                    updateProgressUI();
                    
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
            }
            container.appendChild(nextBtn);
        }
    }
}

// Scans the sidebar links to display completion checkmarks and update the level completion meter
async function updateProgressUI() {
    const links = document.querySelectorAll(".subsection-link");
    let totalItems = 0;
    let completedItems = 0;

    links.forEach(link => {
        const accordion = link.closest(".course-accordion");
        if (!accordion) return;

        const level = accordion.getAttribute("data-level");
        const section = accordion.getAttribute("data-section");
        const subsection = link.getAttribute("data-subsection");
        const key = `${level}_${section}_${subsection}`;
        const subData = learningContent[level]?.[section]?.subsections?.[subsection];

        // 1. Guest/Subscription Restrictions
        const isContentRestricted = !isContentAccessible(level, section, subsection);
        const iconSpan = link.querySelector(".subsection-icon");
        
        if (isContentRestricted) {
            link.classList.add("guest-locked");
            link.classList.remove("locked"); // Ensure it doesn't trigger standard exam lock
            if (iconSpan) iconSpan.textContent = "🔒";
        } else {
            link.classList.remove("guest-locked");
            // If it's an exam, we still need to check if it's progression-locked
            if (isExam(subData)) {
                const isProgressionLocked = isSectionExamLocked(level, section);
                if (isProgressionLocked) {
                    link.classList.add("locked");
                    if (iconSpan) iconSpan.textContent = "🔒";
                } else {
                    link.classList.remove("locked");
                    if (iconSpan) iconSpan.textContent = subData.icon || "🏆";
                }
            } else {
                link.classList.remove("locked");
                if (iconSpan) iconSpan.textContent = subData.icon || "📚";
            }
        }

        // Only count subsections belonging to the current visual level track, excluding exam
        if (level === currentLevel && !isExam(subData)) {
            totalItems++;
            if (userProgress.completed[key]) {
                completedItems++;
            }
        }

        // Render visual checkmark badge in sidebar if completed
        let badge = link.querySelector(".progress-badge-sidebar");
        if (userProgress.completed[key]) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "progress-badge-sidebar done";
                badge.innerHTML = " ✓";
                badge.style.color = "var(--color-success)";
                badge.style.fontWeight = "bold";
                badge.style.marginLeft = "auto";
                link.appendChild(badge);
            }
        } else {
            if (badge) {
                badge.remove();
            }
        }
    });

    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const progressBar = document.querySelector(".progress-bar-fill");
    const progressPercentageText = document.querySelector(".progress-percentage");

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    if (progressPercentageText) {
        progressPercentageText.textContent = `${percentage}% Kész`;
    }

    // Update global points counter
    const pointsEl = document.getElementById("points-counter");
    if (pointsEl) {
        pointsEl.textContent = userProgress.points || 0;
    }

    // UPDATE HERO CTA CARD DYNAMICALLY
    const nextLesson = getNextUncompletedLesson(currentLevel);
    const ctaCard = document.querySelector(".resume-cta-card");
    const ctaHeader = document.querySelector(".resume-cta-header");
    const ctaTitle = document.querySelector(".resume-cta-title");
    const ctaBtn = document.getElementById("btn-resume-lesson");
    
    if (ctaCard && ctaHeader && ctaTitle && ctaBtn) {
        if (!nextLesson) {
            // Course completely finished!
            // Retrieve exam score for the last section as a proxy, or total course points
            const lastSection = Object.keys(learningContent[currentLevel] || {}).pop() || "ToBe";
            const examKey = `${currentLevel}_${lastSection}_sectionExam`;
            const examData = learningContent[currentLevel]?.[lastSection]?.subsections?.sectionExam;
            
            let totalQuestions = (examData && examData.items) ? examData.items.length : 0;
            
            // If the exam data hasn't been lazy-loaded yet, fetch it just to calculate the true length
            if (totalQuestions === 0 && examData && examData.dataSource) {
                if (vocabCache[examData.dataSource]) {
                    totalQuestions = vocabCache[examData.dataSource].items ? vocabCache[examData.dataSource].items.length : 0;
                } else {
                    try {
                        const res = await fetch(examData.dataSource + "?v=1.0.7");
                        if (res.ok) {
                            const json = await res.json();
                            vocabCache[examData.dataSource] = json;
                            totalQuestions = json.items ? json.items.length : 0;
                        }
                    } catch(e) {
                        console.error("Could not fetch exam max score length", e);
                    }
                }
            }
            
            const bestScore = userProgress.scores[examKey] || 0;
            const percentage = totalQuestions > 0 ? Math.round((bestScore / totalQuestions) * 100) : 100;
            
            let grade = "";
            if (percentage >= 90) grade = "Kiváló! 🌟";
            else if (percentage >= 70) grade = "Jó munka! 👍";
            else if (percentage >= 50) grade = "Átmentél! 📚";
            
            ctaCard.innerHTML = `
                <div style="text-align: center; width: 100%;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎊</div>
                    <div class="resume-cta-title" style="color: var(--color-accent-in); margin-bottom: 0.5rem;">Gratulálunk!</div>
                    <p style="color: var(--color-text-main); font-size: 1.1rem; line-height: 1.5; margin-bottom: 1rem;">
                        Az <strong>Első Lecke (A "Lenni" Ige)</strong> befejezve!<br>Hamarosan érkezik a következő modul.
                    </p>
                    <div class="exam-result-card passed" style="max-width: 300px; margin: 0 auto; background: var(--color-bg-surface); padding: 1rem; border-radius: 12px; border: 1px solid var(--color-success);">
                        <span class="exam-score" style="display: block; font-size: 2rem; font-weight: bold; color: var(--color-success);">${bestScore} / ${totalQuestions}</span>
                        <span class="exam-percentage" style="display: block; color: var(--color-success);">(${percentage}%)</span>
                        <p class="exam-grade" style="margin-top: 0.5rem;">${grade}</p>
                    </div>
                </div>
            `;
        } else {
            // Check if current view is completed
            const currentKey = `${currentLevel}_${currentSection}_${currentSubsection}`;
            const isCurrentCompleted = userProgress.completed[currentKey];
            
            ctaTitle.textContent = `${currentLevel} - ${nextLesson.title}`;
            
            if (isCurrentCompleted) {
                ctaHeader.textContent = "Következő lecke";
                ctaBtn.innerHTML = `<span>Folytatás</span> <span style="font-size: 1.2rem;">→</span>`;
                ctaBtn.style.opacity = "1";
                ctaBtn.style.pointerEvents = "auto";
                ctaBtn.style.background = "linear-gradient(135deg, var(--color-accent-in), var(--color-accent-on))";
                ctaBtn.style.border = "none";
                ctaBtn.style.color = "#000";
                ctaBtn.setAttribute("data-target", nextLesson.key);
            } else {
                ctaHeader.textContent = "Aktuális lecke";
                ctaBtn.innerHTML = `<span>Fejezd be az aktuális leckét!</span> <span style="font-size: 1.2rem;">🔒</span>`;
                ctaBtn.style.opacity = "0.7";
                ctaBtn.style.pointerEvents = "none";
                ctaBtn.style.background = "var(--color-bg-surface)";
                ctaBtn.style.border = "1px dashed var(--color-text-muted)";
                ctaBtn.style.color = "var(--color-text-muted)";
                ctaBtn.removeAttribute("data-target");
            }
        }
    }
}

// ==========================================================================
// DYNAMIC SIDEBAR RENDERER
// ==========================================================================
function renderSidebar(levelName) {
    const container = document.getElementById("sidebar-lessons-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    const levelData = learningContent[levelName];
    if (!levelData) return;
    
    Object.keys(levelData).forEach(sectionKey => {
        const sectionData = levelData[sectionKey];
        const title = sectionData.title_hu || sectionData.title || `Lecke: ${sectionKey}`;
        
        let subsectionsHtml = "";
        
        if (sectionData.subsections) {
            Object.keys(sectionData.subsections).forEach(subKey => {
                const subData = sectionData.subsections[subKey];
                const isAccessible = isContentAccessible(levelName, sectionKey, subKey);
                
                let linkClass = "subsection-link";
                let iconHtml = subData.icon || "•";
                
                if (!isAccessible) {
                    if (isExam(subData)) {
                        linkClass += " locked";
                        iconHtml = "🔒";
                    } else if (ProgressManager.isGuest) {
                        linkClass += " guest-locked";
                        iconHtml = "🔒";
                    }
                }
                
                if (isExam(subData)) {
                    linkClass += " subsection-exam";
                }
                
                subsectionsHtml += `
                            <li>
                                <a href="#" class="${linkClass}" data-subsection="${subKey}">
                                    <span class="subsection-icon">${iconHtml}</span> ${subData.title}
                                </a>
                            </li>
                `;
            });
        }
        
        const isOpen = sectionKey === currentSection ? "open" : "";
        
        const detailsHtml = `
                    <details class="course-accordion" data-level="${levelName}" data-section="${sectionKey}" ${isOpen}>
                        <summary class="course-accordion-header">
                            <span class="accordion-icon">📘</span>
                            <span class="accordion-title">${title}</span>
                            <span class="accordion-chevron"></span>
                        </summary>
                        <ul class="subsection-list">
${subsectionsHtml}
                        </ul>
                    </details>
        `;
        
        container.insertAdjacentHTML("beforeend", detailsHtml);
    });
    
    initAccordionListeners();
}

// 1. LISTEN TO SIDEBAR ACCORDION SUBSECTION LINKS
function initAccordionListeners() {
    const subsectionLinks = document.querySelectorAll(".subsection-link");

    subsectionLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            if (link.classList.contains("guest-locked")) {
                openPaywallModal();
                return;
            }

            if (link.classList.contains("locked")) {
                openLockedModal();
                return;
            }

            const subsectionKey = link.getAttribute("data-subsection");
            if (!subsectionKey) return;

            // Clear previous active states from all subsection links
            subsectionLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // Extract the correct level and section from the parent accordion
            const accordion = link.closest(".course-accordion");
            if (accordion) {
                currentLevel = accordion.getAttribute("data-level");
                currentSection = accordion.getAttribute("data-section");
            }

            // Update current subsection and render
            currentSubsection = subsectionKey;
            renderSubsection(currentLevel, currentSection, currentSubsection);

            // Close the parent accordion after clicking to keep UI clean
            if (accordion) {
                accordion.open = false;
            }
        });
    });
}

// 1.5. LISTEN TO HERO RESUME CTA BUTTON
function initResumeCTAListener() {
    // We use event delegation because the CTA card might be re-rendered or modified
    document.addEventListener("click", (e) => {
        const resumeBtn = e.target.closest("#btn-resume-lesson");
        if (!resumeBtn) return;
        
        e.preventDefault();
        
        const targetSubKey = resumeBtn.getAttribute("data-target");
        if (!targetSubKey) return; // Blocked state (current lesson not completed), do nothing
        
        const level = currentLevel;
        const section = currentSection;
        
        // Visual sync: open the correct accordion if closed
        const accordion = document.querySelector(`.course-accordion[data-level="${level}"][data-section="${section}"]`);
        if (accordion) accordion.open = true;

        // Update active state in sidebar
        const links = document.querySelectorAll(".subsection-link");
        links.forEach(l => l.classList.remove("active"));
        
        if (accordion) {
            const targetLink = accordion.querySelector(`.subsection-link[data-subsection="${targetSubKey}"]`);
            if (targetLink) targetLink.classList.add("active");
        }
        
        // Render subsection
        currentSubsection = targetSubKey;
        renderSubsection(level, section, targetSubKey);
        
        // Update UI to check locks and next steps immediately
        updateProgressUI();

        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 2. LISTEN TO GLOBAL STATIC TOP NAVBAR LEVEL BUTTONS
function initTopNavbarListeners() {
    // Select our horizontal navbar element links
    const topNavLinks = {
        A1: document.getElementById("nav-a1"),
        A2: document.getElementById("nav-a2"),
        B1: document.getElementById("nav-b1"),
        B2: document.getElementById("nav-b2")
    };

    // Simple loop mapping events over keys
    Object.keys(topNavLinks).forEach(level => {
        const button = topNavLinks[level];
        if (!button) return;

        button.addEventListener("click", (event) => {
            event.preventDefault();

            // Check if the requested level's first course is accessible
            const accessible = isContentAccessible(level, "ToBe");

            if (!accessible) {
                if (ProgressManager.isGuest) {
                    openPaywallModal();
                } else {
                    // Authenticated users get the WIP modal if the content isn't built yet
                    openWipModal();
                }
                return;
            }

            if (level === "A1" || ProgressManager.data.role === "admin") {
                // Trigger live context layout switch without page refreshes
                // Admins can bypass WIP and see the empty layouts for testing
                switchGlobalLevel(level, true); // Start empty when switching levels
            } else if (level === "A2" || level === "B1" || level === "B2") {
                // Since they are allowed, but the content is currently empty, show WIP
                openWipModal();
            }
        });
    });
}

// 3. SEAMLESSLY SWITCH LEVEL DOMAIN WINDOW
function switchGlobalLevel(levelName, startEmpty = false) {
    currentLevel = levelName;
    
    // SMART RESUME LOGIC
    const nextUncompleted = getNextUncompletedLesson(levelName);
    if (nextUncompleted) {
        currentSection = nextUncompleted.section;
        if (!startEmpty) {
            currentSubsection = nextUncompleted.key;
        }
    } else {
        // Fallback to first section if entirely completed
        currentSection = Object.keys(learningContent[levelName] || {})[0] || "ToBe";
        if (!startEmpty) {
            currentSubsection = "explanation";
        }
    }

    // Update active visual status anchors across top header links
    const navbarLinks = document.querySelectorAll(".site-header .nav-link");
    navbarLinks.forEach(link => link.classList.remove("active"));
    
    const targetHeaderLink = document.getElementById(`nav-${levelName.toLowerCase()}`);
    if (targetHeaderLink) targetHeaderLink.classList.add("active");

    // NEW: Dynamically build the sidebar for the target level
    renderSidebar(levelName);

    const subsectionLinks = document.querySelectorAll(".subsection-link");
    subsectionLinks.forEach(l => l.classList.remove("active"));

    if (startEmpty) {
        currentSubsection = null;
        const workspace = document.getElementById("workspace");
        document.querySelector(".current-topic-title").textContent = "Üdvözlünk a Dashboardon!";
        
        // Ensure breadcrumbs reflect the general section without a specific sub-topic
        const breadcrumbs = document.querySelector(".breadcrumb-list");
        if (breadcrumbs) {
            const levelLabel = levelName === "A1" ? "A1 Kezdő" : levelName === "A2" ? "A2 Alapfok" : levelName;
            breadcrumbs.innerHTML = `
                <li>${levelLabel}</li>
                <li aria-current="page">Áttekintés</li>
            `;
        }

        workspace.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👋</div>
                <h2 style="color: var(--color-text-main); margin-bottom: 1rem;">Válassz egy leckét a folytatáshoz!</h2>
                <p style="color: var(--color-text-muted); max-width: 500px; line-height: 1.6;">
                    A bal oldali menüben találod a tananyagokat. Kezdésként kattints a <strong>${ProgressManager.isGuest ? 'Szavak' : 'Magyarázat'}</strong> menüpontra az első modulban.
                </p>
            </div>
        `;
    } else {
        currentSubsection = "explanation";
        const firstLink = document.querySelector('.subsection-link[data-subsection="explanation"]');
        if (firstLink) firstLink.classList.add("active");
        
        // Run core engine to paint the chosen view
        renderSubsection(currentLevel, currentSection, currentSubsection);
    }
    
    updateProgressUI();
}

// 4. CORE SUBSECTION RENDERING MACHINERY
function renderSubsection(level, section, subsection) {
    const workspace = document.getElementById("workspace");
    const moduleData = learningContent[level]?.[section];

    // Synchronize breadcrumbs position trail tracking strip text strings
    const breadcrumbs = document.querySelector(".breadcrumb-list");
    const subsectionData = moduleData?.subsections?.[subsection];
    const subsectionTitle = subsectionData?.title || subsection;

    if (breadcrumbs) {
        const levelLabel = level === "A1" ? "A1 Kezdő" : level === "A2" ? "A2 Alapfok" : level;
        breadcrumbs.innerHTML = `
            <li>${levelLabel}</li>
            <li>A "Lenni" Ige</li>
            <li aria-current="page">${subsectionTitle}</li>
        `;
    }

    if (!moduleData || !subsectionData) {
        document.querySelector(".current-topic-title").textContent = "Tananyag Nem Található";
        workspace.innerHTML = `<p class="error-text" style="color: var(--color-error); padding: 2rem;">Sajnáljuk, ehhez a részhez még nem töltöttek fel feladatokat.</p>`;
        return;
    }

    if (!isContentAccessible(level, section, subsection)) {
        if (ProgressManager.isGuest) {
            openPaywallModal();
            // If they land directly on a blocked page (e.g. via direct load), fallback safely to "words" if it was "explanation"
            if (subsection === "explanation" || subsection === "sectionExam") {
                // To avoid an infinite loop or broken UI state, manually render the "words" section instead
                const safeSubsection = "words";
                const safeData = moduleData?.subsections?.[safeSubsection];
                if (safeData) {
                    currentSubsection = safeSubsection;
                    document.querySelector(".current-topic-title").textContent = `${safeData.icon} ${safeData.title}`;
                    
                    // Sync sidebar active link
                    const links = document.querySelectorAll(".subsection-link");
                    links.forEach(l => l.classList.remove("active"));
                    const accordion = document.querySelector(`.course-accordion[data-level="${level}"][data-section="${section}"]`);
                    if (accordion) {
                        const targetLink = accordion.querySelector(`.subsection-link[data-subsection="${safeSubsection}"]`);
                        if (targetLink) targetLink.classList.add("active");
                    }

                    renderWordsTemplate(workspace, safeData, moduleData);
                }
            }
            return;
        }
    }

    // Reset exercise attempts tracking for the new view
    exerciseAttempts = {};

    // Setup stopwatch and success rate display
    if (isExercise(subsectionData) || isExam(subsectionData)) {
        startStopwatch();
        updateSuccessRateDisplay(true);
    } else {
        stopStopwatch();
        stopwatchSeconds = 0;
        updateStopwatchDisplay();
        updateSuccessRateDisplay(false);
    }

    document.querySelector(".current-topic-title").textContent = `${subsectionData.icon} ${subsectionData.title}`;

    // Render different template based on subsection type
    switch (subsectionData.type) {
        case "explanation":
            renderExplanationTemplate(workspace, subsectionData, moduleData);
            break;
        case "words":
            renderWordsTemplate(workspace, subsectionData, moduleData);
            break;
        case "fill_blanks":
            renderFillBlanksTemplate(workspace, subsectionData);
            break;
        case "word_order":
            renderWordOrderTemplate(workspace, subsectionData);
            break;
        case "true_false":
            renderTrueFalseTemplate(workspace, subsectionData);
            break;
        case "section_exam":
            renderSectionExamTemplate(workspace, subsectionData);
            break;
        default:
            workspace.innerHTML = `<p class="error-text" style="color: var(--color-error); padding: 2rem;">Ismeretlen feladattípus.</p>`;
    }
}

// =====================================================================
//   TEMPLATE RENDERERS — Each creates a section-specific layout
// =====================================================================

// MAGYARÁZAT (Explanation) — Grammar explanation article
function renderExplanationTemplate(workspace, data, moduleData) {
    if (currentSection === "ToBe") {
        workspace.innerHTML = `
            <div class="lesson-view">
                <!-- INTRO SECTION -->
                <article class="explanation-intro">
                    <h2>📚 A Nagy Titok: A "Lenni" Ige (The Verb "TO BE")</h2>
                    <p>Az angolban a legfontosabb szó a <strong>TO BE</strong>, ami azt jelenti: <strong>VAN</strong> (létezik).</p>
                    <p>Magyarul sokszor elhagyjuk (pl. „Én Ladislav <em>vagyok</em>", de „Ő okos" – nem mondjuk, hogy „Ő <em>van</em> okos").</p>

                    <div class="golden-rule">
                        <span class="golden-rule-icon">⚡</span>
                        <div>
                            <p><strong>Aranyszabály:</strong> Az angolban <strong>NEM hagyhatod el a „VAN"-t</strong>. Mindig ki kell mondanod, hogy ki milyen <em>van</em>, vagy hol <em>van</em>.</p>
                        </div>
                    </div>

                    <p>A „TO BE" egy <strong>alakváltó ige</strong>. 3 formája van – úgy képzeld el, mint három testvért, akik szétosztották maguk között a személyeket:</p>

                    <div class="three-brothers">
                        <div class="brothers-title">A három testvér</div>
                        <div class="brothers-chips">
                            <span class="brother-chip brother-am">AM</span>
                            <span class="brother-chip brother-is">IS</span>
                            <span class="brother-chip brother-are">ARE</span>
                        </div>
                    </div>
                    
                    <div class="explanation-image-container" style="margin-top: 2rem; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px oklch(0.12 0.01 260 / 0.5); border: 1px solid oklch(1 0 0 / 0.1);">
                        <img src="assets/images/tobe_verb_visual.png" alt="The Verb 'TO BE' - Simple Present" style="width: 100%; height: auto; display: block; object-fit: contain; cursor: pointer; transition: transform 0.2s ease;" onclick="openLightbox(this.src)" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    </div>
                </article>

                <!-- STEP TABS -->
                <div class="step-tabs">
                    <button class="step-tab active" data-step="1">
                        <span class="step-tab-number">1</span> Kijelentés
                    </button>
                    <button class="step-tab" data-step="2">
                        <span class="step-tab-number">2</span> Tagadás
                    </button>
                    <button class="step-tab" data-step="3">
                        <span class="step-tab-number">3</span> Kérdés
                    </button>
                </div>

                <!-- STEP PANELS -->
                <div class="step-panels">

                    <!-- STEP 1: Kijelentés -->
                    <div class="step-panel active" id="step-1">
                        <h3>✅ A "VAN" (Kijelentés / Affirmative)</h3>
                        <p>Csak össze kell párosítani a szereplőket a megfelelő alakváltó formával. Tanuljátok meg ritmusra!</p>
                        <p class="flip-hint"><span>👆 Kattints a kártyákra a magyar jelentés megjelenítéséhez!</span></p>

                        <div class="flip-cards-grid">
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">I am <span class="contraction">(I'm)</span></div>
                                        <div class="example-sentence">I am a teacher.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Én vagyok</div>
                                        <div class="hu-example">Én tanár vagyok.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">You are <span class="contraction">(You're)</span></div>
                                        <div class="example-sentence">You are happy.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Te vagy</div>
                                        <div class="hu-example">Te boldog vagy.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">He is <span class="contraction">(He's)</span></div>
                                        <div class="example-sentence">He is smart.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ő van (fiú)</div>
                                        <div class="hu-example">Ő okos.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">She is <span class="contraction">(She's)</span></div>
                                        <div class="example-sentence">She is nice.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ő van (lány)</div>
                                        <div class="hu-example">Ő kedves.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">It is <span class="contraction">(It's)</span></div>
                                        <div class="example-sentence">It is a car.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ez/Az van</div>
                                        <div class="hu-example">Ez egy autó.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">We are <span class="contraction">(We're)</span></div>
                                        <div class="example-sentence">We are here.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Mi vagyunk</div>
                                        <div class="hu-example">Mi itt vagyunk.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">They are <span class="contraction">(They're)</span></div>
                                        <div class="example-sentence">They are tired.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ők vannak</div>
                                        <div class="hu-example">Ők fáradtak.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="tip-callout">
                            <span class="tip-callout-icon">💡</span>
                            <p><strong>Tipp:</strong> A való életben a rövidített alakokat fogod hallani (I'm, You're, He's, We're). Próbáld meg te is így kimondani!</p>
                        </div>
                    </div>

                    <!-- STEP 2: Tagadás -->
                    <div class="step-panel" id="step-2">
                        <h3>❌ A "NEM VAN" (Tagadás / Negative)</h3>
                        <p>A tagadás az angolban a legegyszerűbb dolog a világon. Nem kell semmit átrendezni, csak fogni a <span class="not-highlight">NOT</span> (NEM) szócskát, és odarakni a "VAN" mögé.</p>
                        <p class="flip-hint"><span>👆 Kattints a kártyákra a magyar jelentés megjelenítéséhez!</span></p>

                        <div class="flip-cards-grid">
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">I am <span class="not-highlight">not</span></div>
                                        <div class="example-sentence">I am not sad.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Én nem vagyok</div>
                                        <div class="hu-example">Én nem vagyok szomorú.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">You are <span class="not-highlight">not</span> <span class="contraction">(aren't)</span></div>
                                        <div class="example-sentence">You aren't late.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Te nem vagy</div>
                                        <div class="hu-example">Te nem vagy késésben.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">He is <span class="not-highlight">not</span> <span class="contraction">(isn't)</span></div>
                                        <div class="example-sentence">He isn't home.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ő nem van (fiú)</div>
                                        <div class="hu-example">Ő nincs otthon.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">She is <span class="not-highlight">not</span> <span class="contraction">(isn't)</span></div>
                                        <div class="example-sentence">She isn't hungry.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ő nem van (lány)</div>
                                        <div class="hu-example">Ő nem éhes.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">It is <span class="not-highlight">not</span> <span class="contraction">(isn't)</span></div>
                                        <div class="example-sentence">It isn't cold.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Az nem van</div>
                                        <div class="hu-example">Nincs hideg.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">We are <span class="not-highlight">not</span> <span class="contraction">(aren't)</span></div>
                                        <div class="example-sentence">We aren't ready.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Mi nem vagyunk</div>
                                        <div class="hu-example">Mi nem vagyunk készen.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="pronoun-verb">They are <span class="not-highlight">not</span> <span class="contraction">(aren't)</span></div>
                                        <div class="example-sentence">They aren't English.</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="hu-meaning">Ők nem vannak</div>
                                        <div class="hu-example">Ők nem angolok.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: Kérdés -->
                    <div class="step-panel" id="step-3">
                        <h3>❓ A Kérdés (Question) – A Helycsere-trükk</h3>
                        <p>A magyarban a hanglejtéssel kérdezünk („Ő boldog." vs. „Ő boldog?"). Az angolban ez nem elég.</p>
                        <p><strong>A trükk:</strong> Kérdésnél a szereplő (I, you, he...) és a "VAN" (am, is, are) <strong>helyet cserélnek</strong>. A "VAN" előreugrik a mondat elejére, mint egy testőr. 🛡️</p>

                        <div class="question-comparison">
                            <div class="comparison-row" style="animation-delay: 0s">
                                <div class="comparison-card">
                                    <div class="comparison-label">Kijelentés</div>
                                    <div class="comparison-en"><strong>You are</strong> English.</div>
                                    <div class="comparison-hu">Te angol vagy.</div>
                                </div>
                                <span class="comparison-arrow">→</span>
                                <div class="comparison-card question-card">
                                    <div class="comparison-label">Kérdés</div>
                                    <div class="comparison-en"><strong>Are you</strong> English?</div>
                                    <div class="comparison-hu">Angol vagy?</div>
                                </div>
                            </div>
                            <div class="comparison-row" style="animation-delay: 0.1s">
                                <div class="comparison-card">
                                    <div class="comparison-label">Kijelentés</div>
                                    <div class="comparison-en"><strong>He is</strong> a doctor.</div>
                                    <div class="comparison-hu">Ő orvos.</div>
                                </div>
                                <span class="comparison-arrow">→</span>
                                <div class="comparison-card question-card">
                                    <div class="comparison-label">Kérdés</div>
                                    <div class="comparison-en"><strong>Is he</strong> a doctor?</div>
                                    <div class="comparison-hu">Ő orvos?</div>
                                </div>
                            </div>
                            <div class="comparison-row" style="animation-delay: 0.2s">
                                <div class="comparison-card">
                                    <div class="comparison-label">Kijelentés</div>
                                    <div class="comparison-en"><strong>It is</strong> hot.</div>
                                    <div class="comparison-hu">Meleg van.</div>
                                </div>
                                <span class="comparison-arrow">→</span>
                                <div class="comparison-card question-card">
                                    <div class="comparison-label">Kérdés</div>
                                    <div class="comparison-en"><strong>Is it</strong> hot?</div>
                                    <div class="comparison-hu">Meleg van?</div>
                                </div>
                            </div>
                        </div>

                        <div class="tip-callout">
                            <span class="tip-callout-icon">💡</span>
                            <p><strong>Megjegyzés:</strong> Figyeld meg, hogy a „VAN" (is/are/am) mindig előre ugrik a kérdésnél! Ez a „helycsere-trükk" az angol nyelvtan egyik legalapvetőbb szabálya.</p>
                        </div>
                    </div>
                </div>

                <!-- Next Hint -->
                <div class="explanation-next-hint">
                    <p>Ha megértetted a magyarázatot, lépj tovább a <strong>Szavak</strong> szekcióra! →</p>
                </div>
                ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, false)}
            </div>
        `;
        initExplanationTabs();
    } else {
        workspace.innerHTML = `
            <div class="lesson-view">
                <article class="explanation-box explanation-main">
                    <h2>📚 ${moduleData.title}</h2>
                    <div class="explanation-content">
                        <p>${data.content || moduleData.explanation || 'Ehhez a leckéhez hamarosan feltöltjük a magyarázatot.'}</p>
                    </div>
                </article>
                <div class="explanation-next-hint">
                    <p>Ha megértetted a magyarázatot, lépj tovább a <strong>Szavak</strong> szekcióra! →</p>
                </div>
                ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, false)}
            </div>
        `;
    }
}

function initExplanationTabs() {
    document.querySelectorAll('.step-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const stepId = `step-${tab.dataset.step}`;
            const targetPanel = document.getElementById(stepId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// SZAVAK (Words) — Vocabulary table loaded asynchronously from JSON with caching
async function renderWordsTemplate(workspace, data, moduleData) {
    // Show a loading state
    workspace.innerHTML = `
        <div class="empty-state-section" style="min-height: 200px;">
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <h2>Szavak betöltése...</h2>
                <div class="empty-state-pulse"></div>
            </div>
        </div>
    `;

    const source = data.dataSource;
    let items = [];

    if (!source) {
        items = data.items || [];
    } else if (vocabCache[source]) {
        items = vocabCache[source];
    } else {
        try {
            // Append version parameter to bust browser caches for static content updates
            const response = await fetch(source + "?v=1.0.6");
            if (!response.ok) throw new Error("HTTP error " + response.status);
            items = await response.json();
            vocabCache[source] = items;
        } catch (error) {
            console.error("Hiba a szavak betöltésekor:", error);
            workspace.innerHTML = renderEmptyState("Szavak", "Nem sikerült betölteni a szókincset a szerverről. Kérjük, próbáld újra később!");
            return;
        }
    }

    if (items.length === 0) {
        workspace.innerHTML = renderEmptyState("Szavak", "Ehhez a leckéhez hamarosan feltöltjük a szókincset.");
        return;
    }

    let rowsHtml = "";
    items.forEach((item, i) => {
        rowsHtml += `
            <tr class="word-row" style="animation-delay: ${i * 0.05}s">
                <td class="word-en">${item.en}</td>
                <td class="word-hu">${item.hu}</td>
                <td class="word-example"><em>${item.example}</em></td>
            </tr>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <section class="practice-box words-section">
                <h2>📖 Szókincs – Tanuld meg ezeket a szavakat!</h2>
                <div class="words-table-wrapper">
                    <table class="words-table">
                        <thead>
                            <tr>
                                <th>🇬🇧 Angol</th>
                                <th>🇭🇺 Magyar</th>
                                <th>📝 Példamondat</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </section>
            ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, false)}
        </div>
    `;
}

// LYUKAS MONDATOK (Fill in the blanks) — Input fields
async function renderFillBlanksTemplate(workspace, data) {
    const source = data.dataSource;
    if (source && !data.items) {
        if (vocabCache[source]) {
            const cached = vocabCache[source];
            data.items = cached.items || [];
            if (cached.description) data.description = cached.description;
        } else {
            workspace.innerHTML = `
                <div class="empty-state-section" style="min-height: 200px;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <h2>Feladatok betöltése...</h2>
                        <div class="empty-state-pulse"></div>
                    </div>
                </div>
            `;
            try {
                const response = await fetch(source + "?v=1.0.6");
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const fetched = await response.json();
                vocabCache[source] = fetched;
                data.items = fetched.items || [];
                if (fetched.description) data.description = fetched.description;
            } catch (error) {
                console.error("Hiba a feladatok betöltésekor:", error);
                workspace.innerHTML = renderEmptyState("Lyukas mondatok", "Nem sikerült betölteni a feladatokat a szerverről. Kérjük, próbáld újra később!");
                return;
            }
        }
    }

    if (!data.items || data.items.length === 0) {
        workspace.innerHTML = renderEmptyState("Lyukas mondatok", "Ehhez a leckéhez hamarosan feltöltjük a feladatokat.");
        return;
    }

    const answersKey = `${currentLevel}_${currentSection}_${currentSubsection}_answers`;
    const savedAnswers = userProgress.completed[answersKey] || {};

    let questionsHtml = "";
    data.items.forEach((item, i) => {
        const savedAnswer = savedAnswers[i] || "";
        const escapedAnswer = savedAnswer.replace(/"/g, '&quot;');
        
        questionsHtml += `
            <div class="fill-blank-item" data-index="${i}" style="animation-delay: ${i * 0.06}s">
                <p class="fill-blank-sentence">
                    <span class="question-number">${i + 1}.</span>
                    ${item.sentence.replace(/_{3,}/, `<input type="text" class="fill-blank-input" id="fill-input-${i}" placeholder="..." autocomplete="off" value="${escapedAnswer}" oninput="saveExerciseAnswer('${currentLevel}', '${currentSection}', '${currentSubsection}', ${i}, this.value)">`) }
                    <span class="fill-hint">${item.hint}</span>
                </p>
                <div class="fill-blank-actions">
                    <button class="btn btn-check" onclick="checkFillBlank(${i})">Ellenőrzés</button>
                </div>
                <div class="quiz-feedback" id="fill-feedback-${i}"></div>
            </div>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <section class="practice-box">
                <h2>✏️ Lyukas mondatok – Töltsd ki a hiányzó szót!</h2>
                <p class="section-instruction">${data.description || 'Írd be a megfelelő alakját a "to be" igének (am, is, are) a hiányzó helyre.'}</p>
                <div class="fill-blanks-list">${questionsHtml}</div>
            </section>
            ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, true)}
        </div>
    `;
}

// SZÓRENDEZÉS (Word Ordering) — Draggable word chips
async function renderWordOrderTemplate(workspace, data) {
    const source = data.dataSource;
    if (source && !data.items) {
        if (vocabCache[source]) {
            const cached = vocabCache[source];
            data.items = cached.items || [];
            if (cached.description) data.description = cached.description;
        } else {
            workspace.innerHTML = `
                <div class="empty-state-section" style="min-height: 200px;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <h2>Feladatok betöltése...</h2>
                        <div class="empty-state-pulse"></div>
                    </div>
                </div>
            `;
            try {
                const response = await fetch(source + "?v=1.0.6");
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const fetched = await response.json();
                vocabCache[source] = fetched;
                data.items = fetched.items || [];
                if (fetched.description) data.description = fetched.description;
            } catch (error) {
                console.error("Hiba a feladatok betöltésekor:", error);
                workspace.innerHTML = renderEmptyState("Szórendezés", "Nem sikerült betölteni a feladatokat a szerverről. Kérjük, próbáld újra később!");
                return;
            }
        }
    }

    if (!data.items || data.items.length === 0) {
        workspace.innerHTML = renderEmptyState("Szórendezés", "Ehhez a leckéhez hamarosan feltöltjük a feladatokat.");
        return;
    }

    let questionsHtml = "";
    data.items.forEach((item, i) => {
        // Shuffle the scrambled array for display
        const scrambledArray = item.scrambled || [];
        const shuffled = [...scrambledArray].sort(() => Math.random() - 0.5);
        const chipsHtml = shuffled.map(word => 
            `<button class="word-chip" onclick="selectWordChip(this, ${i})">${word}</button>`
        ).join("");

        questionsHtml += `
            <div class="word-order-item" data-index="${i}" style="animation-delay: ${i * 0.06}s">
                <p class="word-order-instruction">
                    <span class="question-number">${i + 1}.</span>
                    Rakd helyes sorrendbe! <span class="fill-hint">${item.hu}</span>
                </p>
                <div class="word-chips-source" id="chips-source-${i}">${chipsHtml}</div>
                <div class="word-order-answer" id="answer-zone-${i}" data-correct="${item.correct}">
                    <span class="answer-placeholder">Kattints a szavakra a helyes sorrendben...</span>
                </div>
                <div class="word-order-actions">
                    <button class="btn btn-check" onclick="checkWordOrder(${i})">Ellenőrzés</button>
                    <button class="btn btn-reset" onclick="resetWordOrder(${i})">Újrakezdés</button>
                </div>
                <div class="quiz-feedback" id="order-feedback-${i}"></div>
            </div>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <section class="practice-box">
                <h2>🔀 Szórendezés – Rakd össze a mondatot!</h2>
                <p class="section-instruction">${data.description || 'Kattints a szavakra a helyes sorrendben, hogy kiadják az angol mondatot.'}</p>
                <div class="word-order-list">${questionsHtml}</div>
            </section>
            ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, true)}
        </div>
    `;

    // Restore word order saved state
    setTimeout(() => {
        const answersKey = `${currentLevel}_${currentSection}_${currentSubsection}_answers`;
        const savedAnswers = userProgress.completed[answersKey] || {};
        
        data.items.forEach((item, i) => {
            const savedStr = savedAnswers[i];
            if (savedStr) {
                try {
                    const savedWords = JSON.parse(savedStr);
                    savedWords.forEach(word => {
                        const sourceZone = document.getElementById(`chips-source-${i}`);
                        if (!sourceZone) return;
                        const chips = sourceZone.querySelectorAll(".word-chip:not(.used)");
                        for (let chip of chips) {
                            if (chip.textContent === word) {
                                selectWordChip(chip, i);
                                break;
                            }
                        }
                    });
                } catch(e) {
                    console.warn("Failed to parse saved word order", e);
                }
            }
        });
    }, 50);
}

// IGAZ VAGY HAMIS (True or False) — Two-button quiz
async function renderTrueFalseTemplate(workspace, data) {
    const source = data.dataSource;
    if (source && !data.items) {
        if (vocabCache[source]) {
            const cached = vocabCache[source];
            data.items = cached.items || [];
            if (cached.description) data.description = cached.description;
        } else {
            workspace.innerHTML = `
                <div class="empty-state-section" style="min-height: 200px;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <h2>Feladatok betöltése...</h2>
                        <div class="empty-state-pulse"></div>
                    </div>
                </div>
            `;
            try {
                const response = await fetch(source + "?v=1.0.6");
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const fetched = await response.json();
                vocabCache[source] = fetched;
                data.items = fetched.items || [];
                if (fetched.description) data.description = fetched.description;
            } catch (error) {
                console.error("Hiba a feladatok betöltésekor:", error);
                workspace.innerHTML = renderEmptyState("Igaz vagy Hamis", "Nem sikerült betölteni a feladatokat a szerverről. Kérjük, próbáld újra később!");
                return;
            }
        }
    }

    if (!data.items || data.items.length === 0) {
        workspace.innerHTML = renderEmptyState("Igaz vagy Hamis", "Ehhez a leckéhez hamarosan feltöltjük a feladatokat.");
        return;
    }

    let quizHtml = "";
    data.items.forEach((item, i) => {
        quizHtml += `
            <div class="quiz-item" data-index="${i}" style="animation-delay: ${i * 0.06}s">
                <p class="quiz-question"><span class="question-number">${i + 1}.</span> ${item.question}</p>
                <div class="quiz-buttons">
                    <button class="btn btn-tf btn-true" onclick="checkTrueFalse(${i}, true)">
                        <span class="tf-icon">✓</span> IGAZ
                    </button>
                    <button class="btn btn-tf btn-false" onclick="checkTrueFalse(${i}, false)">
                        <span class="tf-icon">✗</span> HAMIS
                    </button>
                </div>
                <div class="quiz-feedback" id="tf-feedback-${i}"></div>
            </div>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <section class="practice-box">
                <h2>✅ Igaz vagy Hamis – Döntsd el!</h2>
                <p class="section-instruction">${data.description || 'Olvasd el az állítást, és döntsd el, hogy igaz vagy hamis!'}</p>
                <div class="quiz-list">${quizHtml}</div>
            </section>
            ${getCompleteButtonHtml(currentLevel, currentSection, currentSubsection, true)}
        </div>
    `;

    // Restore true/false saved state
    setTimeout(() => {
        const answersKey = `${currentLevel}_${currentSection}_${currentSubsection}_answers`;
        const savedAnswers = userProgress.completed[answersKey] || {};
        
        data.items.forEach((item, i) => {
            if (savedAnswers[i] !== undefined) {
                checkTrueFalse(i, savedAnswers[i]);
            }
        });
    }, 50);
}

// FEJEZET VIZSGA (Section Exam) — Mixed question types
async function renderSectionExamTemplate(workspace, data) {
    const source = data.dataSource;
    if (source && !data.items) {
        if (vocabCache[source]) {
            const cached = vocabCache[source];
            data.items = cached.items || [];
            if (cached.description) data.description = cached.description;
        } else {
            workspace.innerHTML = `
                <div class="empty-state-section" style="min-height: 200px;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <h2>Vizsga betöltése...</h2>
                        <div class="empty-state-pulse"></div>
                    </div>
                </div>
            `;
            try {
                const response = await fetch(source + "?v=1.0.6");
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const fetched = await response.json();
                vocabCache[source] = fetched;
                data.items = fetched.items || [];
                if (fetched.description) data.description = fetched.description;
            } catch (error) {
                console.error("Hiba a vizsga betöltésekor:", error);
                workspace.innerHTML = renderEmptyState("Fejezet vizsga", "Nem sikerült betölteni a vizsgát a szerverről. Kérjük, próbáld újra később!");
                return;
            }
        }
    }

    if (!data.items || data.items.length === 0) {
        workspace.innerHTML = renderEmptyState("Fejezet vizsga", "A vizsga hamarosan elérhető lesz. Addig gyakorolj a többi feladattal!");
        return;
    }

    const lockedKey = `${currentLevel}_${currentSection}_${currentSubsection}_locked`;
    const isLocked = userProgress.completed[lockedKey] || false;
    const disabledAttr = isLocked ? "disabled" : "";

    const answersKey = `${currentLevel}_${currentSection}_${currentSubsection}_answers`;
    const savedAnswers = userProgress.completed[answersKey] || {};

    let questionsHtml = "";
    data.items.forEach((item, i) => {
        let questionContentHtml = "";
        const savedAnswer = savedAnswers[i];

        if (item.type === "fill") {
            const escapedAnswer = savedAnswer ? savedAnswer.replace(/"/g, '&quot;') : "";
            questionContentHtml = `
                <p class="exam-question"><span class="question-number">${i + 1}.</span> ${item.question.replace(/_{3,}/, `<input type="text" class="fill-blank-input exam-input" id="exam-input-${i}" placeholder="..." autocomplete="off" value="${escapedAnswer}" oninput="saveExerciseAnswer('${currentLevel}', '${currentSection}', '${currentSubsection}', ${i}, this.value)" ${disabledAttr}>`)}</p>
            `;
        } else if (item.type === "tf") {
            questionContentHtml = `
                <p class="exam-question"><span class="question-number">${i + 1}.</span> ${item.question}</p>
                <div class="quiz-buttons">
                    <button class="btn btn-tf btn-true" onclick="checkExamTF(${i}, true)" ${disabledAttr}>
                        <span class="tf-icon">✓</span> IGAZ
                    </button>
                    <button class="btn btn-tf btn-false" onclick="checkExamTF(${i}, false)" ${disabledAttr}>
                        <span class="tf-icon">✗</span> HAMIS
                    </button>
                </div>
            `;
        } else if (item.type === "order") {
            const scrambledArray = item.scrambled || [];
            const shuffled = [...scrambledArray].sort(() => Math.random() - 0.5);
            const chipsHtml = shuffled.map(word =>
                `<button class="word-chip" onclick="selectWordChip(this, ${i}, true)" ${disabledAttr}>${word}</button>`
            ).join("");
            questionContentHtml = `
                <p class="exam-question"><span class="question-number">${i + 1}.</span> ${item.question}</p>
                <div class="word-chips-source" id="chips-source-${i}">${chipsHtml}</div>
                <div class="word-order-answer" id="answer-zone-${i}" data-correct="${item.correct}">
                    <span class="answer-placeholder">Kattints a szavakra...</span>
                </div>
            `;
        }

        questionsHtml += `
            <div class="exam-item" data-index="${i}" data-type="${item.type}" style="animation-delay: ${i * 0.04}s">
                ${questionContentHtml}
                <div class="quiz-feedback" id="exam-feedback-${i}"></div>
            </div>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <section class="practice-box exam-section">
                <div class="exam-header">
                    <h2>🏆 Fejezet vizsga</h2>
                    <p class="section-instruction">${data.description || 'Ez a fejezet összefoglaló vizsgája. Válaszolj az összes kérdésre, majd nyomj az értékelésre!'}</p>
                </div>
                <div class="exam-list">${questionsHtml}</div>
                <div class="exam-footer">
                    ${isLocked 
                        ? `<button class="btn btn-reset" onclick="retakeExam()">🔄 Újraírás (Retake Exam)</button>`
                        : `<button class="btn btn-submit-exam" onclick="gradeExam()">📋 Vizsga értékelése</button>`
                    }
                    <div class="exam-result" id="exam-result"></div>
                </div>
            </section>
        </div>
    `;

    // Restore Exam UI state
    setTimeout(() => {
        data.items.forEach((item, i) => {
            const savedAns = savedAnswers[i];
            if (savedAns !== undefined) {
                if (item.type === "tf") {
                    const container = document.querySelector(`.exam-item[data-index="${i}"] .quiz-buttons`);
                    if (container) {
                        const btnTrue = container.querySelector(".btn-true");
                        const btnFalse = container.querySelector(".btn-false");
                        if (savedAns === true) {
                            btnTrue.classList.add("selected");
                        } else {
                            btnFalse.classList.add("selected");
                        }
                    }
                } else if (item.type === "order") {
                    try {
                        const savedWords = JSON.parse(savedAns);
                        savedWords.forEach(word => {
                            const sourceZone = document.getElementById(`chips-source-${i}`);
                            if (!sourceZone) return;
                            const chips = sourceZone.querySelectorAll(".word-chip:not(.used)");
                            for (let chip of chips) {
                                if (chip.textContent === word) {
                                    selectWordChip(chip, i, true);
                                    break;
                                }
                            }
                        });
                    } catch(e) {}
                }
            }
        });

        if (isLocked) {
            const scoreKey = `${currentLevel}_${currentSection}_${currentSubsection}`;
            const savedScore = userProgress.scores[scoreKey] || 0;
            const resultDiv = document.getElementById("exam-result");
            resultDiv.innerHTML = `Eredmény: ${savedScore} / ${data.items.length}`;
            resultDiv.style.display = "block";
            resultDiv.className = "exam-result correct";
            
            // Ensure placed word chips are disabled
            document.querySelectorAll(".exam-item .word-chip.placed").forEach(chip => {
                chip.style.pointerEvents = "none";
            });
        }
    }, 50);
}

// Renders an empty/placeholder state for sections without data
function renderEmptyState(title, message) {
    return `
        <div class="lesson-view">
            <section class="practice-box empty-state-section">
                <div class="empty-state">
                    <div class="empty-state-icon">🚧</div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <div class="empty-state-pulse"></div>
                </div>
            </section>
        </div>
    `;
}

// =====================================================================
//   ANSWER CHECKING FUNCTIONS
// =====================================================================

// Fill in the blanks checker
function checkFillBlank(index) {
    const data = learningContent[currentLevel][currentSection].subsections.fillBlanks;
    const item = data.items[index];
    const correctAnswer = item.answer;
    const input = document.getElementById(`fill-input-${index}`);
    const feedback = document.getElementById(`fill-feedback-${index}`);
    const userAnswer = input.value.trim().toLowerCase();

    // Support multiple options split by '/' (e.g. "isn't/is not")
    const possibleAnswers = correctAnswer.toLowerCase().split("/").map(ans => ans.trim());

    let isCorrect = false;
    if (possibleAnswers.includes(userAnswer)) {
        feedback.innerHTML = `✓ Helyes válasz! Ügyes vagy!`;
        feedback.className = "quiz-feedback correct";
        input.classList.add("input-correct");
        input.classList.remove("input-incorrect");
        isCorrect = true;
    } else {
        const displayAnswer = correctAnswer.replace(/\//g, " / ");
        feedback.innerHTML = `✗ Nem jó. A helyes válasz: <strong>${displayAnswer}</strong>`;
        feedback.className = "quiz-feedback incorrect";
        input.classList.add("input-incorrect");
        input.classList.remove("input-correct");
    }
    
    exerciseAttempts[index] = isCorrect;
    updateSuccessRateDisplay(true);

    const completeBtn = document.querySelector(".btn-complete-section");
    const totalQuestions = data.items.length;
    if (completeBtn && Object.keys(exerciseAttempts).length === totalQuestions) {
        completeBtn.disabled = false;
    }
}

// True/False checker
function checkTrueFalse(index, studentAnswer) {
    const data = learningContent[currentLevel][currentSection].subsections.trueFalse;
    const item = data.items[index];
    const feedback = document.getElementById(`tf-feedback-${index}`);
    
    const container = document.querySelector(`.quiz-item[data-index="${index}"] .quiz-buttons`);
    if (container) {
        const btnTrue = container.querySelector(".btn-true");
        const btnFalse = container.querySelector(".btn-false");
        if (studentAnswer === true) {
            btnTrue.classList.add("selected");
            btnFalse.classList.remove("selected");
        } else {
            btnFalse.classList.add("selected");
            btnTrue.classList.remove("selected");
        }
    }

    saveExerciseAnswer(currentLevel, currentSection, currentSubsection, index, studentAnswer);

    const isCorrect = (studentAnswer === item.answer);
    if (isCorrect) {
        feedback.innerHTML = `✓ ${item.explanation}`;
        feedback.className = "quiz-feedback correct";
    } else {
        feedback.innerHTML = `✗ ${item.explanation}`;
        feedback.className = "quiz-feedback incorrect";
    }
    
    exerciseAttempts[index] = isCorrect;
    updateSuccessRateDisplay(true);

    const completeBtn = document.querySelector(".btn-complete-section");
    const totalQuestions = data.items.length;
    if (completeBtn && Object.keys(exerciseAttempts).length === totalQuestions) {
        completeBtn.disabled = false;
    }
}

// Word Order — select chips to build sentence
function selectWordChip(chipEl, questionIndex, isExam = false) {
    const answerZone = document.getElementById(`answer-zone-${questionIndex}`);
    
    // Remove placeholder text if present
    const placeholder = answerZone.querySelector(".answer-placeholder");
    if (placeholder) placeholder.remove();

    // Move chip to answer zone
    const clone = chipEl.cloneNode(true);
    clone.classList.add("placed");
    clone.onclick = function() {
        // Click to remove from answer zone and restore to source
        clone.remove();
        chipEl.style.display = "";
        chipEl.disabled = false;
        chipEl.classList.remove("used");

        // If answer zone is empty, add placeholder back
        if (answerZone.children.length === 0) {
            answerZone.innerHTML = `<span class="answer-placeholder">Kattints a szavakra a helyes sorrendben...</span>`;
        }
        saveWordOrderState(questionIndex);
    };
    answerZone.appendChild(clone);

    // Visually disable original chip
    chipEl.classList.add("used");
    chipEl.disabled = true;
    saveWordOrderState(questionIndex);
}

// Helper to save word order state dynamically
function saveWordOrderState(index) {
    const answerZone = document.getElementById(`answer-zone-${index}`);
    if (!answerZone) return;
    const placedChips = answerZone.querySelectorAll(".word-chip.placed");
    const words = Array.from(placedChips).map(c => c.textContent);
    saveExerciseAnswer(currentLevel, currentSection, currentSubsection, index, JSON.stringify(words));
}

// Check word order correctness
function checkWordOrder(index) {
    const data = learningContent[currentLevel][currentSection].subsections.wordOrder;
    const answerZone = document.getElementById(`answer-zone-${index}`);
    const feedback = document.getElementById(`order-feedback-${index}`);
    const correctAnswer = answerZone.getAttribute("data-correct");

    const placedChips = answerZone.querySelectorAll(".word-chip.placed");
    const userAnswer = Array.from(placedChips).map(c => c.textContent).join(" ");

    // Normalize both user input and correct answer (remove trailing punctuation & collapse whitespace)
    const cleanUser = userAnswer.toLowerCase().replace(/[.?!,]/g, "").replace(/\s+/g, " ").trim();
    const cleanCorrect = correctAnswer.toLowerCase().replace(/[.?!,]/g, "").replace(/\s+/g, " ").trim();

    let isCorrect = false;
    if (cleanUser === cleanCorrect) {
        feedback.innerHTML = `✓ Helyes! A mondat: "${correctAnswer}"`;
        feedback.className = "quiz-feedback correct";
        isCorrect = true;
    } else {
        feedback.innerHTML = `✗ Nem jó. A helyes sorrend: "${correctAnswer}"`;
        feedback.className = "quiz-feedback incorrect";
    }
    
    exerciseAttempts[index] = isCorrect;
    updateSuccessRateDisplay(true);

    const completeBtn = document.querySelector(".btn-complete-section");
    const totalQuestions = data.items.length;
    if (completeBtn && Object.keys(exerciseAttempts).length === totalQuestions) {
        completeBtn.disabled = false;
    }
}

// Reset word order question
function resetWordOrder(index) {
    const source = document.getElementById(`chips-source-${index}`);
    const answerZone = document.getElementById(`answer-zone-${index}`);
    const feedback = document.getElementById(`order-feedback-${index}`);

    // Re-enable all source chips
    source.querySelectorAll(".word-chip").forEach(chip => {
        chip.classList.remove("used");
        chip.disabled = false;
        chip.style.display = "";
    });

    // Clear answer zone
    answerZone.innerHTML = `<span class="answer-placeholder">Kattints a szavakra a helyes sorrendben...</span>`;
    feedback.className = "quiz-feedback";
    feedback.innerHTML = "";
}

// Exam T/F selection handler (does not grade immediately)
function checkExamTF(index, studentAnswer) {
    const container = document.querySelector(`.exam-item[data-index="${index}"] .quiz-buttons`);
    if (container) {
        container.setAttribute("data-user-answer", studentAnswer);
        
        // Highlight active button selection
        const btnTrue = container.querySelector(".btn-true");
        const btnFalse = container.querySelector(".btn-false");
        
        if (studentAnswer === true) {
            btnTrue.classList.add("selected");
            btnFalse.classList.remove("selected");
        } else {
            btnFalse.classList.add("selected");
            btnTrue.classList.remove("selected");
        }
    }
}

// Grade the full exam
function gradeExam() {
    const data = learningContent[currentLevel][currentSection].subsections.sectionExam;
    let correct = 0;
    let total = data.items.length;

    // Stop stopwatch timer
    stopStopwatch();

    data.items.forEach((item, i) => {
        const feedback = document.getElementById(`exam-feedback-${i}`);

        if (item.type === "fill") {
            const input = document.getElementById(`exam-input-${i}`);
            const userAnswer = input ? input.value.trim().toLowerCase() : "";
            const possibleAnswers = item.answer.toLowerCase().split("/").map(ans => ans.trim());

            if (possibleAnswers.includes(userAnswer)) {
                correct++;
                feedback.innerHTML = `✓ Helyes!`;
                feedback.className = "quiz-feedback correct";
                if (input) { input.classList.add("input-correct"); input.classList.remove("input-incorrect"); }
            } else {
                const displayAnswer = item.answer.replace(/\//g, " / ");
                feedback.innerHTML = `✗ A helyes válasz: <strong>${displayAnswer}</strong>`;
                feedback.className = "quiz-feedback incorrect";
                if (input) { input.classList.add("input-incorrect"); input.classList.remove("input-correct"); }
            }
        } else if (item.type === "tf") {
            const container = document.querySelector(`.exam-item[data-index="${i}"] .quiz-buttons`);
            const userAnswerStr = container ? container.getAttribute("data-user-answer") : "";
            const userAnswer = userAnswerStr === "true" ? true : userAnswerStr === "false" ? false : null;

            if (userAnswer === item.answer) {
                correct++;
                feedback.innerHTML = `✓ Helyes! ${item.explanation || ""}`;
                feedback.className = "quiz-feedback correct";
            } else {
                const displayCorrect = item.answer ? "IGAZ" : "HAMIS";
                feedback.innerHTML = `✗ Helytelen! A helyes válasz: <strong>${displayCorrect}</strong>. ${item.explanation || ""}`;
                feedback.className = "quiz-feedback incorrect";
            }
        } else if (item.type === "order") {
            const answerZone = document.getElementById(`answer-zone-${i}`);
            const correctAnswer = answerZone?.getAttribute("data-correct") || "";
            const placedChips = answerZone?.querySelectorAll(".word-chip.placed") || [];
            const userAnswer = Array.from(placedChips).map(c => c.textContent).join(" ");

            // Normalize both user input and correct answer (remove trailing punctuation & collapse whitespace)
            const cleanUser = userAnswer.toLowerCase().replace(/[.?!,]/g, "").replace(/\s+/g, " ").trim();
            const cleanCorrect = correctAnswer.toLowerCase().replace(/[.?!,]/g, "").replace(/\s+/g, " ").trim();

            if (cleanUser === cleanCorrect) {
                correct++;
                feedback.innerHTML = `✓ Helyes!`;
                feedback.className = "quiz-feedback correct";
            } else {
                feedback.innerHTML = `✗ A helyes sorrend: "${correctAnswer}"`;
                feedback.className = "quiz-feedback incorrect";
            }
        }
    });

    const percentage = Math.round((correct / total) * 100);
    const resultEl = document.getElementById("exam-result");
    
    let grade = "";
    if (percentage >= 90) grade = "Kiváló! 🌟";
    else if (percentage >= 70) grade = "Jó munka! 👍";
    else if (percentage >= 50) grade = "Átment, de gyakorolj tovább! 📚";
    else grade = "Sajnos nem sikerült. Próbáld újra! 💪";

    // Show result locally below the exam questions
    resultEl.innerHTML = `
        <div class="exam-result-card ${percentage >= 50 ? 'passed' : 'failed'}">
            <span class="exam-score">${correct} / ${total}</span>
            <span class="exam-percentage">(${percentage}%)</span>
            <p class="exam-grade">${grade}</p>
        </div>
    `;

    // Update the success rate metric in the header
    const successRateDisplay = document.getElementById("success-rate-display");
    if (successRateDisplay) {
        successRateDisplay.textContent = `${percentage}%`;
    }

    // Award points dynamically on exam grading
    const examKey = `${currentLevel}_${currentSection}_sectionExam`;
    if (percentage >= 50) {
        userProgress.completed[examKey] = true;
        
        const previousBest = userProgress.scores[examKey] || 0;
        if (correct > previousBest) {
            const diff = correct - previousBest;
            userProgress.points = (userProgress.points || 0) + diff;
            userProgress.scores[examKey] = correct;
            
            // Trigger floating points animation on the results card
            const resultCard = resultEl.querySelector(".exam-result-card");
            if (resultCard) {
                const pop = document.createElement("div");
                pop.className = "floating-points-pop";
                pop.style.top = "20px";
                pop.textContent = `+${diff} Pont! 🎉`;
                resultCard.appendChild(pop);
                setTimeout(() => pop.remove(), 1200);
            }
        }
        
        saveUserProgress(); // This triggers updateProgressUI which updates the CTA Hero
        
        // Scroll to the top of the page smoothly to show the Hero CTA congratulation message
        // Scroll to the top of the page smoothly to show the Hero CTA congratulation message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        saveUserProgress();
    }

    // Lock the exam after grading
    const lockedKey = `${currentLevel}_${currentSection}_sectionExam_locked`;
    userProgress.completed[lockedKey] = true;
    saveUserProgress();

    // Re-render the exam UI so the lock visually applies and inputs disable
    setTimeout(() => {
        const workspace = document.querySelector(".workspace-content");
        renderSectionExamTemplate(workspace, data);
    }, 1500); // Wait a brief moment to let them see the initial feedback popups before freezing
}

// Retake Exam Handler
function retakeExam() {
    const lockedKey = `${currentLevel}_${currentSection}_sectionExam_locked`;
    const answersKey = `${currentLevel}_${currentSection}_sectionExam_answers`;
    
    userProgress.completed[lockedKey] = false;
    userProgress.completed[answersKey] = {};
    saveUserProgress();
    
    // Re-render the exam UI to unlock inputs
    const workspace = document.querySelector(".workspace-content");
    const data = learningContent[currentLevel][currentSection].subsections.sectionExam;
    renderSectionExamTemplate(workspace, data);
}

// =====================================================================
//   LEGACY COMPATIBILITY — Old checkAnswer for backward compat
// =====================================================================
function checkAnswer(level, section, quizIndex, studentAnswer) {
    checkTrueFalse(quizIndex, studentAnswer);
}

// 5. MODAL SYSTEM STATE CONTROLLERS
function initModalListeners() {
    const wipModal = document.getElementById("wip-modal");
    const closeWipBtn = document.getElementById("close-wip-btn");

    if (closeWipBtn && wipModal) {
        closeWipBtn.addEventListener("click", closeWipModal);
    }

    const lockedModal = document.getElementById("locked-modal");
    const closeLockedBtn = document.getElementById("close-locked-btn");

    if (closeLockedBtn && lockedModal) {
        closeLockedBtn.addEventListener("click", closeLockedModal);
    }

    const paywallModal = document.getElementById("paywall-modal");
    const closePaywallBtn = document.getElementById("close-paywall-btn");
    const paywallRegisterBtn = document.getElementById("btn-paywall-register");

    if (closePaywallBtn && paywallModal) {
        closePaywallBtn.addEventListener("click", closePaywallModal);
    }

    if (paywallRegisterBtn) {
        paywallRegisterBtn.addEventListener("click", () => {
            // Reusing the same flow as the guest profile registration button
            localStorage.setItem("forceRegisterModal", "true");
            window.location.href = "index.html";
        });
    }
}

function openWipModal() {
    const wipModal = document.getElementById("wip-modal");
    if (wipModal) {
        wipModal.classList.add("is-active");
        wipModal.setAttribute("aria-hidden", "false");
    }
}

function closeWipModal() {
    const wipModal = document.getElementById("wip-modal");
    if (wipModal) {
        wipModal.classList.remove("is-active");
        wipModal.setAttribute("aria-hidden", "true");
    }
}

function openLockedModal() {
    const lockedModal = document.getElementById("locked-modal");
    if (lockedModal) {
        lockedModal.classList.add("is-active");
        lockedModal.setAttribute("aria-hidden", "false");
    }
}

function closeLockedModal() {
    const lockedModal = document.getElementById("locked-modal");
    if (lockedModal) {
        lockedModal.classList.remove("is-active");
        lockedModal.setAttribute("aria-hidden", "true");
    }
}

function openPaywallModal() {
    const paywallModal = document.getElementById("paywall-modal");
    if (paywallModal) {
        paywallModal.classList.add("is-active");
        paywallModal.setAttribute("aria-hidden", "false");
    }
}

function closePaywallModal() {
    const paywallModal = document.getElementById("paywall-modal");
    if (paywallModal) {
        paywallModal.classList.remove("is-active");
        paywallModal.setAttribute("aria-hidden", "true");
    }
}

// =====================================================================
//   USER PROFILE & PASSWORD MANAGEMENT
// =====================================================================

function initProfileListeners() {
    const profileBtn = document.getElementById("user-profile-btn");
    const closeProfileBtn = document.getElementById("close-profile-btn");
    const profileModal = document.getElementById("profile-modal");
    const passwordForm = document.getElementById("password-change-form");

    if (profileBtn) {
        profileBtn.addEventListener("click", () => {
            openProfileModal();
        });
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener("click", () => {
            closeProfileModal();
        });
    }

    // Handle Password Change Form Submit
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handlePasswordChange();
        });
    }

    // Handle Guest Data Clear
    const btnClearGuest = document.getElementById("btn-clear-guest-data");
    if (btnClearGuest) {
        btnClearGuest.addEventListener("click", () => {
            if (confirm("Biztosan törölni szeretnéd az eddigi haladásodat? Ez a művelet nem vonható vissza.")) {
                ProgressManager.clearGuestData();
            }
        });
    }

    // Handle Guest Register Redirect
    const btnGuestRegister = document.getElementById("btn-guest-register");
    if (btnGuestRegister) {
        btnGuestRegister.addEventListener("click", () => {
            // Set flag so landing.js opens register modal
            localStorage.setItem("forceRegisterModal", "true");
            window.location.href = "index.html";
        });
    }
}

async function openProfileModal() {
    const profileModal = document.getElementById("profile-modal");
    if (!profileModal) return;

    // Reset password form fields and messages
    const passwordForm = document.getElementById("password-change-form");
    if (passwordForm) passwordForm.reset();
    document.getElementById("password-error-msg").textContent = "";
    document.getElementById("password-success-msg").textContent = "";

    // 1. Render Account Info
    const usernameDisplay = document.getElementById("profile-username-display");
    const emailDisplay = document.getElementById("profile-email-display");
    const subDisplay = document.getElementById("profile-subscription-display");
    
    if (usernameDisplay) usernameDisplay.textContent = userProgress.username;
    
    if (subDisplay) {
        const tier = userProgress.subscription_tier || "free";
        const role = userProgress.role || "user";
        
        if (role === "admin") {
            subDisplay.textContent = "Örökös Prémium (Admin)";
            subDisplay.style.background = "oklch(0.65 0.2 25 / 0.15)";
            subDisplay.style.color = "var(--color-accent-in)";
            subDisplay.style.border = "1px solid var(--color-accent-in)";
        } else if (tier === "lifetime") {
            subDisplay.textContent = "Örökös Prémium";
            subDisplay.style.background = "oklch(0.65 0.2 25 / 0.15)";
            subDisplay.style.color = "var(--color-accent-in)";
            subDisplay.style.border = "1px solid var(--color-accent-in)";
        } else {
            subDisplay.textContent = "Ingyenes Béta";
            subDisplay.style.background = "oklch(0.6 0.05 250 / 0.15)";
            subDisplay.style.color = "var(--color-text-muted)";
            subDisplay.style.border = "1px solid oklch(0.6 0.05 250 / 0.3)";
        }
    }
    
    let isGuest = ProgressManager.isGuest;
    if (!isGuest) {
        if (emailDisplay) {
            emailDisplay.innerHTML = `${userProgress.email || ""} <span style="color: var(--color-success); font-size: 0.85rem; font-weight: 600; margin-left: 0.5rem;">(✓ Hitelesítve)</span>`;
        }
    } else {
        if (emailDisplay) emailDisplay.textContent = "Nincs (Vendég fiók)";
        if (subDisplay) {
            subDisplay.textContent = "Vendég Limitált";
            subDisplay.style.background = "transparent";
            subDisplay.style.color = "var(--color-text-muted)";
            subDisplay.style.border = "1px solid var(--color-text-muted)";
        }
    }

    // 1.5. Manage Guest Password Form State
    const currentPassInput = document.getElementById("current-password");
    const newPassInput = document.getElementById("new-password");
    const repeatPassInput = document.getElementById("repeat-password");
    const btnChangePass = document.getElementById("btn-change-password");
    const errorMsg = document.getElementById("password-error-msg");
    const guestDataContainer = document.getElementById("guest-data-clear-container");
    const guestRegPrompt = document.getElementById("guest-registration-prompt");

    if (isGuest) {
        if (currentPassInput) { currentPassInput.disabled = true; currentPassInput.style.cursor = "not-allowed"; }
        if (newPassInput) { newPassInput.disabled = true; newPassInput.style.cursor = "not-allowed"; }
        if (repeatPassInput) { repeatPassInput.disabled = true; repeatPassInput.style.cursor = "not-allowed"; }
        if (btnChangePass) { btnChangePass.disabled = true; btnChangePass.style.cursor = "not-allowed"; btnChangePass.style.opacity = "0.5"; }
        if (errorMsg) {
            errorMsg.textContent = "Vendégként ez a funkció nem elérhető.";
            errorMsg.style.color = "var(--color-text-muted)";
        }
        if (guestDataContainer) guestDataContainer.style.display = "block";
        if (guestRegPrompt) guestRegPrompt.style.display = "block";
    } else {
        if (currentPassInput) { currentPassInput.disabled = false; currentPassInput.style.cursor = "text"; }
        if (newPassInput) { newPassInput.disabled = false; newPassInput.style.cursor = "text"; }
        if (repeatPassInput) { repeatPassInput.disabled = false; repeatPassInput.style.cursor = "text"; }
        if (btnChangePass) { btnChangePass.disabled = false; btnChangePass.style.cursor = "pointer"; btnChangePass.style.opacity = "1"; }
        if (errorMsg) {
            errorMsg.style.color = "var(--color-error)"; // Restore original color
        }
        if (guestDataContainer) guestDataContainer.style.display = "none";
        if (guestRegPrompt) guestRegPrompt.style.display = "none";
    }

    // 2. Render Statistics
    renderProfileStatistics();

    // 3. Show Modal
    profileModal.classList.add("is-active");
    profileModal.setAttribute("aria-hidden", "false");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profile-modal");
    if (profileModal) {
        profileModal.classList.remove("is-active");
        profileModal.setAttribute("aria-hidden", "true");
    }
}

function renderProfileStatistics() {
    // A. Started Courses (Look through completed keys)
    const startedLevels = new Set();
    if (userProgress.completed) {
        for (const key in userProgress.completed) {
            if (userProgress.completed[key]) {
                const levelStr = key.split('_')[0]; // e.g. A1, A2
                startedLevels.add(levelStr);
            }
        }
    }

    const startedCoursesContainer = document.getElementById("profile-started-courses");
    if (startedCoursesContainer) {
        if (startedLevels.size === 0) {
            startedCoursesContainer.innerHTML = `<p class="empty-state-text">Még nem kezdtél el tanfolyamot.</p>`;
        } else {
            let html = "";
            const levelNames = {
                "A1": "A1 Kezdő",
                "A2": "A2 Alapfok",
                "B1": "B1 Középfok",
                "B2": "B2 Haladó"
            };
            
            startedLevels.forEach(level => {
                // Determine percentage roughly based on DOM progress bar or simple check
                // For a more precise check, we could duplicate the updateProgressUI logic per level.
                // Since this is a simple dashboard, we will just say "Folyamatban" (In Progress).
                html += `
                    <div class="course-progress-item">
                        <span>${levelNames[level] || level}</span>
                        <span style="color: var(--color-accent-in);">Folyamatban</span>
                    </div>
                `;
            });
            startedCoursesContainer.innerHTML = html;
        }
    }

    // B. Average Time
    const avgTimeDisplay = document.getElementById("profile-avg-time");
    if (avgTimeDisplay) {
        const totalTime = (userProgress.scores && userProgress.scores.totalTimeSpent) ? userProgress.scores.totalTimeSpent : 0;
        const totalExercises = (userProgress.scores && userProgress.scores.exercisesCompleted) ? userProgress.scores.exercisesCompleted : 0;
        
        if (totalExercises > 0 && totalTime > 0) {
            const avgSeconds = Math.round(totalTime / totalExercises);
            const mins = Math.floor(avgSeconds / 60);
            const secs = avgSeconds % 60;
            const formatted = `${mins > 0 ? mins + 'p ' : ''}${secs}mp`;
            avgTimeDisplay.textContent = formatted;
        } else {
            avgTimeDisplay.textContent = "-";
        }
    }

    // C. Total Points
    const totalPointsDisplay = document.getElementById("profile-total-points");
    if (totalPointsDisplay) {
        totalPointsDisplay.textContent = userProgress.points || 0;
    }
}

async function handlePasswordChange() {
    const errorMsg = document.getElementById("password-error-msg");
    const successMsg = document.getElementById("password-success-msg");
    errorMsg.textContent = "";
    successMsg.textContent = "";

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const repeatPassword = document.getElementById("repeat-password").value;

    if (newPassword !== repeatPassword) {
        errorMsg.textContent = "A két új jelszó nem egyezik meg!";
        return;
    }

    // Regex Check: 8-16 chars, Lowercase, Uppercase, Number, Symbol
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
        errorMsg.textContent = "A jelszónak 8-16 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert.";
        return;
    }

    if (ProgressManager.isGuest) {
        errorMsg.textContent = "Hiba 403 (Forbidden): Vendég munkamenet nem módosíthat jelszót.";
        console.error("403 Forbidden: Password update rejected for guest session.");
        return;
    }

    // Now update password on PHP backend
    const btn = document.getElementById("btn-change-password");
    btn.disabled = true;
    btn.textContent = "Kérjük várj...";

    try {
        const res = await fetch(`${API_URL}?action=update_password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        btn.disabled = false;
        btn.textContent = "Mentés";

        if (res.ok) {
            const data = await res.json();
            if (data.error) {
                errorMsg.textContent = data.error;
            } else {
                successMsg.textContent = "Jelszó sikeresen frissítve!";
                document.getElementById("password-change-form").reset();
            }
        } else {
            errorMsg.textContent = "Hiba történt a jelszó módosításakor. Próbáld újra.";
        }
    } catch (err) {
        btn.disabled = false;
        btn.textContent = "Mentés";
        errorMsg.textContent = "Hálózati hiba történt a jelszó módosításakor.";
        console.error("Password update error:", err);
    }
}

// ==========================================================================
// IMAGE LIGHTBOX LOGIC
// ==========================================================================
window.openLightbox = function(src) {
    const lightbox = document.getElementById("image-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.add("is-active");
        lightbox.setAttribute("aria-hidden", "false");
    }
};

window.closeLightbox = function(event) {
    if (event) event.stopPropagation();
    const lightbox = document.getElementById("image-lightbox");
    if (lightbox) {
        lightbox.classList.remove("is-active");
        lightbox.setAttribute("aria-hidden", "true");
        // Clear src after animation so it doesn't flash the old image next time
        setTimeout(() => {
            const img = document.getElementById("lightbox-img");
            if (img) img.src = "";
        }, 300);
    }
};

// Auto-open profile modal if requested via URL search param
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "profile") {
        setTimeout(() => {
            if (typeof openProfileModal === "function") {
                openProfileModal();
            }
        }, 300);
        
        // Clean up URL
        window.history.replaceState(null, null, window.location.pathname);
    }
});
