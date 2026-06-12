// js/landing.js

document.addEventListener("DOMContentLoaded", () => {
    const levelButtons = document.querySelectorAll(".landing-level-btn");
    const wipModal = document.getElementById("wip-modal");
    const closeWipBtn = document.getElementById("close-wip-btn");

    levelButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const pickedLevel = button.getAttribute("data-level");

            if (pickedLevel === "A1") {
                // Save choice into browser storage memory
                localStorage.setItem("selectedLevel", pickedLevel);
                // Redirect user to the workspace page safely
                window.location.href = "dashboard.html";
            } else if (pickedLevel === "A2" || pickedLevel === "B1" || pickedLevel === "B2") {
                // Trigger the animated WIP modal overlay visibility
                openWipModal();
            }
        });
    });

    // Modal closing events
    closeWipBtn.addEventListener("click", closeWipModal);
    wipModal.addEventListener("click", (e) => {
        if (e.target === wipModal) closeWipModal();
    });

    function openWipModal() {
        wipModal.classList.add("is-active");
        wipModal.setAttribute("aria-hidden", "false");
    }

    function closeWipModal() {
        wipModal.classList.remove("is-active");
        wipModal.setAttribute("aria-hidden", "true");
    }
});
