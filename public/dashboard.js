const welcomeMessage = document.querySelector("#welcome-message");
const roleMessage = document.querySelector("#role-message");
const logoutButton = document.querySelector("#logout-button");

async function loadDashboard() {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) {
      window.location.replace("/");
      return;
    }

    const { user } = await response.json();
    welcomeMessage.textContent = `Welcome, ${user.name}`;
    roleMessage.textContent = user.role === "client"
      ? "Find the independent talent to bring your next idea to life."
      : "Discover meaningful projects that move your freelance career forward.";
  } catch {
    window.location.replace("/");
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) throw new Error("Could not log out.");
    window.location.replace("/");
  } catch {
    logoutButton.disabled = false;
    roleMessage.textContent = "Unable to log out. Please try again.";
  }
});

loadDashboard();
