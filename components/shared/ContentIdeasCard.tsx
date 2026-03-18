"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Lightbulb } from "lucide-react";

interface ContentIdea {
  hook: string;
  topic: string;
  angle: string;
  hookColor: string;
}

const IDEAS_POOL: ContentIdea[] = [
  // Exit Velo / Hitting
  { hook: "Myth Bust",       topic: "Exit Velo",        angle: "Size doesn't determine power — here's the science",       hookColor: "#ef4444" },
  { hook: "Transformation",  topic: "Exit Velo",        angle: "Before/after: adding 8 mph EV in 30 days (what changed)", hookColor: "#22c55e" },
  { hook: "Data / Study",    topic: "Exit Velo",        angle: "We tracked 200 youth hitters — this one drill moved the needle most", hookColor: "#3b82f6" },
  { hook: "Myth Bust",       topic: "Hitting",          angle: "Stop squishing the bug — why that cue is killing bat speed", hookColor: "#ef4444" },
  { hook: "Result-Led",      topic: "Hitting",          angle: "This 5-minute tee drill added 6 mph EV to a 14-year-old",  hookColor: "#14b8a6" },
  { hook: "Transformation",  topic: "Hitting",          angle: "We filmed his swing every week for 3 months — watch what happened", hookColor: "#22c55e" },
  { hook: "Myth Bust",       topic: "Hitting Mechanics", angle: "Keep your eye on the ball is wrong — here's the real cue",               hookColor: "#ef4444" },
  { hook: "Revelation",      topic: "Hitting Mechanics", angle: "The one mechanical flaw in 90% of youth hitters (and how to fix it)",     hookColor: "#3b82f6" },
  { hook: "Result-Led",      topic: "Hitting Mechanics", angle: "This hip rotation drill adds 15 feet of distance in one session",         hookColor: "#14b8a6" },

  // Recruiting
  { hook: "Story / Case Study", topic: "Recruiting",   angle: "He had zero D1 offers at 16. Here's what he did for the next 18 months", hookColor: "#d946ef" },
  { hook: "Exposé",          topic: "Recruiting",       angle: "What college coaches actually see when they open your profile",  hookColor: "#f59e0b" },
  { hook: "Myth Bust",       topic: "Recruiting",       angle: "The GPA myth: does it really matter for baseball scholarships?", hookColor: "#ef4444" },
  { hook: "Revelation",      topic: "Recruiting",       angle: "The email subject line that gets coaches to actually respond",   hookColor: "#3b82f6" },
  { hook: "Data / Study",    topic: "Recruiting",       angle: "I analyzed 100 recruiting profiles — here are the 3 things that stand out", hookColor: "#3b82f6" },
  { hook: "Story / Case Study", topic: "Recruiting",   angle: "2027 grad: 12 D2 offers and never played a Perfect Game event", hookColor: "#d946ef" },
  { hook: "Exposé",          topic: "Recruiting",       angle: "The recruiting timeline nobody shows you (with real dates)",    hookColor: "#f59e0b" },
  { hook: "Myth Bust",       topic: "Recruiting",       angle: "You don't need a 90 mph fastball to play D1 — here's proof",   hookColor: "#ef4444" },

  // Showcases
  { hook: "Exposé",          topic: "Showcases",        angle: "Is Perfect Game worth $500? We asked 30 college coaches",       hookColor: "#f59e0b" },
  { hook: "Myth Bust",       topic: "Showcases",        angle: "More showcases ≠ more offers. The math doesn't work",           hookColor: "#ef4444" },
  { hook: "Revelation",      topic: "Showcases",        angle: "What coaches are actually watching at a showcase (it's not the game)", hookColor: "#3b82f6" },
  { hook: "Data / Study",    topic: "Showcases",        angle: "We tracked 50 players at the same showcase — only 3 got calls. Why?", hookColor: "#3b82f6" },

  // Pitching / Velocity
  { hook: "Myth Bust",       topic: "Velocity",         angle: "Long toss is overrated for velo gains — here's what the data says", hookColor: "#ef4444" },
  { hook: "Data / Study",    topic: "Velocity",         angle: "We tested 3 weighted ball programs — here's the only one that worked", hookColor: "#3b82f6" },
  { hook: "Result-Led",      topic: "Velocity",         angle: "From 78 to 87 mph in one off-season: exactly what he trained",  hookColor: "#14b8a6" },
  { hook: "Revelation",      topic: "Pitching",         angle: "The grip change that added 4 mph without touching mechanics",   hookColor: "#3b82f6" },
  { hook: "Myth Bust",       topic: "Pitching",         angle: "Kids shouldn't throw curveballs — but here's what the research actually says", hookColor: "#ef4444" },

  // Mindset / Development
  { hook: "Story / Case Study", topic: "Player Dev",   angle: "He got cut twice. Here's the mindset that got him a D1 offer", hookColor: "#d946ef" },
  { hook: "Revelation",      topic: "Player Dev",       angle: "The off-season training mistake most parents make",             hookColor: "#3b82f6" },
  { hook: "Myth Bust",       topic: "Player Dev",       angle: "Specializing at 13 is costing your kid offers — here's why",   hookColor: "#ef4444" },
  { hook: "Transformation",  topic: "Player Dev",       angle: "12 months of training. One athlete. Watch the entire journey.", hookColor: "#22c55e" },

  // Parent / Coach angle
  { hook: "Revelation",      topic: "Coaching / Parents", angle: "What parents say at games that actually hurts their kid's recruiting", hookColor: "#3b82f6" },
  { hook: "Myth Bust",       topic: "Coaching / Parents", angle: "Travel ball at 10 years old: worth it or a waste of money?", hookColor: "#ef4444" },
  { hook: "Exposé",          topic: "Coaching / Parents", angle: "The conversation you need to have with your kid's coach right now", hookColor: "#f59e0b" },
];

const HOOK_BG: Record<string, string> = {
  "Myth Bust":    "rgba(239,68,68,0.15)",
  "Transformation":"rgba(34,197,94,0.15)",
  "Exposé":       "rgba(245,158,11,0.15)",
  "Story / Case Study":"rgba(217,70,239,0.15)",
  "Revelation":   "rgba(59,130,246,0.15)",
  "Result-Led":   "rgba(20,184,166,0.15)",
  "Data / Study": "rgba(59,130,246,0.15)",
};

function pickRandom(pool: ContentIdea[], n: number, exclude?: number[]): number[] {
  const available = pool.map((_, i) => i).filter((i) => !exclude?.includes(i));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function ContentIdeasCard() {
  const [indices, setIndices] = useState<number[]>(() => pickRandom(IDEAS_POOL, 4));
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      setIndices((prev) => pickRandom(IDEAS_POOL, 4, prev));
      setSpinning(false);
    }, 350);
  }, []);

  const ideas = indices.map((i) => IDEAS_POOL[i]);

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Content Ideas
          </span>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 active:scale-95"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <RefreshCw
            size={11}
            style={{
              transition: "transform 0.35s ease",
              transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
            }}
          />
          Refresh
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
        Angles to steal from the viral log
      </p>

      {/* Ideas */}
      <div className="space-y-3">
        {ideas.map((idea, i) => (
          <div
            key={`${indices[i]}-${i}`}
            className="p-3 rounded-xl border"
            style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: HOOK_BG[idea.hook] ?? "rgba(100,116,139,0.15)", color: idea.hookColor }}
              >
                {idea.hook}
              </span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {idea.topic}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
              {idea.angle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
