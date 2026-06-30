// ==========================
// INTERACTIVE LESSON PLAYER
// ==========================

let interactiveState = {
    questions: [],
    currentIdx: 0,
    hearts: 5,
    maxHearts: 5,
    correctAnswers: 0,
    level: null,
    section: null,
    subsection: null,
    isChecking: false,
    selectedMatchPairs: [] // for match_pairs
};

// Available TTS Voices
let ttsVoices = [];
window.speechSynthesis.onvoiceschanged = () => {
    ttsVoices = window.speechSynthesis.getVoices();
};

function playTTS(text, lang = 'en-US') {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick a high quality or varied voice
    const engVoices = ttsVoices.filter(v => v.lang.startsWith(lang) || v.lang.startsWith('en-GB'));
    if (engVoices.length > 0) {
        const premiumVoices = engVoices.filter(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Daniel'));
        if (premiumVoices.length > 0) {
            utterance.voice = premiumVoices[Math.floor(Math.random() * premiumVoices.length)];
        } else {
            utterance.voice = engVoices[Math.floor(Math.random() * engVoices.length)];
        }
    }
    
    utterance.rate = 0.85; // Slightly slower for language learners
    window.speechSynthesis.speak(utterance);
}

// Play success/fail sound effects
function playSoundEffect(type) {
    if (typeof AudioSynth !== 'undefined') {
        if (type === 'success') {
            if (typeof AudioSynth.playCorrect === 'function') {
                AudioSynth.playCorrect();
            } else {
                AudioSynth.playTone(523.25, 'sine', 0.15);
                setTimeout(() => AudioSynth.playTone(659.25, 'sine', 0.2), 100);
            }
        } else if (type === 'fail') {
            AudioSynth.playTone(150, 'sawtooth', 0.3);
            setTimeout(() => AudioSynth.playTone(100, 'sawtooth', 0.3), 150);
        } else if (type === 'pop') {
            AudioSynth.playTone(600, 'sine', 0.05);
        }
    }
}

async function startInteractiveLesson(workspace, data) {
    const source = data.dataSource;
    
    if (source && !data.items) {
        if (vocabCache && vocabCache[source]) {
            data.items = vocabCache[source].items || [];
            if (vocabCache[source].type) data.type = vocabCache[source].type; // Override type if present in json
        } else {
            workspace.innerHTML = `
                <div class="empty-state-section" style="min-height: 200px; display: flex; align-items: center; justify-content: center; height: 100%;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⏳</div>
                        <h2>Lekerítés folyamatban...</h2>
                    </div>
                </div>
            `;
            try {
                const response = await fetch(source);
                if (!response.ok) throw new Error("HTTP error");
                const fetched = await response.json();
                if (typeof vocabCache !== 'undefined') vocabCache[source] = fetched;
                data.items = fetched.items || [];
                if (fetched.type) data.type = fetched.type;
            } catch (error) {
                workspace.innerHTML = `
                    <div style="text-align:center; padding: 2rem;">
                        <h2>Hiba történt</h2>
                        <p>Nem sikerült betölteni a leckét.</p>
                    </div>`;
                return;
            }
        }
    }

    if (!data.items || data.items.length === 0) {
        workspace.innerHTML = `
            <div style="text-align:center; padding: 2rem;">
                <h2>Hamarosan érkezik!</h2>
                <p>Ezt a feladatot még készítjük.</p>
            </div>`;
        return;
    }
    
    const gameScreen = document.getElementById("game-screen");
    if (gameScreen) gameScreen.classList.add("is-interactive-lesson");

    const footer = document.getElementById("interactive-footer");
    if (footer) {
        footer.innerHTML = `
            <div class="interactive-feedback-area" id="interactive-feedback-area">
                <div id="interactive-feedback-icon"></div>
                <div id="interactive-feedback-text"></div>
            </div>
            <button class="btn check-btn" id="check-btn" onclick="checkInteractiveAnswer()">Ellenőrzés</button>
        `;
    }

    // Initialize State
    interactiveState = {
        questions: shuffleArray([...data.items]), // randomize order
        currentIdx: 0,
        hearts: 5,
        maxHearts: 5,
        correctAnswers: 0,
        level: typeof currentLevel !== 'undefined' ? currentLevel : null,
        section: typeof currentSection !== 'undefined' ? currentSection : null,
        subsection: typeof currentSubsection !== 'undefined' ? currentSubsection : null,
        type: data.type,
        isChecking: false,
        selectedMatchPairs: []
    };

    updateInteractiveUI();
    renderInteractiveQuestion();
}

function updateInteractiveUI() {
    const progressFill = document.getElementById("interactive-progress-fill");
    if (progressFill) {
        const percent = interactiveState.questions.length > 0 
            ? (interactiveState.correctAnswers / interactiveState.questions.length) * 100 
            : 0;
        progressFill.style.width = `${percent}%`;
    }
    
    const heartCount = document.getElementById("heart-count");
    if (heartCount) {
        heartCount.textContent = interactiveState.hearts;
    }
}

function renderInteractiveQuestion() {
    const contentArea = document.getElementById("game-content");
    const footer = document.getElementById("interactive-footer");
    const checkBtn = document.getElementById("check-btn");
    const feedbackArea = document.getElementById("interactive-feedback-area");
    const feedbackIcon = document.getElementById("interactive-feedback-icon");
    const feedbackText = document.getElementById("interactive-feedback-text");
    
    if (!contentArea) return;

    // Reset Footer
    footer.className = "game-footer";
    feedbackArea.className = "interactive-feedback-area";
    feedbackArea.innerHTML = "";
    checkBtn.textContent = "Ellenőrzés";
    checkBtn.className = "btn check-btn";
    interactiveState.isChecking = false;

    // Check if finished
    if (interactiveState.currentIdx >= interactiveState.questions.length || interactiveState.correctAnswers >= interactiveState.questions.length) {
        renderInteractiveCompletion();
        return;
    }
    
    // Check if failed
    if (interactiveState.hearts <= 0) {
        renderInteractiveFail();
        return;
    }

    const q = interactiveState.questions[interactiveState.currentIdx];
    // Fallback to the overarching type if item doesn't specify
    const qType = q.type || interactiveState.type; 

    contentArea.innerHTML = ""; // Clear

    const container = document.createElement("div");
    container.className = "interactive-question-container";
    
    if (qType === 'word_order') {
        renderWordOrderQuestion(container, q);
    } else if (qType === 'fill_blanks') {
        renderFillBlanksQuestion(container, q);
    } else if (qType === 'true_false') {
        renderTrueFalseQuestion(container, q);
    } else if (qType === 'match_pairs') {
        renderMatchPairsQuestion(container, q);
        checkBtn.style.display = "none"; // Match pairs auto-checks
    } else if (qType === 'dictation') {
        renderDictationQuestion(container, q);
    } else {
        container.innerHTML = `<p>Ismeretlen feladattípus: ${qType}</p>`;
    }

    contentArea.appendChild(container);
    
    if (qType !== 'match_pairs') {
        checkBtn.style.display = "flex";
        checkBtn.disabled = true; // wait for input
    }
}

// ----------------------------------------------------
// EXERCISE RENDERERS
// ----------------------------------------------------

function renderWordOrderQuestion(container, q) {
    const huText = q.hu || "Fordítsd le ezt a mondatot";
    
    let html = `
        <h2 style="margin-bottom: 2rem; font-size: 1.8rem;">${huText}</h2>
        <div class="word-bank-target" id="wb-target" onclick="returnWordToSource(event)"></div>
        <div class="word-bank-source" id="wb-source">
    `;
    
    // Shuffle the scrambled words
    const words = shuffleArray([...q.scrambledWords]);
    words.forEach((w, i) => {
        html += `<button class="interactive-word-chip" data-word="${escapeHTML(w)}" onclick="moveWordToTarget(this)">${escapeHTML(w)}</button>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

window.moveWordToTarget = function(btn) {
    playSoundEffect('pop');
    const target = document.getElementById("wb-target");
    
    const clone = document.createElement("button");
    clone.className = "interactive-word-chip";
    clone.textContent = btn.textContent;
    clone.dataset.sourceId = Math.random().toString(36).substr(2, 9);
    btn.dataset.sourceId = clone.dataset.sourceId;
    
    target.appendChild(clone);
    btn.classList.add("used");
    
    document.getElementById("check-btn").disabled = false;
};

window.returnWordToSource = function(e) {
    if (e.target.classList.contains("interactive-word-chip")) {
        playSoundEffect('pop');
        const sourceId = e.target.dataset.sourceId;
        e.target.remove();
        
        const sourceBtn = document.querySelector(`#wb-source .interactive-word-chip[data-source-id="${sourceId}"]`);
        if (sourceBtn) {
            sourceBtn.classList.remove("used");
        }
        
        if (document.getElementById("wb-target").children.length === 0) {
            document.getElementById("check-btn").disabled = true;
        }
    }
};

// ----------------------------------------------------
// CHECK ANSWER LOGIC
// ----------------------------------------------------

window.checkInteractiveAnswer = function() {
    if (interactiveState.isChecking) {
        // Next question
        interactiveState.currentIdx++;
        renderInteractiveQuestion();
        return;
    }

    const q = interactiveState.questions[interactiveState.currentIdx];
    const qType = q.type || interactiveState.type; 
    let isCorrect = false;
    let correctAnswerStr = "";

    const normalize = (s) => s.replace(/[.,!?]/g, '').trim().toLowerCase();

    if (qType === 'word_order') {
        const targetBlocks = document.querySelectorAll("#wb-target .interactive-word-chip");
        const userSentence = Array.from(targetBlocks).map(b => b.textContent).join(" ");
        if (normalize(userSentence) === normalize(q.correctAnswer)) isCorrect = true;
        correctAnswerStr = q.correctAnswer;
    } else if (qType === 'fill_blanks') {
        const expected = Array.isArray(q.answer) ? q.answer[0] : q.answer; // depending on structure
        const expectedParts = expected.split('/').map(s => normalize(s));
        if (expectedParts.includes(normalize(interactiveState.currentAnswer))) isCorrect = true;
        correctAnswerStr = expected.split('/')[0]; // show the primary answer if wrong
    } else if (qType === 'true_false') {
        if (interactiveState.currentAnswer === q.answer) isCorrect = true;
        correctAnswerStr = q.answer ? "Igaz" : "Hamis";
    } else if (qType === 'dictation') {
        const expected = q.sentence || q.correctAnswer;
        if (normalize(interactiveState.currentAnswer) === normalize(expected)) isCorrect = true;
        correctAnswerStr = expected;
    }
    
    // Play the sentence back in English at 80% speed
    let textToRead = "";
    if (qType === 'word_order') {
        textToRead = q.correctAnswer;
    } else if (qType === 'fill_blanks') {
        textToRead = (q.sentence || q.question || "").replace(/_{3,}/, correctAnswerStr);
    } else if (qType === 'dictation') {
        textToRead = q.sentence || q.correctAnswer;
    }
    
    if (textToRead) {
        // Use our new PHP Google Cloud TTS Backend instead of the robotic browser voice
        fetch('api/tts.php?text=' + encodeURIComponent(textToRead))
            .then(res => res.json())
            .then(data => {
                if (data.success && data.url) {
                    const audio = new Audio(data.url);
                    audio.play().catch(e => console.error("Audio play failed:", e));
                } else {
                    console.error("TTS Backend Error:", data.error, data.details);
                    // Fallback to robotic browser voice if PHP fails
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(textToRead);
                        utterance.lang = 'en-US';
                        utterance.rate = 0.8;
                        window.speechSynthesis.speak(utterance);
                    }
                }
            })
            .catch(err => {
                console.error("Fetch to TTS backend failed:", err);
            });
    }
    
    showInteractiveFeedback(isCorrect, correctAnswerStr);
};

function showInteractiveFeedback(isCorrect, correctAnswerStr) {
    interactiveState.isChecking = true;
    const footer = document.getElementById("interactive-footer");
    const checkBtn = document.getElementById("check-btn");
    const feedbackArea = document.getElementById("interactive-feedback-area");
    
    if (isCorrect) {
        playSoundEffect('success');
        interactiveState.correctAnswers++;
        footer.classList.add("state-correct");
        feedbackArea.classList.add("visible", "correct");
        feedbackArea.innerHTML = `<span style="font-size: 2rem;">✅</span> <span>Helyes!</span>`;
        checkBtn.textContent = "Tovább";
    } else {
        playSoundEffect('fail');
        interactiveState.hearts--;
        footer.classList.add("state-wrong");
        feedbackArea.classList.add("visible", "wrong");
        feedbackArea.innerHTML = `<span style="font-size: 2rem;">❌</span> <div><div style="font-size:0.9rem;opacity:0.8;">Helyes válasz:</div>${correctAnswerStr}</div>`;
        checkBtn.textContent = "Értem";
        
        // Move question to the end of the array to practice it again
        const q = interactiveState.questions[interactiveState.currentIdx];
        interactiveState.questions.push(q);
    }
    
    updateInteractiveUI();
}

// ----------------------------------------------------
// COMPLETION & FAIL SCREENS
// ----------------------------------------------------

function renderInteractiveCompletion() {
    const contentArea = document.getElementById("game-content");
    const footer = document.getElementById("interactive-footer");
    footer.innerHTML = `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="closeWorkspace()">Vissza a térképhez</button>`;
    
    playSoundEffect('success');
    
    // Add XP Integration here
    if (typeof addXP === 'function') {
        addXP(30, null, interactiveState.subsection); // Pass a large amount, the backend/cap will handle the max allowed XP
    }
    
    // Save completion
    if (typeof userProgress !== 'undefined') {
        const key = `${interactiveState.level}_${interactiveState.section}_${interactiveState.subsection}`;
        if (!userProgress.completed[key]) {
            userProgress.completed[key] = new Date().toISOString();
            if (typeof saveUserProgress === 'function') saveUserProgress();
            if (typeof syncSidebarRoadmapNodes === 'function') syncSidebarRoadmapNodes();
        }
    }
    
    contentArea.innerHTML = `
        <div style="text-align: center; padding: 2rem; margin: auto;">
            <span style="font-size: 5rem; display: block; animation: heartbeat 1s infinite alternate;">🏆</span>
            <h2 style="font-size: 2.5rem; color: var(--color-accent-in); margin: 1rem 0;">Lecke teljesítve!</h2>
            <p style="font-size: 1.2rem; color: var(--color-text-muted);">Sikeresen megcsináltad az összes feladatot.</p>
        </div>
    `;
}

function renderInteractiveFail() {
    const contentArea = document.getElementById("game-content");
    const footer = document.getElementById("interactive-footer");
    
    footer.innerHTML = `<button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="closeWorkspace()">Vissza a térképhez</button>`;
    
    contentArea.innerHTML = `
        <div style="text-align: center; padding: 2rem; margin: auto;">
            <span style="font-size: 5rem; display: block; filter: grayscale(1);">💔</span>
            <h2 style="font-size: 2.5rem; color: #ef4444; margin: 1rem 0;">Elfogyott az életed!</h2>
            <p style="font-size: 1.2rem; color: var(--color-text-muted);">Gyakorolj egy kicsit, és próbáld újra.</p>
        </div>
    `;
}

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ----------------------------------------------------
// FILL IN THE BLANKS LOGIC
// ----------------------------------------------------
function renderFillBlanksQuestion(container, q) {
    const huText = q.hu || "Válaszd ki a helyes szót a mondat kiegészítéséhez!";
    
    // Create sentence with blank
    const blankId = Math.random().toString(36).substr(2, 9);
    const sentenceText = q.sentence || q.question || "";
    const sentenceHtml = escapeHTML(sentenceText).replace(/_{3,}/, `<span class="fill-blank-target" id="fill-blank-${blankId}">___</span>`);
    
    let html = `
        <h2 style="margin-bottom: 2rem; font-size: 1.8rem; color: var(--color-accent-in);">${huText}</h2>
        <div style="font-size: 1.5rem; margin-bottom: 2rem; background: var(--color-bg-surface); padding: 1.5rem; border-radius: 12px; border: var(--glass-border);">
            ${sentenceHtml}
        </div>
        <div class="fill-blank-options" style="display:flex; flex-direction:column; gap: 1rem;">
    `;
    
    const answer = Array.isArray(q.answer) ? q.answer[0].split('/')[0] : q.answer.split('/')[0];
    let opts = q.opts ? [...q.opts] : [];
    
    if (opts.length === 0) {
        // Generate fallback options
        opts = ["am", "is", "are", "am not", "isn't", "aren't"];
        if (!opts.includes(answer)) {
            opts = [answer, "is", "are", "do"];
        }
        opts = shuffleArray(opts).slice(0, 4);
        if (!opts.includes(answer)) {
            opts[0] = answer;
            opts = shuffleArray(opts);
        }
    }
    
    opts.forEach((opt, i) => {
        const safeOptHtml = escapeHTML(opt);
        const safeOptJs = opt.replace(/'/g, "\\'");
        html += `
            <button class="interactive-word-chip" style="width: 100%; max-width: 400px; margin: 0 auto; text-align: center; font-size: 1.2rem; padding: 1rem;" 
                onclick="selectFillBlankOption(this, '${safeOptJs}', '${blankId}')">
                ${safeOptHtml}
            </button>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

window.selectFillBlankOption = function(btn, optValue, blankId) {
    playSoundEffect('pop');
    
    // Deselect others
    const buttons = btn.parentElement.querySelectorAll(".interactive-word-chip");
    buttons.forEach(b => {
        b.classList.remove("selected");
        b.style.borderColor = "transparent";
        b.style.background = "var(--color-bg-surface)";
    });
    
    // Select this
    btn.classList.add("selected");
    btn.style.borderColor = "var(--color-accent-in)";
    btn.style.background = "rgba(59, 130, 246, 0.1)";
    
    // Fill the blank
    const blankEl = document.getElementById("fill-blank-" + blankId);
    if (blankEl) {
        blankEl.textContent = optValue;
        blankEl.style.color = "var(--color-accent-in)";
        blankEl.style.borderBottom = "2px solid var(--color-accent-in)";
    }
    
    // Enable check
    interactiveState.currentAnswer = optValue;
    document.getElementById("check-btn").disabled = false;
};

// ----------------------------------------------------
// TRUE/FALSE LOGIC
// ----------------------------------------------------
function renderTrueFalseQuestion(container, q) {
    const title = q.instruction || "Igaz vagy Hamis?";
    let html = `
        <h2 style="margin-bottom: 2rem; font-size: 1.8rem; color: var(--color-accent-in);">${escapeHTML(title)}</h2>
        <div style="font-size: 1.5rem; margin-bottom: 2rem; background: var(--color-bg-surface); padding: 2rem; border-radius: 12px; border: var(--glass-border); text-align: center;">
            ${escapeHTML(q.question)}
        </div>
        <div style="display: flex; gap: 1rem; justify-content: center;">
            <button class="interactive-word-chip" style="flex:1; max-width: 200px; padding: 1.5rem; font-size: 1.5rem;" onclick="selectTrueFalse(this, true)">Igaz ✅</button>
            <button class="interactive-word-chip" style="flex:1; max-width: 200px; padding: 1.5rem; font-size: 1.5rem;" onclick="selectTrueFalse(this, false)">Hamis ❌</button>
        </div>
    `;
    container.innerHTML = html;
}

window.selectTrueFalse = function(btn, value) {
    playSoundEffect('pop');
    const buttons = btn.parentElement.querySelectorAll(".interactive-word-chip");
    buttons.forEach(b => {
        b.style.borderColor = "transparent";
        b.style.background = "var(--color-bg-surface)";
    });
    btn.style.borderColor = "var(--color-accent-in)";
    btn.style.background = "rgba(59, 130, 246, 0.1)";
    
    interactiveState.currentAnswer = value;
    document.getElementById("check-btn").disabled = false;
};

// ----------------------------------------------------
// MATCH PAIRS LOGIC
// ----------------------------------------------------
function renderMatchPairsQuestion(container, q) {
    // Generate unique ID for this instance
    const pairs = q.pairs;
    interactiveState.selectedMatchPairs = [];
    interactiveState.matchedCount = 0;
    interactiveState.pairsTotal = pairs.length;
    
    // Create flat list of words
    let words = [];
    pairs.forEach(p => {
        words.push({ text: p.en, type: 'en', pairId: p.en });
        words.push({ text: p.hu, type: 'hu', pairId: p.en });
    });
    words = shuffleArray(words);
    
    let html = `
        <h2 style="margin-bottom: 1rem; font-size: 1.8rem;">Párosítsd a szavakat!</h2>
        <div class="match-pairs-grid" id="match-pairs-grid">
    `;
    
    words.forEach(w => {
        html += `<button class="match-pair-btn" data-type="${w.type}" data-pair-id="${w.pairId}" onclick="handleMatchPairClick(this)">${escapeHTML(w.text)}</button>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

window.handleMatchPairClick = function(btn) {
    // Ignore already matched or selected
    if (btn.classList.contains("matched") || btn.classList.contains("selected")) return;
    
    playSoundEffect('pop');
    
    const currentlySelected = document.querySelector(".match-pair-btn.selected");
    
    if (!currentlySelected) {
        // First selection
        btn.classList.add("selected");
        return;
    }
    
    // Second selection
    const firstType = currentlySelected.dataset.type;
    const firstPairId = currentlySelected.dataset.pairId;
    const secondType = btn.dataset.type;
    const secondPairId = btn.dataset.pairId;
    
    // Check if they are of the same language
    if (firstType === secondType) {
        // Switch selection to new one
        currentlySelected.classList.remove("selected");
        btn.classList.add("selected");
        return;
    }
    
    // Check if they match
    if (firstPairId === secondPairId) {
        // Match!
        playSoundEffect('success');
        currentlySelected.classList.remove("selected");
        currentlySelected.classList.add("matched");
        btn.classList.add("matched");
        
        interactiveState.matchedCount++;
        
        if (interactiveState.matchedCount >= interactiveState.pairsTotal) {
            // All matched! Wait a second then auto-advance
            document.getElementById("interactive-feedback-area").innerHTML = `<span style="color:var(--color-success)">Minden pár megvan!</span>`;
            document.getElementById("interactive-feedback-area").classList.add("visible");
            setTimeout(() => {
                interactiveState.currentIdx++;
                interactiveState.correctAnswers++;
                updateInteractiveUI();
                renderInteractiveQuestion();
            }, 1000);
        }
    } else {
        // Mismatch!
        playSoundEffect('fail');
        currentlySelected.classList.remove("selected");
        currentlySelected.classList.add("error");
        btn.classList.add("error");
        
        // Subtract a heart directly since there is no check button
        interactiveState.hearts--;
        updateInteractiveUI();
        if (interactiveState.hearts <= 0) {
            setTimeout(renderInteractiveFail, 500);
            return;
        }
        
        setTimeout(() => {
            currentlySelected.classList.remove("error");
            btn.classList.remove("error");
        }, 500);
    }
};

// ----------------------------------------------------
// DICTATION LOGIC
// ----------------------------------------------------
function renderDictationQuestion(container, q) {
    interactiveState.currentAnswer = "";
    const sentence = q.sentence || q.correctAnswer;
    
    let html = `
        <div class="dictation-container">
            <h2 style="margin-bottom: 2rem; font-size: 1.8rem; color: var(--color-text-main);">Írd le, amit hallasz!</h2>
            <button class="btn-play-audio" onclick="playTTS('${escapeHTML(sentence)}')">🔊</button>
            <input type="text" class="dictation-input" id="dictation-input" placeholder="Kattints ide a gépeléshez..." oninput="checkDictationInput(this.value)">
        </div>
    `;
    
    container.innerHTML = html;
    
    // Auto-play on load
    setTimeout(() => playTTS(sentence), 500);
}

window.checkDictationInput = function(val) {
    interactiveState.currentAnswer = val.trim();
    document.getElementById("check-btn").disabled = interactiveState.currentAnswer.length === 0;
};
