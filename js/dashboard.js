// js/dashboard.js

// Inside js/dashboard.js (Update the top block)

document.addEventListener("DOMContentLoaded", () => {
    initNavigationListeners();
    
    // 1. Read what level was clicked on index.html (fallback to A1 if empty)
    const levelToLoad = localStorage.getItem("selectedLevel") || "A1";
    
    // 2. Clear out the storage key so refreshing doesn't break standard flows
    // localStorage.removeItem("selectedLevel"); 
    
    // 3. Automatically launch the workspace with the correct level data context!
    renderModule(levelToLoad, "Pronouns");
    
    // 4. Highlight the correct navbar state item on top matching the selection
    const activeNavbarItem = document.getElementById(`nav-${levelToLoad.toLowerCase()}`);
    if (activeNavbarItem) {
        activeNavbarItem.classList.add("active");
    }
});


function initNavigationListeners() {
    const sidebarLinks = document.querySelectorAll(".sidebar-link");

    sidebarLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault(); // Prevents page from jumping to top

            const targetLevel = link.getAttribute("data-level");
            const targetSection = link.getAttribute("data-section");

            if (targetLevel && targetSection) {
                // Remove the highlighted 'active' state from previous links
                sidebarLinks.forEach(l => l.classList.remove("active"));
                // Highlight the newly clicked link
                link.classList.add("active");

                // Update the Breadcrumb display area text
                updateBreadcrumbs(targetLevel, targetSection);

                // Inject the chosen lesson text and practice questions
                renderModule(targetLevel, targetSection);
            }
        });
    });
}

function updateBreadcrumbs(level, section) {
    const breadcrumbs = document.querySelector(".breadcrumb-list");
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <li>${level} Kezdő</li>
            <li>Nyelvtan</li>
            <li aria-current="page">${section}</li>
        `;
    }
}

function renderModule(level, section) {
    const workspace = document.getElementById("workspace");
    
    // Pull data out of our data.js repository object safely
    const moduleData = learningContent[level]?.[section];

    if (!moduleData) {
        workspace.innerHTML = `<p class="error-text" style="color: var(--color-error);">Hiba: A tananyag nem található.</p>`;
        return;
    }

    // Set the Main Lesson Header Title text
    document.querySelector(".current-topic-title").textContent = moduleData.title;

    // Build the interactive True/False question template components using string loops
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

    // Replace old screen layout context with the clean fresh module container
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

// Function triggered instantly when a student clicks an Igaz/Hamis choice button
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
