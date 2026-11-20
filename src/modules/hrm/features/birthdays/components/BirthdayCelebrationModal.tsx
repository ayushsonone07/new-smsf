import { useEffect, useRef, useState } from "react";
import { Sparkles, Cake, PartyPopper, X, Heart } from "lucide-react";
import { useAuth } from "../../auth";
import { useBirthdaysToday, useMyBirthdayStatus } from "../hooks/useBirthdays";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle" | "star";
  opacity: number;
}

const COLORS = [
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
];

export function BirthdayCelebrationModal() {
  const { user } = useAuth();
  const { data: status } = useMyBirthdayStatus();
  const { data: todayBirthdays = [] } = useBirthdaysToday();
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Match if today is current user's birthday
  const matchedBirthday = todayBirthdays.find((b) => {
    if (!user?.name) return false;
    const cleanUserName = user.name.trim().toLowerCase();
    const cleanBdayName = b.employeeName.trim().toLowerCase();
    return cleanBdayName === cleanUserName || cleanBdayName.includes(cleanUserName);
  });

  const isUserBirthdayToday = Boolean(
    status?.isBirthdayToday ||
    (status as unknown as { birthdayToday?: boolean })?.birthdayToday ||
    matchedBirthday
  );

  const employeeName =
    status?.employeeName ||
    matchedBirthday?.employeeName ||
    user?.name ||
    "Dear Teammate";
  const employeeAge = status?.age || matchedBirthday?.age || null;

  // Listen for manual trigger (e.g. from BirthdayWidget)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-birthday-celebration", handleOpen);
    return () => window.removeEventListener("open-birthday-celebration", handleOpen);
  }, []);

  // Check if today is birthday and not already dismissed today
  useEffect(() => {
    if (!isUserBirthdayToday) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const storageKey = `birthday_dismissed_${todayStr}`;
    const alreadySeen = localStorage.getItem(storageKey);

    if (!alreadySeen) {
      setIsOpen(true);
    }
  }, [isUserBirthdayToday]);

  // Run Confetti effect when opened
  useEffect(() => {
    if (!isOpen) return;

    triggerConfetti();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  function triggerConfetti() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Spawn 140 particles from left and right bottom corners shooting upwards
    const newParticles: Particle[] = [];
    for (let i = 0; i < 140; i++) {
      const fromLeft = i % 2 === 0;
      const angle = fromLeft
        ? -Math.PI / 4 + (Math.random() * 0.4 - 0.2)
        : (-3 * Math.PI) / 4 + (Math.random() * 0.4 - 0.2);
      const speed = 12 + Math.random() * 16;

      newParticles.push({
        x: fromLeft ? 0 : width,
        y: height - 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 7 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.4 ? "rect" : Math.random() > 0.5 ? "circle" : "star",
        opacity: 1,
      });
    }

    particlesRef.current = newParticles;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.985; // drag
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.0055;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === "rect") {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          } else if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Mini star
            ctx.fillRect(-p.size / 3, -p.size / 3, p.size * 0.7, p.size * 0.7);
          }
          ctx.restore();
        }
      }

      if (alive) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    }

    render();
  }

  function handleDismiss() {
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`birthday_dismissed_${todayStr}`, "true");
    setIsOpen(false);
  }

  if (!isOpen || !isUserBirthdayToday) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Fullscreen Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[10000] h-full w-full"
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={handleDismiss}
      />

      {/* Festive Celebration Card */}
      <div className="relative z-[10001] w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-b from-card via-card to-card/95 p-6 shadow-2xl sm:p-8">
        {/* Glowing Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-amber-500/40 blur-3xl" />

        {/* Floating Emojis / Balloons Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none opacity-40">
          <span className="absolute top-3 left-6 text-2xl anim-balloon-rise">🎈</span>
          <span className="absolute top-12 right-8 text-2xl anim-balloon-rise" style={{ animationDelay: "1s" }}>🎈</span>
          <span className="absolute bottom-6 left-10 text-xl anim-star-sparkle">✨</span>
          <span className="absolute bottom-10 right-12 text-2xl anim-star-sparkle" style={{ animationDelay: "0.5s" }}>⭐</span>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="relative z-10 text-center space-y-4">
          {/* Animated Cake Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 text-white shadow-xl shadow-pink-500/25 animate-bounce">
            <Cake size={42} />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-600 dark:text-pink-300">
              <PartyPopper size={14} />
              <span>TODAY IS YOUR BIRTHDAY!</span>
              <Sparkles size={14} className="text-amber-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Happy Birthday, <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">{employeeName}</span>! 🎉
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Wishing You A Fantastic Year Ahead! 🌟
            </p>
          </div>

          {/* Warm Message Card */}
          <div className="rounded-2xl border border-pink-500/20 bg-surface-muted/40 p-4 text-xs sm:text-sm text-foreground/85 leading-relaxed text-left space-y-2">
            <p className="font-semibold text-pink-600 dark:text-pink-400">
              Happy Birthday from the entire MBG Card India Pvt Ltd crew! 🎉🚀
            </p>
            <p>
              Building something great takes amazing people, and we’re so glad you’re on this journey with us. Thank you for bringing your energy, ideas, and hard work to the team every single day.
            </p>
            <p className="text-muted-foreground">
              Take some time today to celebrate, recharge, and enjoy your special day. Here’s to another awesome year ahead!
            </p>
            <div className="pt-2 border-t border-border/60 text-xs font-bold text-foreground/90">
              Cheers, <span className="text-primary font-extrabold">Team MBG Card India Pvt Ltd</span> ❤️
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={triggerConfetti}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              <PartyPopper size={16} className="text-pink-500" />
              <span>Celebrate Again 🎊</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              <Heart size={16} className="fill-white" />
              <span>Thank you! ❤️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
