// js/landing.js

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Supabase Client
    let supabaseClient = null;
    if (typeof SUPABASE_URL !== "undefined" && typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_URL !== "YOUR_SUPABASE_URL") {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Check if user is already logged in and update UI accordingly
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                const navLoginLink = document.querySelector('a[href="#login"]');
                if (navLoginLink) {
                    navLoginLink.textContent = "Tanuló Felület";
                    navLoginLink.href = "dashboard.html";
                    // It will now just act as a normal link to dashboard.html 
                    // instead of opening the login modal.
                }
            }
        });
    }

    // 2. Setup Level Card Redirection for Guests
    const levelButtons = document.querySelectorAll(".landing-level-btn");
    levelButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const pickedLevel = button.getAttribute("data-level");

            if (pickedLevel === "A1") {
                localStorage.setItem("selectedLevel", pickedLevel);
                window.location.href = "dashboard.html";
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

                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                username: username,
                                age_range: ageRange
                            }
                        }
                    });

                    if (error) {
                        errorEl.textContent = error.message;
                        return;
                    }

                    const user = data.user;
                    if (user) {
                        // Create their initial user_progress row in the database
                        const { error: dbError } = await supabaseClient
                            .from('user_progress')
                            .insert({
                                id: user.id,
                                username: username,
                                age_range: ageRange,
                                points: 0,
                                completed: {},
                                scores: {}
                            });

                        if (dbError) {
                            console.error("Hiba a profil mentésekor:", dbError);
                        }
                        
                        localStorage.setItem("selectedLevel", "A1");
                        window.location.href = "dashboard.html";
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
