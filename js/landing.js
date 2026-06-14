// js/landing.js

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Supabase Client
    let supabaseClient = null;
    if (typeof SUPABASE_URL !== "undefined" && typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_URL !== "YOUR_SUPABASE_URL") {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Track if user is currently logged in
    let isUserLoggedIn = false;

    // Check if user is already logged in and update UI accordingly
    if (supabaseClient) {
        // Listen for auth events (like clicking the email link and successfully logging in)
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                isUserLoggedIn = true;
                const navLoginLink = document.querySelector('a[href="#login"]');
                if (navLoginLink) {
                    navLoginLink.textContent = "Tanuló Felület";
                    navLoginLink.href = "dashboard.html";
                }

                // If they just arrived via an email verification link
                if (window.location.hash.includes("type=signup") || window.location.hash.includes("access_token")) {
                    const successModal = document.getElementById("verification-success-modal");
                    if (successModal) {
                        successModal.classList.add("is-active");
                        successModal.setAttribute("aria-hidden", "false");
                    }
                    // It is now safe to clean up the URL so they don't accidentally auto-login again later!
                    window.history.replaceState(null, null, window.location.pathname);
                }
            } else if (event === 'SIGNED_OUT') {
                isUserLoggedIn = false;
                // If they sign out, reset the button back
                const navLoginLink = document.querySelector('a[href="dashboard.html"]');
                if (navLoginLink) {
                    navLoginLink.textContent = "Bejelentkezés / Regisztráció";
                    navLoginLink.href = "#login";
                }
            }
        });

        // Initial check on page load
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                isUserLoggedIn = true;
                const navLoginLink = document.querySelector('a[href="#login"]');
                if (navLoginLink) {
                    navLoginLink.textContent = "Tanuló Felület";
                    navLoginLink.href = "dashboard.html";
                }
            }
        });
    }

    // Global state to hold the level chosen before showing modal
    let pendingGuestLevel = "A1";

    // 2. Setup Level Card Redirection for Guests
    const levelButtons = document.querySelectorAll(".landing-level-btn");
    levelButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const pickedLevel = button.getAttribute("data-level");

            if (pickedLevel === "A1") {
                if (isUserLoggedIn) {
                    // Logged in users bypass the auth modal check
                    localStorage.setItem("selectedLevel", pickedLevel);
                    window.location.href = "dashboard.html";
                } else {
                    // Guests get intercepted to choose their login method
                    pendingGuestLevel = pickedLevel;
                    openLoginModal();
                }
            } else if (pickedLevel === "A2" || pickedLevel === "B1" || pickedLevel === "B2") {
                openWipModal();
            }
        });
    });

    // 3. Setup General WIP Modal Listeners
    const wipModal = document.getElementById("wip-modal");
    const closeWipBtn = document.getElementById("close-wip-btn");

    if (closeWipBtn && wipModal) {
        closeWipBtn.addEventListener("click", closeWipModal);
    }

    function openWipModal() {
        wipModal.classList.add("is-active");
        wipModal.setAttribute("aria-hidden", "false");
    }

    function closeWipModal() {
        wipModal.classList.remove("is-active");
        wipModal.setAttribute("aria-hidden", "true");
    }

    // 3.5 Setup Verify Email Modal Listeners
    const closeVerifyEmailBtn = document.getElementById("close-verify-email-btn");
    if (closeVerifyEmailBtn) {
        closeVerifyEmailBtn.addEventListener("click", () => {
            const verifyModal = document.getElementById("verify-email-modal");
            if (verifyModal) {
                verifyModal.classList.remove("is-active");
                verifyModal.setAttribute("aria-hidden", "true");
            }
        });
    }

    // 4. Setup Authentication Modal Controls
    const loginModal = document.getElementById("login-modal");
    const closeLoginBtn = document.getElementById("close-login-btn");
    const navLoginLink = document.querySelector('a[href="#login"]');

    if (navLoginLink && loginModal) {
        navLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (navLoginLink.textContent === "Tanuló Felület") {
                window.location.href = "dashboard.html";
            } else {
                openLoginModal();
            }
        });
    }

    if (closeLoginBtn && loginModal) {
        closeLoginBtn.addEventListener("click", closeLoginModal);
    }

    function openLoginModal() {
        loginModal.classList.add("is-active");
        loginModal.setAttribute("aria-hidden", "false");
        document.getElementById("auth-error").textContent = "";
    }

    function closeLoginModal() {
        loginModal.classList.remove("is-active");
        loginModal.setAttribute("aria-hidden", "true");
    }

    // 4.5 Setup Guest Login Action
    const guestLoginBtn = document.getElementById("guest-login-btn");
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener("click", () => {
            // Save the intercepted level and boot them into the dashboard
            localStorage.setItem("selectedLevel", pendingGuestLevel);
            window.location.href = "dashboard.html";
        });
    }

    // 4.6 Auto-open Register Modal if redirected from Guest Profile
    if (localStorage.getItem("forceRegisterModal") === "true") {
        localStorage.removeItem("forceRegisterModal");
        openLoginModal();
        
        // Wait a small tick for the DOM to be ready to click the register tab
        setTimeout(() => {
            const tabRegister = document.getElementById("tab-register");
            if (tabRegister) tabRegister.click();
        }, 50);
    }

    // 5. Setup Login / Register Tab Switching
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const groupUsername = document.getElementById("group-username");
    const groupAge = document.getElementById("group-age");
    const btnSubmitAuth = document.getElementById("btn-submit-auth");
    
    let isRegisterMode = false;

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener("click", () => {
            isRegisterMode = false;
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            tabLogin.style.color = "var(--color-text-main)";
            tabRegister.style.color = "var(--color-text-muted)";
            
            groupUsername.style.display = "none";
            groupAge.style.display = "none";
            btnSubmitAuth.textContent = "Bejelentkezés";
            document.getElementById("auth-error").textContent = "";
        });

        tabRegister.addEventListener("click", () => {
            isRegisterMode = true;
            tabRegister.classList.add("active");
            tabLogin.classList.remove("active");
            tabRegister.style.color = "var(--color-text-main)";
            tabLogin.style.color = "var(--color-text-muted)";
            
            groupUsername.style.display = "flex";
            groupAge.style.display = "flex";
            btnSubmitAuth.textContent = "Regisztráció";
            document.getElementById("auth-error").textContent = "";
        });
    }

    // 6. Handle Auth Form Submission
    const authForm = document.getElementById("auth-form");
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("auth-email").value.trim();
            const password = document.getElementById("auth-password").value;
            const username = document.getElementById("auth-username").value.trim();
            const ageRange = document.getElementById("auth-age").value;
            const errorEl = document.getElementById("auth-error");

            errorEl.textContent = "";

            if (!supabaseClient) {
                errorEl.textContent = "Supabase kapcsolat nincs beállítva a js/config.js-ben!";
                return;
            }

            try {
                if (isRegisterMode) {
                    // Sign-up flow
                    if (!username) {
                        errorEl.textContent = "Kérjük, adj meg egy felhasználónevet!";
                        return;
                    }
                    if (!ageRange) {
                        errorEl.textContent = "Kérjük, válaszd ki az életkorodat!";
                        return;
                    }

                    // Check for existing guest data to migrate
                    const guestKey = "neolix_guest_progress";
                    const guestDataRaw = localStorage.getItem(guestKey);
                    let initialPoints = 0;
                    let initialCompleted = {};
                    let initialScores = {};

                    if (guestDataRaw) {
                        try {
                            const guestData = JSON.parse(guestDataRaw);
                            initialPoints = guestData.points || 0;
                            initialCompleted = guestData.completed || {};
                            initialScores = guestData.scores || {};
                        } catch(e) {
                            console.warn("Hiba a vendég adatok beolvasásakor", e);
                        }
                    }

                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                username: username,
                                name: username, // Explicitly tell Supabase UI to display this in the native column
                                age_range: ageRange,
                                guest_migration: {
                                    points: initialPoints,
                                    completed: initialCompleted,
                                    scores: initialScores
                                }
                            }
                        }
                    });

                    if (error) {
                        errorEl.textContent = error.message;
                        return;
                    }

                    const user = data.user;
                    if (user) {
                        if (data.session) {
                            // If confirmation is OFF, they are instantly logged in
                            localStorage.setItem("selectedLevel", "A1");
                            window.location.href = "dashboard.html";
                        } else {
                            // If confirmation is ON, they need to verify their email
                            const authModal = document.getElementById("login-modal");
                            if (authModal) {
                                authModal.classList.remove("is-active");
                                authModal.setAttribute("aria-hidden", "true");
                            }
                            
                            const verifyModal = document.getElementById("verify-email-modal");
                            if (verifyModal) {
                                verifyModal.classList.add("is-active");
                                verifyModal.setAttribute("aria-hidden", "false");
                            }
                        }
                    }
                } else {
                    // Sign-in flow
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) {
                        errorEl.textContent = error.message;
                        return;
                    }

                    localStorage.setItem("selectedLevel", "A1");
                    window.location.href = "dashboard.html";
                }
            } catch (err) {
                console.error("Auth hiba:", err);
                errorEl.textContent = "Hiba történt az azonosítás során.";
            }
        });
    }
});
