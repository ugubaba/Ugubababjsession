// Oyunlar arası geçiş + ses aç/kapat
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + view).classList.add("active");
  });
});

const soundToggle = document.getElementById("sound-toggle");
soundToggle.addEventListener("click", () => {
  const on = Sound.toggle();
  soundToggle.textContent = on ? "🔊" : "🔇";
  if (on) Sound.chip();
});
