const authDialog = document.querySelector(".auth-dialog");
const authForm = document.querySelector(".auth-form");
const authTitle = document.querySelector("#auth-title");
const authSubmit = document.querySelector(".auth-submit");
const nameField = document.querySelector(".name-field");
const passwordField = authForm.elements.password;
const formMessage = document.querySelector(".form-message");
const roleOptions = [...document.querySelectorAll("[data-role-option]")];
const modeOptions = [...document.querySelectorAll("[data-mode-option]")];
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const heroVisual = document.querySelector(".hero-visual");
const loginButton = document.querySelector('.header-actions [data-auth="login"]');
const joinButton = document.querySelector('.header-actions [data-auth="signup"]');

let selectedRole = "client";
let selectedMode = "signup";
let currentUser = null;

function updateAuthDialog() {
  const roleName = selectedRole === "client" ? "client" : "freelancer";
  const isSignup = selectedMode === "signup";

  authTitle.textContent = isSignup ? "Create your account" : "Welcome back";
  authSubmit.innerHTML = `${isSignup ? "Create" : "Log in to"} ${roleName} account <span class="arrow" aria-hidden="true">↗</span>`;
  nameField.hidden = !isSignup;
  nameField.querySelector("input").required = isSignup;
  passwordField.autocomplete = isSignup ? "new-password" : "current-password";
  passwordField.placeholder = isSignup ? "At least 8 characters" : "Your password";
  passwordField.minLength = isSignup ? 8 : 1;
  formMessage.textContent = "";
  authForm.reset();
  roleOptions.forEach((option) => option.classList.toggle("is-selected", option.dataset.roleOption === selectedRole));
  modeOptions.forEach((option) => option.classList.toggle("is-selected", option.dataset.modeOption === selectedMode));
}

document.querySelectorAll("[data-auth]").forEach((button) => {
  button.addEventListener("click", () => {
    if (currentUser) {
      window.location.assign("/dashboard.html");
      return;
    }

    selectedRole = button.dataset.role;
    selectedMode = button.dataset.auth;
    updateAuthDialog();
    authDialog.showModal();
  });
});

roleOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedRole = option.dataset.roleOption;
    updateAuthDialog();
  });
});

modeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedMode = option.dataset.modeOption;
    updateAuthDialog();
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isSignup = selectedMode === "signup";
  const formData = new FormData(authForm);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  if (isSignup) {
    payload.name = formData.get("name");
    payload.role = selectedRole;
  }

  authSubmit.disabled = true;
  formMessage.textContent = "";

  try {
    let response;
    try {
      response = await fetch(isSignup ? "/api/signup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      formMessage.textContent = "Unable to reach Orbit. Please check your connection and try again.";
      return;
    }

    let result;
    try {
      result = await response.json();
    } catch {
      formMessage.textContent = "Something went wrong. Please try again.";
      return;
    }

    if (!response.ok) {
      formMessage.textContent = result.error || "Unable to authenticate. Please try again.";
      return;
    }

    window.location.assign("/dashboard.html");
  } finally {
    authSubmit.disabled = false;
  }
});

fetch("/api/me")
  .then((response) => {
    if (!response.ok) return null;
    return response.json();
  })
  .then((result) => {
    if (!result?.user) return;
    currentUser = result.user;
    loginButton.hidden = true;
    joinButton.textContent = "Dashboard";
  })
  .catch((error) => {
    console.error("Could not check the current session.", error);
  });

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  mainNav.classList.toggle("is-open", !isOpen);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

const revealTargets = document.querySelectorAll(".trusted, .intro-section, .audience-card, .closing-banner");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  revealTargets.forEach((target) => {
    target.classList.add("reveal-on-scroll");
    revealObserver.observe(target);
  });
}

if (heroVisual && window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
  heroVisual.addEventListener("pointermove", (event) => {
    const bounds = heroVisual.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroVisual.style.setProperty("--tilt-x", `${-y * 5}deg`);
    heroVisual.style.setProperty("--tilt-y", `${x * 5}deg`);
  });

  heroVisual.addEventListener("pointerleave", () => {
    heroVisual.style.setProperty("--tilt-x", "0deg");
    heroVisual.style.setProperty("--tilt-y", "0deg");
  });
}
