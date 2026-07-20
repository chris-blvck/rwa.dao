// "AI Auto-pilot" — the agent that works for the user (the open-claw vision, done ToS-safe).
// It drafts a daily batch of ready-to-post content (watch · style · creator · scene · team +
// caption + platform + reward-points estimate). The user reviews, posts in one tap, and earns.
// Human-in-the-loop: the agent prepares, the user publishes — no autonomous bot-posting.

import { ASSETS, BACKGROUNDS, PERSONAS, PRESETS } from "./catalog";
import { captionFor, CAPTION_PLATFORMS, type Platform } from "./captions";
import { TEAMS } from "./teams";

export type ContentIdea = {
  id: string;
  watchId: string;
  presetId: string;
  personaId: string;
  backgroundId: string;
  teamId: string;
  watchTitle: string;
  watchImage: string;
  presetTitle: string;
  personaName: string;
  sceneTitle: string;
  platform: Platform;
  caption: string;
  rewardPts: number;
};

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

// Deterministic per-idea reward so a batch is stable across renders (200–499 points).
function rewardForIdea(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 200 + ((h >>> 0) % 300);
}

/**
 * Draft a batch of ready-to-post content ideas. `offset` rotates the picks for "refresh".
 * `platforms` restricts which channels the agent targets (the config picker) — empty/undefined
 * means all supported platforms.
 */
export function generateBatch(count: number, offset: number, platforms?: Platform[]): ContentIdea[] {
  const out: ContentIdea[] = [];
  // Skip the "none" team (index 0) so auto-pilot ideas always feature a team colourway.
  const realTeams = TEAMS.slice(1);
  const targets = platforms && platforms.length ? platforms : CAPTION_PLATFORMS;
  for (let i = 0; i < count; i++) {
    const k = offset + i;
    const preset = pick(PRESETS, k);
    const watch = pick(ASSETS, k + 1);
    const persona = pick(PERSONAS, k + 2);
    const background = pick(BACKGROUNDS, k + 3);
    const team = pick(realTeams, k + 4);
    const platform = pick(targets, k);
    const id = `idea-${offset}-${i}`;
    const cap = captionFor(platform, { watch, persona, preset });
    out.push({
      id,
      watchId: watch.asset_id,
      presetId: preset.preset_id,
      personaId: persona.model_id,
      backgroundId: background.background_id,
      teamId: team.id,
      watchTitle: watch.title,
      watchImage: watch.image,
      presetTitle: preset.title,
      personaName: persona.display_name,
      sceneTitle: background.title,
      platform,
      caption: cap.full,
      rewardPts: rewardForIdea(id),
    });
  }
  return out;
}
