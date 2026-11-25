const themeStorageKey = "orbit-theme";
const rootElement = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');

let currentTheme = "dark";

try {
  const savedTheme = localStorage.getItem(themeStorageKey);
  if (savedTheme === "light" || savedTheme === "dark") {
    currentTheme = savedTheme;
  }
} catch (error) {
  console.error("Could not read the saved theme preference.", error);
}

function applyTheme(theme) {
  currentTheme = theme;
  rootElement.dataset.theme = theme;

  if (themeMeta) {
    themeMeta.content = theme === "light" ? "#f4faff" : "#07111f";
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
    const nextTheme = theme === "light" ? "dark" : "light";
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    toggle.querySelector(".theme-toggle-icon").textContent = theme === "light" ? "☾" : "☼";
    toggle.querySelector(".theme-toggle-label").textContent = `${nextTheme === "light" ? "Light" : "Dark"} mode`;
  });
}

applyTheme(currentTheme);

document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme);

    try {
      localStorage.setItem(themeStorageKey, nextTheme);
    } catch (error) {
      console.error("Could not save the theme preference.", error);
    }
  });
});
