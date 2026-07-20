"use client";

import type { ContentIdea } from "@/lib/rwa/autopilot";
import { AGENT_MAX_CADENCE, AGENT_MIN_CADENCE, AGENT_PLATFORMS, type AgentConfig, agentStatus } from "@/lib/rwa/agent";
import { teamById } from "@/lib/rwa/teams";

export function AutopilotPanel({
  ideas,
  postedIds,
  onPost,
  onRefresh,
  onCreate,
  config,
  onConfig,
  connected = false,
  queueMode = "local",
}: {
  ideas: ContentIdea[];
  postedIds: Set<string>;
  onPost: (idea: ContentIdea) => void;
  onRefresh: () => void;
  onCreate?: (idea: ContentIdea) => void;
  config: AgentConfig;
  onConfig: (patch: Partial<AgentConfig>) => void;
  connected?: boolean;
  /** "cloud" when the drafts come from the hosted agent's server-side queue (rwa_agent_drafts). */
  queueMode?: "cloud" | "local";
}) {
  const auto = config.autoPublish;
  // Points earned from the drafts in this batch that have been posted (off-chain → RWAX at withdrawal).
  const earned = ideas.reduce((sum, i) => (postedIds.has(i.id) ? sum + i.rewardPts : sum), 0);
  const togglePlatform = (p: (typeof AGENT_PLATFORMS)[number]) => {
    const has = config.platforms.includes(p);
    const next = has ? config.platforms.filter((x) => x !== p) : [...config.platforms, p];
    onConfig({ platforms: next });
  };

  return (
    <div className="rounded-2xl border border-line bg-bg p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fg text-bg">✦</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-fg">Your Managed Agent</span>
              {queueMode === "cloud" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-400" title="These drafts were produced server-side by your hosted agent on its schedule">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" /> Hosted queue · live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-line2 px-2 py-0.5 text-[9px] font-semibold text-fgMuted" title="Runs on RWA-DAO infrastructure — no VPS, no install">
                  ☁ Hosted · no setup
                </span>
              )}
            </div>
            <div className="text-[11px] text-fgMuted">{agentStatus(config)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="eyebrow text-fgMuted">Earned</div>
            <div className="text-lg font-bold tabular-nums text-fg">{earned.toLocaleString()} pts</div>
          </div>
          <button
            type="button"
            onClick={() => onConfig({ enabled: !config.enabled })}
            aria-pressed={config.enabled}
            className={[
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-opacity",
              config.enabled ? "border border-line2 text-fgSoft hover:border-fg" : "bg-fg text-bg hover:opacity-90",
            ].join(" ")}
          >
            {config.enabled ? "Pause agent" : "Activate agent"}
          </button>
        </div>
      </div>

      {/* Config row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-line bg-bg2 p-3">
        <span className="inline-flex items-center gap-2">
          <span className="eyebrow text-fgMuted">Drafts/day</span>
          <span className="inline-flex items-center gap-1.5">
            <button type="button" aria-label="Fewer drafts" onClick={() => onConfig({ cadencePerDay: Math.max(AGENT_MIN_CADENCE, config.cadencePerDay - 1) })} className="flex h-6 w-6 items-center justify-center rounded-full border border-line2 text-fgSoft hover:border-fg">−</button>
            <span className="w-5 text-center text-sm font-bold tabular-nums text-fg">{config.cadencePerDay}</span>
            <button type="button" aria-label="More drafts" onClick={() => onConfig({ cadencePerDay: Math.min(AGENT_MAX_CADENCE, config.cadencePerDay + 1) })} className="flex h-6 w-6 items-center justify-center rounded-full border border-line2 text-fgSoft hover:border-fg">+</button>
          </span>
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="eyebrow text-fgMuted">Publish</span>
          <span className="inline-flex rounded-full border border-line2 bg-bg p-0.5" role="group" aria-label="Publish mode">
            {([["manual", "One-tap"], ["auto", "Auto"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => onConfig({ autoPublish: m === "auto" })}
                aria-pressed={auto === (m === "auto")}
                className={["rounded-full px-2.5 py-1 text-xs font-semibold transition-colors", auto === (m === "auto") ? "bg-fg text-bg" : "text-fgMuted hover:text-fg"].join(" ")}
              >
                {label}
              </button>
            ))}
          </span>
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="eyebrow text-fgMuted">On</span>
          <span className="flex flex-wrap gap-1">
            {AGENT_PLATFORMS.map((p) => {
              const on = config.platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  aria-pressed={on}
                  className={["rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors", on ? "bg-fg text-bg" : "border border-line2 text-fgMuted hover:text-fg"].join(" ")}
                >
                  {p}
                </button>
              );
            })}
          </span>
        </span>

        <button
          type="button"
          onClick={onRefresh}
          className="ml-auto rounded-full border border-line2 px-3 py-1.5 text-xs font-semibold text-fgSoft transition-colors hover:border-fg hover:text-fg"
        >
          Refresh batch
        </button>
      </div>

      {/* Auto-publish (Phase 2): connect socials so the agent can post via official APIs. */}
      {auto && !connected ? (
        <div className="mt-4 rounded-xl border border-line2 bg-bg2 p-4">
          <div className="text-sm font-semibold text-fg">Connect your socials to go fully auto</div>
          <p className="mt-1 text-[11px] leading-relaxed text-fgMuted">
            Your agent publishes for you via the platforms&apos; <span className="font-semibold text-fgSoft">official APIs</span> (TikTok
            Content Posting, Meta Graph, X API) — sanctioned automation, not bots. Views &amp; engagement flow back to auto-credit rewards.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENT_PLATFORMS.map((sn) => (
              <button
                key={sn}
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-3 py-1.5 text-xs font-semibold text-fgMuted opacity-70"
                title="Coming in Phase 2 (needs a business account + platform app review)"
              >
                Connect {sn} <span className="rounded-full bg-bg3 px-1.5 py-0.5 text-[9px]">Soon</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* The agent's drafts */}
      {queueMode === "cloud" && ideas.length === 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-bg2 p-6 text-center text-sm text-fgMuted">
          You&apos;re all caught up — your hosted agent tops up the queue on its schedule
          ({config.cadencePerDay}/day). New drafts appear here automatically.
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => {
          const posted = postedIds.has(idea.id);
          const team = teamById(idea.teamId);
          return (
            <div key={idea.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-bg2">
              <div className="relative aspect-video bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={idea.watchImage} alt={idea.watchTitle} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">{idea.platform}</span>
                {team.id !== "none" ? (
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">{team.flag} {team.name}</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="text-sm font-semibold text-fg">{idea.presetTitle}</div>
                <div className="text-[11px] text-fgMuted">{idea.personaName} · {idea.sceneTitle}</div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-fgSoft">{idea.caption}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-fg">+{idea.rewardPts} pts</span>
                  <div className="flex items-center gap-1.5">
                    {onCreate ? (
                      <button
                        type="button"
                        onClick={() => onCreate(idea)}
                        className="rounded-full border border-line2 px-3 py-1.5 text-xs font-semibold text-fgSoft transition-colors hover:border-fg hover:text-fg"
                      >
                        Make in Studio
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onPost(idea)}
                      disabled={posted}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity",
                        posted ? "border border-line2 text-fgMuted" : "bg-fg text-bg hover:opacity-90",
                      ].join(" ")}
                    >
                      {posted ? "Posted ✓" : auto ? "Queue" : "Post & earn"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-fgMuted">
        Hosted by RWA-DAO — no VPS, no install. Publishing stays {auto ? "on your connected accounts (official APIs)" : "one-tap (you post, not a bot)"} — ToS-safe.
      </p>
    </div>
  );
}
