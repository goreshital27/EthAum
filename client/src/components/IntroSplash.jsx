import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';

const SPLASH_SESSION_KEY = 'ethaum_intro_seen';

const PARTICLES = [
  { id: 1, left: '12%', bottom: '20%', size: 3, delay: '0.2s', duration: '3.6s', opacity: 0.5 },
  { id: 2, left: '24%', bottom: '14%', size: 2, delay: '0.8s', duration: '4.2s', opacity: 0.4 },
  { id: 3, left: '36%', bottom: '26%', size: 4, delay: '0.4s', duration: '3.8s', opacity: 0.6 },
  { id: 4, left: '48%', bottom: '12%', size: 3, delay: '1.2s', duration: '4.0s', opacity: 0.5 },
  { id: 5, left: '60%', bottom: '22%', size: 2, delay: '0.6s', duration: '3.5s', opacity: 0.4 },
  { id: 6, left: '72%', bottom: '16%', size: 4, delay: '1.0s', duration: '4.4s', opacity: 0.6 },
  { id: 7, left: '86%', bottom: '25%', size: 3, delay: '0.3s', duration: '3.9s', opacity: 0.5 },
  { id: 8, left: '18%', bottom: '32%', size: 2, delay: '1.4s', duration: '3.7s', opacity: 0.35 },
  { id: 9, left: '30%', bottom: '36%', size: 3, delay: '0.5s', duration: '4.1s', opacity: 0.55 },
  { id: 10, left: '42%', bottom: '28%', size: 2, delay: '1.1s', duration: '3.4s', opacity: 0.45 },
  { id: 11, left: '56%', bottom: '34%', size: 4, delay: '0.7s', duration: '4.3s', opacity: 0.5 },
  { id: 12, left: '66%', bottom: '24%', size: 3, delay: '1.3s', duration: '3.6s', opacity: 0.4 },
  { id: 13, left: '80%', bottom: '35%', size: 2, delay: '0.9s', duration: '4.0s', opacity: 0.6 },
  { id: 14, left: '92%', bottom: '18%', size: 3, delay: '1.5s', duration: '3.5s', opacity: 0.45 },
];

export default function IntroSplash() {
  const [isVisible, setIsVisible] = useState(() => {
    // 6. Check sessionStorage (inside try/catch)
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return false;
      const seen = window.sessionStorage.getItem(SPLASH_SESSION_KEY);
      if (seen) return false;
    } catch {
      return false;
    }

    // 7. Check prefers-reduced-motion
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  });

  const [isFading, setIsFading] = useState(false);

  // Mark session as seen immediately on mount
  useEffect(() => {
    if (!isVisible) return;

    try {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // Storage unavailable / private mode
    }

    // 5. Total duration ~3 seconds, then fade out over 400ms and unmount
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2850);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3250);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [isVisible]);

  // 8. Lock body scroll only while splash is visible
  useEffect(() => {
    if (!isVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isVisible]);

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  if (!isVisible) return null;

  const letters = ['E', 't', 'h', 'A', 'u', 'm'];

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white overflow-hidden transition-opacity duration-400 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <style>{`
        @keyframes drawOctagon {
          0% {
            stroke-dashoffset: 100;
            opacity: 0.3;
          }
          15% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.45)) drop-shadow(0 0 16px rgba(13, 148, 136, 0.25));
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(45, 212, 191, 0.85)) drop-shadow(0 0 28px rgba(13, 148, 136, 0.55));
          }
        }

        @keyframes fadeInEmblemIcon {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }
          65% {
            opacity: 0.85;
            transform: scale(1.06);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes letterSlideUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drawCoralLine {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        @keyframes fadeTaglineSmall {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatParticle {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: var(--particle-opacity, 0.5);
          }
          75% {
            opacity: var(--particle-opacity, 0.5);
          }
          100% {
            transform: translateY(-90px) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>

      {/* Background ambient radial glow in brand teal */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.18)_0%,transparent_70%)] pointer-events-none" />

      {/* 4. 14 Drifting Teal Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-teal-400 blur-[0.5px]"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `floatParticle ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
              '--particle-opacity': p.opacity,
            }}
          />
        ))}
      </div>

      {/* Center Cinematic Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
        {/* 2. Centre Emblem: SVG Rounded Octagon in Teal + Pulsing Glow */}
        <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mb-6">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{
              animation: 'pulseGlow 2.4s ease-in-out infinite 1.1s',
            }}
          >
            <path
              d="M 42 10 L 78 10 Q 82 10 85 13 L 107 35 Q 110 38 110 42 L 110 78 Q 110 82 107 85 L 85 107 Q 82 110 78 110 L 42 110 Q 38 110 35 107 L 13 85 Q 10 82 10 78 L 10 42 Q 10 38 13 35 L 35 13 Q 38 10 42 10 Z"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="100"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: 'drawOctagon 1.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            />
          </svg>

          {/* Existing HeartPulse Icon inside the emblem */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              animation: 'fadeInEmblemIcon 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both',
            }}
          >
            <HeartPulse className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]" />
          </div>
        </div>

        {/* 3. Title: "EthAum" letter by letter with teal-to-white gradient */}
        <div className="flex items-center justify-center select-none">
          {letters.map((letter, idx) => (
            <span
              key={idx}
              className="inline-block text-4xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent"
              style={{
                animation: `letterSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.75 + idx * 0.08}s both`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Thin coral underline drawing left to right */}
        <div
          className="w-20 sm:w-24 md:w-28 h-0.5 bg-rose-500 rounded-full mt-2.5 origin-left"
          style={{
            animation: 'drawCoralLine 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.35s both',
          }}
        />

        {/* Tagline */}
        <p
          className="text-xs sm:text-sm text-slate-300/90 font-medium tracking-wide mt-3.5 max-w-md"
          style={{
            animation: 'fadeTaglineSmall 0.8s ease-out 1.6s both',
          }}
        >
          Accredited Global Healthcare, Coordinated With Care
        </p>
      </div>

      {/* 5. Skip button at bottom right */}
      <button
        type="button"
        onClick={handleSkip}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-teal-400/50 backdrop-blur-sm transition-all shadow-sm cursor-pointer"
      >
        Skip &rarr;
      </button>
    </div>
  );
}
