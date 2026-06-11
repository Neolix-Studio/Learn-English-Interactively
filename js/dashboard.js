// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    // Start listening for both sidebar clicks AND global top navbar level clicks
    initSidebarListeners();
    initTopNavbarListeners();
    initModalListeners();
    
    // Read what level was clicked on index.html (fallback to A1 if empty)
    const levelToLoad = localStorage.getItem("selectedLevel") || "A1";
    
    // Automatically launch the workspace with the correct level data context
    switchGlobalLevel(levelToLoad);
});

// 1. LISTEN TO VERTICAL SIDEBAR MODULE LINKS
function initSidebarListeners() {
    const sidebarLinks = document.querySelectorAll(".sidebar-link");

    sidebarLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            const targetLevel = link.getAttribute("data-level");
            const targetSection = link.getAttribute("data-section");

            if (targetLevel && targetSection) {
                // Remove highlighted active states from side menu rows
                sidebarLinks.forEach(l => l.classList.remove("active"));
                link.classList.add("active");

                // Render content details instantly
                renderModule(targetLevel, targetSection);
            }
        });
    });
}

// 2. LISTEN TO GLOBAL STATIC TOP NAVBAR LEVEL BUTTONS
function initTopNavbarListeners() {
    // Select our horizontal navbar element links
    const topNavLinks = {
        A1: document.getElementById("nav-a1"),
        A2: document.getElementById("nav-a2"),
        B1: document.getElementById("nav-a1") ? document.getElementById("nav-b1") : null,
        B2: document.getElementById("nav-a1") ? document.getElementById("nav-b2") : null
    };

    // Simple loop mapping events over keys
    Object.keys(topNavLinks).forEach(level => {
        const button = topNavLinks[level];
        if (!button) return;

        button.addEventListener("click", (event) => {
            event.preventDefault();

            if (level === "A1" || level === "A2") {
                // Trigger live context layout switch without page refreshes
                switchGlobalLevel(level);
            } else if (level === "B1" || level === "B2") {
                // Call premium glowing overlay alert module
                openWipModal();
            }
        });
    });
}

// 3. SEAMLESSLY SWITCH LEVEL DOMAIN WINDOW
function switchGlobalLevel(levelName) {
    // Update active visual status anchors across top header links
    const navbarLinks = document.querySelectorAll(".site-header .nav-link");
    navbarLinks.forEach(link => link.classList.remove("active"));
    
    const targetHeaderLink = document.getElementById(`nav-${levelName.toLowerCase()}`);
    if (targetHeaderLink) targetHeaderLink.classList.add("active");

    // Dynamic Filter: Update sidebar items to map to the freshly selected level
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    let initialSectionToLoad = "ToBe"; // Default fallback topic

    sidebarLinks.forEach(link => {
        // We override previous attributes to match the new global scope context
        link.setAttribute("data-level", levelName);
        
        // Clear active highlighting state properties out
        link.classList.remove("active");

        // Auto-select the first match link row to trigger as default highlight
        if (link.getAttribute("data-section") === initialSectionToLoad) {
            link.classList.add("active");
        }
    });

    // Run core engine to paint chosen view frame variables
    renderModule(levelName, initialSectionToLoad);
}

// 4. CORE LESSON RENDERING MACHINERY
function renderModule(level, section) {
    const workspace = document.getElementById("workspace");
    const moduleData = learningContent[level]?.[section];

    // Synchronize breadcrumbs position trail tracking strip text strings
    const breadcrumbs = document.querySelector(".breadcrumb-list");
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <li>${level} Kezdő</li>
            <li>Nyelvtan</li>
            <li aria-current="page">${section}</li>
        `;
    }

    if (!moduleData) {
        document.querySelector(".current-topic-title").textContent = "Tananyag Nem Található";
        workspace.innerHTML = `<p class="error-text" style="color: var(--color-error); padding: 2rem;">Sajnáljuk, ehhez a részhez még nem töltöttek fel feladatokat.</p>`;
        return;
    }

    document.querySelector(".current-topic-title").textContent = moduleData.title;

    let quizHtml = "";
    moduleData.quiz.forEach((item, index) => {
        quizHtml += `
            <div class="quiz-item" data-index="${index}">
                <p class="quiz-question">${index + 1}. ${item.question}</p>
                <div class="quiz-buttons">
                    <button class="btn btn-tf" onclick="checkAnswer('${level}', '${section}', ${index}, true)">IGAZ (True)</button>
                    <button class="btn btn-tf" onclick="checkAnswer('${level}', '${section}', ${index}, false)">HAMIS (False)</button>
                </div>
                <div class="quiz-feedback" id="feedback-${index}"></div>
            </div>
        `;
    });

    workspace.innerHTML = `
        <div class="lesson-view">
            <article class="explanation-box">
                <h2>Nyelvtani magyarázat (Magyarul)</h2>
                <p>${moduleData.explanation}</p>
            </article>

            <section class="practice-box">
                <h2>Gyakorló feladatok</h2>
                <div class="quiz-list">${quizHtml}</div>
            </section>
        </div>
    `;
}

function checkAnswer(level, section, quizIndex, studentAnswer) {
    const correctAnswer = learningContent[level][section].quiz[quizIndex].answer;
    const feedbackBox = document.getElementById(`feedback-${quizIndex}`);

    if (studentAnswer === correctAnswer) {
        feedbackBox.innerHTML = `✓ Helyes válasz! Ügyes vagy!`;
        feedbackBox.className = "quiz-feedback correct";
    } else {
        feedbackBox.innerHTML = `✗ Nem jó. Próbáld meg újra!`;
        feedbackBox.className = "quiz-feedback incorrect";
    }
}

// 5. MODAL SYSTEM STATE CONTROLLERS
function initModalListeners() {
    const wipModal = document.getElementById("wip-modal");
    const closeWipBtn = document.getElementById("close-wip-btn");

    if (closeWipBtn && wipModal) {
        closeWipBtn.addEventListener("click", closeWipModal);
        wipModal.addEventListener("click", (e) => {
            if (e.target === wipModal) closeWipModal();
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
