"use client";

const COLORS = ["#c84028", "#ffd23f", "#3ddc84", "#4cc9f0", "#ff6b9d", "#ffffff"];

/** Estalla confeti desde el centro de `host` (debe tener position: relative). Respeta "reducir movimiento". */
export function burstConfetti(host: HTMLElement | null, count = 26) {
  if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 70 + Math.random() * 110;
    bit.className = "confetti-bit";
    bit.style.background = COLORS[i % COLORS.length];
    bit.style.borderRadius = i % 3 === 0 ? "50%" : "1px";
    bit.style.zIndex = "30";
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist - 30}px`);
    bit.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    host.appendChild(bit);
    setTimeout(() => bit.remove(), 1000);
  }
}
