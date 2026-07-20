"use client";

// Shared studio state for the multi-page app. All state/handlers that used to live in the single
// page component now live here, provided at the layout level so they persist across route
// navigations (/studio, /mint, /dashboard, /leaderboard). Screens read it via useStudio().

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { rwaClient } from "./client";
import {
  ASSETS,
  BACKGROUNDS,
  DEFAULT_SELECTION,
  HOOKS,
  MUSIC,
  PERSONAS,
  PRESETS,
  type CatalogSelection,
} from "./catalog";
import { DEMO_LEADERBOARD, type LeaderEntry, mockMetrics, rankEntries } from "./leaderboard";
import { AUTO_MODEL_ID, priceFor, resolveModel, XDC_USD_FALLBACK } from "./pricing";
import { TEAMS, teamById } from "./teams";
import { refCode, refLink } from "./referral";
import { POST_REWARD_POINTS } from "./mint";
import { type ContentIdea } from "./autopilot";
import { type AgentConfig, runAgentTick } from "./agent";
import { canUseDevLiveMode, modeCookie, normalizeUiMode } from "./dev_mode";
import type { SessionState, WalletInfo } from "./types";
import {
  DEFAULT_CREDITS,
  DEFAULT_SETTINGS,
  getAgentConfig,
  getCredits,
  getEconomy,
  getSavedWallet,
  getSettings,
  loadLastSelection,
  newId,
  saveEconomy,
  saveLastSelection,
  saveSettings,
  saveWallet,
  setCredits as persistCredits,
  type Creation,
  type OutputSettings,
} from "./storage";
import { DEFAULT_AGENT_CONFIG } from "./agent";
import { loadAgentConfig, saveAgentConfig } from "./agent_store";
import { loadAgentQueue, markAgentDraft, type QueuedDraft } from "./agent_queue";
import { addToLibrary, initLibrary, type LibraryMode, listLibrary, removeFromLibrary, updateInLibrary } from "./library";
import { type Platform } from "./captions";
import { runPremiumSessionSequence } from "./live_sequence";
import { pollGeneration } from "./generate_client";
import { pollCompose } from "./compose_client";
import { referenceFor } from "./references";
import { fetchMintState, type MintState, submitMint } from "./mint_client";
import { captureReferral, joinAmbassador as persistAmbassador, loadAmbassador, stableSeed } from "./ambassador";

export type Json = Record<string, any>;
export type Gallery = "watch" | "creator" | "style" | "scene" | "hook" | "music" | null;
// Two-stage generation: idle → composing (stage 1 still) → frame (preview/regenerate) → rendering
// (stage 2 video) → ready. Free/local engine skips compose and goes straight to rendering.
export type Phase = "idle" | "composing" | "frame" | "rendering" | "ready";
export type Toast = { id: number; tone: "ok" | "err"; text: string };

export const DEV_LIVE_MODE_ENABLED = canUseDevLiveMode();

function useStudioController() {
  const [mounted, setMounted] = useState(false);
  const [uiMode, setUiMode] = useState<"canned" | "live">("canned");
  const [busy, setBusy] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Gallery>(null);
  const [xdcUsd, setXdcUsd] = useState<number>(XDC_USD_FALLBACK);
  const [xdcLive, setXdcLive] = useState(false);
  const [ambassadorCode, setAmbassadorCode] = useState("");
  const [referredBy, setReferredBy] = useState(""); // upline captured from ?ref= — credited when this user mints
  const [refCopied, setRefCopied] = useState(false);
  const [points, setPoints] = useState(0);
  const [batchOffset, setBatchOffset] = useState(0);
  const [postedIds, setPostedIds] = useState<Set<string>>(() => new Set());
  // Drafts the hosted agent enqueued server-side (rwa_agent_drafts). In cloud mode these ARE the
  // autopilot batch (even when empty → "all caught up"); in demo mode the batch is generated
  // client-side. `agentCloud` tracks the mode independently of the current queue length so an empty
  // cloud queue never silently falls back to the infinite demo batch.
  const [agentQueue, setAgentQueue] = useState<QueuedDraft[]>([]);
  const [agentCloud, setAgentCloud] = useState(false);
  const [agentConfig, setAgentConfigState] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);

  const [session, setSession] = useState<SessionState | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [paid, setPaid] = useState<Json | null>(null);
  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null);
  // Multi-take: the same brief rendered 1–3 times with distinct seeds; the creator keeps the best.
  const [takes, setTakes] = useState(1);
  const [takeOptions, setTakeOptions] = useState<{ url: string; requestId: string | null }[]>([]);
  const [lastCreationId, setLastCreationId] = useState<string | null>(null);
  // Two-stage: the composed scene still (stage 1) the video animates from (stage 2).
  const [composedFrame, setComposedFrame] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<"plate" | "live" | null>(null);
  const [composeSeed, setComposeSeed] = useState(0);

  const [chosen, setChosen] = useState<CatalogSelection>(DEFAULT_SELECTION);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [libMode, setLibMode] = useState<LibraryMode>("local");
  const [credits, setCredits] = useState<number>(DEFAULT_CREDITS);
  const [output, setOutput] = useState<OutputSettings>(DEFAULT_SETTINGS);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const absorb = useCallback((p: Json) => {
    if (p.session) setSession(p.session as SessionState);
  }, []);

  useEffect(() => {
    const cookieMode = document.cookie.match(/(?:^|;\s*)rwa-mode=(canned|live)/)?.[1];
    const nextMode = normalizeUiMode(cookieMode, DEV_LIVE_MODE_ENABLED);
    if (cookieMode !== nextMode) document.cookie = modeCookie(nextMode);
    setUiMode(nextMode);

    const last = loadLastSelection();
    if (last) {
      setChosen((c) => ({
        preset_id: PRESETS.some((p) => p.preset_id === last.preset_id) ? last.preset_id! : c.preset_id,
        persona_id: PERSONAS.some((p) => p.model_id === last.persona_id) ? last.persona_id! : c.persona_id,
        background_id: BACKGROUNDS.some((b) => b.background_id === last.background_id) ? last.background_id! : c.background_id,
        asset_id: ASSETS.some((a) => a.asset_id === last.asset_id) ? last.asset_id! : c.asset_id,
        hook_id: HOOKS.some((h) => h.hook_id === last.hook_id) ? last.hook_id! : c.hook_id,
        music_id: MUSIC.some((m) => m.music_id === last.music_id) ? last.music_id! : c.music_id,
        team_id: TEAMS.some((t) => t.id === last.team_id) ? last.team_id! : c.team_id,
      }));
    }
    setCredits(getCredits());
    setOutput(getSettings());
    // Restore the demo economy + wallet session so the account feels continuous.
    const eco = getEconomy();
    setPoints(eco.points);
    setPostedIds(new Set(eco.postedIds));
    const savedWallet = getSavedWallet<WalletInfo>();
    if (savedWallet) setWallet(savedWallet);
    setAgentConfigState(getAgentConfig());
    // Seed the demo autopilot batch from the current day so draft ids rotate daily — otherwise the
    // positional ids (idea-<offset>-i) collide with yesterday's persisted postedIds and cards show
    // as permanently "Posted". Same day → stable ids (consistent within a session).
    setBatchOffset(Math.floor(Date.now() / 86_400_000) * 100);
    setMounted(true);
    // Capture an incoming ?ref= (join that ambassador's team) before we resolve the session.
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) {
        captureReferral(ref);
        setReferredBy(ref);
        toast(`You joined ${ref}'s team — purchases now credit them.`);
      }
    } catch {
      /* ignore */
    }
    (async () => {
      const m = await initLibrary();
      setLibMode(m);
      setCreations(await listLibrary());
      const amb = await loadAmbassador();
      if (amb.code) setAmbassadorCode(amb.code);
      if (amb.referredBy) setReferredBy(amb.referredBy);
      setAgentConfigState(await loadAgentConfig()); // cloud override once the session is up
      const q = await loadAgentQueue(); // drafts the hosted agent enqueued server-side
      setAgentCloud(q.mode === "cloud");
      setAgentQueue(q.drafts);
    })();
  }, [toast]);

  // Persist the demo economy + wallet whenever they change (after the initial restore).
  useEffect(() => {
    if (!mounted) return;
    saveEconomy({ points, postedIds: Array.from(postedIds) });
  }, [mounted, points, postedIds]);

  useEffect(() => {
    if (!mounted) return;
    saveWallet(wallet);
  }, [mounted, wallet]);

  const setMode = (m: "canned" | "live") => {
    const nextMode = m === "live" && !DEV_LIVE_MODE_ENABLED ? "canned" : m;
    document.cookie = modeCookie(nextMode);
    setUiMode(nextMode);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const rechoose = (patch: Partial<CatalogSelection>) => {
    setChosen((c) => ({ ...c, ...patch }));
    setPhase("idle");
    setPaid(null);
    setProgress(0);
  };

  const updateOutput = (patch: Partial<OutputSettings>) => {
    setOutput((o) => {
      const next = { ...o, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const surprise = () => {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const sel: CatalogSelection = {
      preset_id: pick(PRESETS).preset_id,
      persona_id: pick(PERSONAS).model_id,
      background_id: pick(BACKGROUNDS).background_id,
      asset_id: pick(ASSETS).asset_id,
      hook_id: "none",
      music_id: chosen.music_id,
      team_id: pick(TEAMS).id,
    };
    setChosen(sel);
    setPhase("idle");
    setPaid(null);
    setProgress(0);
    saveLastSelection(sel);
    toast("Surprise selection ready — hit Generate.");
  };

  const connectWallet = () =>
    run("wallet", async () => {
      let address = "0x0000000000000000000000000000000000000000";
      let real = false;
      try {
        const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
        if (eth?.request) {
          const accs = (await Promise.race([
            eth.request({ method: "eth_requestAccounts" }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("wallet_timeout")), 8000)),
          ])) as unknown;
          if (Array.isArray(accs) && accs[0]) {
            address = accs[0] as string;
            real = true;
          }
        }
      } catch {
        /* user rejected, no wallet, or timeout → demo address */
      }
      try {
        const r = await rwaClient.wallet<Json>(address);
        if (r.ok && (r.payload as { wallet?: WalletInfo })?.wallet) {
          setWallet((r.payload as { wallet: WalletInfo }).wallet);
          absorb(r.payload);
          toast(real ? "Wallet connected." : "Demo wallet connected.");
          return;
        }
      } catch {
        /* fall through to the local demo wallet */
      }
      setWallet({ address, signature_status: "not_requested_mock_only", stack: "TO_CONFIRM", state: "mock_connected" });
      toast(real ? "Wallet connected." : "Demo wallet connected.");
    });

  const disconnectWallet = () => {
    setWallet(null);
    saveWallet(null);
    toast("Wallet disconnected.");
  };

  // Stage 1 — compose the scene still (or fetch the plate in demo). Sets phase "frame" for preview.
  const composeFrame = async (opts?: { regenerate?: boolean }) => {
    if (!wallet) {
      await connectWallet();
      return;
    }
    const seed = opts?.regenerate ? composeSeed + 1 : composeSeed;
    setComposeSeed(seed);
    setPhase("composing");
    setProgress(8);
    const iv = setInterval(() => setProgress((p) => (p < 88 ? p + Math.max(1, Math.round((88 - p) * 0.15)) : p)), 160);
    let frame: string | null = null;
    let mode: "plate" | "live" | null = null;
    try {
      const res = await fetch("/api/rwa/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: chosen, output, seed }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.status === "composed" && j.image_url) {
        frame = j.image_url;
        mode = j.mode === "live" ? "live" : "plate";
      } else if (j.status === "composing" && j.poll_url) {
        const r = await pollCompose(j.poll_url);
        if (r.image_url) {
          frame = r.image_url;
          mode = "live";
        }
      }
    } catch {
      /* fall back to the render plate below */
    }
    clearInterval(iv);
    if (!frame) {
      // Never dead-end: fall back to the best reference plate as the frame.
      frame = referenceFor(watch, {
        worn: preset.concept_type === "worn_wrist",
        scene_id: background.background_id,
        team_id: team.id,
        angle: preset.concept_type === "unboxing_asmr" ? "macro" : "3q",
      }).image;
      mode = "plate";
    }
    setComposedFrame(frame);
    setComposeMode(mode);
    setProgress(100);
    setTimeout(() => {
      setPhase("frame");
      setProgress(0);
    }, 180);
    if (opts?.regenerate && mode === "plate") {
      toast("Live scene composition switches on with the image key — showing the reference plate.");
    }
  };

  // Entry point from the recap: premium composes a frame first (two-stage); free renders directly.
  const startGeneration = () => {
    if (busy || phase === "rendering" || phase === "composing") return;
    if (output.engine === "premium") void composeFrame();
    else void generate();
  };

  const generate = async () => {
    if (busy || phase === "rendering") return;
    if (!wallet) {
      await connectWallet();
      return;
    }
    const premium = output.engine === "premium";
    const prevCredits = credits;
    const effTakes = premium ? Math.min(3, Math.max(1, takes)) : 1;
    const chargeXdc = premium ? price.genXdc * effTakes + price.gasXdc : 0;

    if (premium) {
      if (credits < chargeXdc) {
        toast(`Need ${chargeXdc} XDC — top up to continue.`, "err");
        return;
      }
      setBusy("pay");
      try {
        const sequence = await runPremiumSessionSequence(rwaClient, session?.session_id);
        if (sequence.session) setSession(sequence.session);
        if (!sequence.ok) {
          toast(sequence.message || "Payment could not be completed.", "err");
          return;
        }
        setPaid(sequence.payment ?? null);
        const nc = Math.max(0, prevCredits - chargeXdc);
        setCredits(nc);
        persistCredits(nc);
      } finally {
        setBusy(null);
      }
    } else {
      setPaid(null);
    }
    setTakeOptions([]);

    setPhase("rendering");
    setProgress(6);
    const iv = setInterval(
      () => setProgress((p) => (p < 92 ? p + Math.max(1, Math.round((92 - p) * 0.12)) : p)),
      180,
    );
    let ok = true;
    let liveVideo: string | null = null;
    let liveReqId: string | null = null;
    let goodTakes: { url: string; requestId: string | null }[] = [];
    let refundXdc = 0; // failed/unrendered takes are refunded — pay only for what was produced
    try {
      const res = await fetch("/api/rwa/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: chosen, output, takes: effTakes, ...(composedFrame ? { start_image_url: composedFrame } : {}) }),
      });
      const plan = await res.json().catch(() => ({}));
      if (!res.ok || (plan.status !== "prepared" && plan.status !== "generating")) {
        ok = false;
        toast("Something went wrong.", "err");
      } else if (plan.status === "generating" && (plan.poll_url || plan.jobs?.length)) {
        const jobs: { request_id?: string; poll_url: string }[] =
          Array.isArray(plan.jobs) && plan.jobs.length ? plan.jobs : [{ request_id: plan.request_id, poll_url: plan.poll_url }];
        const results = await Promise.all(
          jobs.map((j) =>
            pollGeneration(j.poll_url).then((r) => ({ url: r.video_url, requestId: typeof j.request_id === "string" ? j.request_id : null })),
          ),
        );
        goodTakes = results.filter((r): r is { url: string; requestId: string | null } => !!r.url);
        if (goodTakes.length) {
          liveVideo = goodTakes[0].url;
          liveReqId = goodTakes[0].requestId;
          refundXdc = price.genXdc * Math.max(0, effTakes - goodTakes.length);
          if (goodTakes.length < effTakes) toast(`${goodTakes.length}/${effTakes} takes rendered — the rest were refunded.`);
        } else {
          ok = false;
          toast("Generation failed. Please try again.", "err");
        }
      } else {
        // Prepared (demo) — one preview regardless of takes: refund the extra takes honestly.
        refundXdc = price.genXdc * Math.max(0, effTakes - 1);
        await new Promise((r) => setTimeout(r, 1300));
      }
    } catch {
      ok = false;
      toast("Something went wrong. Please try again.", "err");
    }
    clearInterval(iv);
    setLiveVideoUrl(liveVideo);
    setTakeOptions(goodTakes.length > 1 ? goodTakes : []);
    if (!ok) {
      if (premium) {
        setCredits(prevCredits);
        persistCredits(prevCredits);
        setPaid(null);
      }
      setPhase("idle");
      setProgress(0);
      return;
    }
    if (premium && refundXdc > 0) {
      setCredits((v) => {
        const next = v + refundXdc;
        persistCredits(next);
        return next;
      });
    }

    setProgress(100);
    const c: Creation = {
      id: newId(),
      createdAt: Date.now(),
      watchId: watch.asset_id,
      watchTitle: watch.title,
      watchImage: watch.image,
      creatorId: persona.model_id,
      creatorName: persona.display_name,
      styleId: preset.preset_id,
      styleTitle: preset.title,
      sceneTitle: background.title,
      ...(liveVideo ? { videoUrl: liveVideo } : {}),
      ...(liveReqId ? { requestId: liveReqId } : {}),
    };
    setCreations(await addToLibrary(c));
    setLastCreationId(c.id);
    saveLastSelection(chosen);
    toast(
      premium
        ? libMode === "cloud"
          ? "Paid in XDC (demo) · generated & saved to your cloud library."
          : "Paid in XDC (demo) · generated & saved to your videos."
        : "Generated — local render (free), saved to your videos.",
    );
    setTimeout(() => setPhase("ready"), 220);
  };

  const [recapOpen, setRecapOpen] = useState(false);

  const onPrimary = () => {
    if (!wallet) {
      connectWallet();
      return;
    }
    if (output.engine === "premium" && credits < effectiveCost) {
      topUp();
      return;
    }
    setRecapOpen(true);
  };

  const topUp = () => {
    setCredits(DEFAULT_CREDITS);
    persistCredits(DEFAULT_CREDITS);
    toast("Demo credits topped up.");
  };

  const createAnother = () => {
    setPhase("idle");
    setPaid(null);
    setProgress(0);
    setLiveVideoUrl(null);
    setTakeOptions([]);
    setLastCreationId(null);
    setAiCaption(null);
    setComposedFrame(null);
    setComposeMode(null);
  };

  // Multi-take: switch the kept variant — the library entry follows the choice.
  const chooseTake = (i: number) => {
    const t = takeOptions[i];
    if (!t) return;
    setLiveVideoUrl(t.url);
    if (lastCreationId) {
      void updateInLibrary(lastCreationId, { videoUrl: t.url, ...(t.requestId ? { requestId: t.requestId } : {}) }).then(setCreations);
    }
  };

  const removeCreation = async (id: string) => setCreations(await removeFromLibrary(id));

  const [submitFor, setSubmitFor] = useState<Creation | null>(null);
  const [submitPlatform, setSubmitPlatform] = useState("TikTok");
  const [submitUrl, setSubmitUrl] = useState("");

  useEffect(() => {
    if (!submitFor) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSubmitFor(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [submitFor]);

  useEffect(() => {
    if (!recapOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRecapOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [recapOpen]);

  useEffect(() => {
    let alive = true;
    const fetchPrice = async () => {
      try {
        const r = await fetch("/api/rwa/xdc-price");
        const j = await r.json();
        if (alive && typeof j?.usd === "number" && j.usd > 0) {
          setXdcUsd(j.usd);
          setXdcLive(j.source === "coingecko");
        }
      } catch {
        /* keep the fallback rate */
      }
    };
    fetchPrice();
    const iv = setInterval(fetchPrice, 60000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const joinAmbassador = async () => {
    const code = refCode(stableSeed(wallet?.address));
    const res = await persistAmbassador(code);
    setAmbassadorCode(res.code ?? code);
    toast("You're an ambassador — share your link to earn.");
  };

  const copyRefLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 1600);
    } catch {
      toast("Couldn't copy — select and copy manually.", "err");
    }
  };

  // Live mint state from Peter's real RwaWatchNft contract (Apothem) + on-chain mint.
  const [mintState, setMintState] = useState<MintState | null>(null);
  const [minting, setMinting] = useState(false);
  useEffect(() => {
    fetchMintState().then(setMintState);
  }, []);
  const mintFractions = async (quantity: number) => {
    if (!wallet) {
      connectWallet();
      return;
    }
    if (!mintState) {
      toast("Mint data still loading — try again in a second.", "err");
      return;
    }
    setMinting(true);
    try {
      const eth = typeof window !== "undefined" ? ((window as any).ethereum ?? null) : null;
      // Re-read the live price right before minting: the contract's XDC price is oracle-driven and
      // rises per mint, so a value computed from the mount-time price can be stale and revert.
      const fresh = await fetchMintState();
      if (fresh) setMintState(fresh);
      const priceXdcWei = fresh?.priceXdcWei ?? mintState.priceXdcWei;
      // Credit the upline that referred this buyer (?ref=); fall back to the user's own code
      // only when there's no referrer (e.g. a creator demoing their own mint). "" = unattributed.
      const referralId = referredBy || ambassadorCode || "";
      const r = await submitMint({ address: wallet.address, quantity, referralId, priceXdcWei, ethereum: eth });
      if (r.ok) toast(`Mint sent on-chain · tx ${r.txHash.slice(0, 10)}…`);
      else if (r.reason === "no_wallet") toast("Connect a real wallet on XDC Apothem to mint.", "err");
      else if (r.reason === "wrong_chain") toast("Switch your wallet to XDC Apothem (chain 51).", "err");
      else toast(r.message || "Mint failed.", "err");
    } finally {
      setMinting(false);
    }
  };

  const postIdea = (idea: ContentIdea) => {
    if (postedIds.has(idea.id)) return;
    setPostedIds((s) => new Set(s).add(idea.id));
    setPoints((p) => p + idea.rewardPts); // off-chain reward points → RWAX at withdrawal
    // If this draft came from the hosted agent's cloud queue, mark it posted server-side so it
    // leaves the queue on the next load (the card keeps its "Posted ✓" state this session).
    const queued = agentQueue.find((q) => q.idea.id === idea.id);
    if (queued) void markAgentDraft(queued.rowId, "posted");
    // Attach the creator's mint link so the post actually drives attributed mints (the ?ref= code
    // flows into mint(quantity, referralId)). Without it the "post → drive mints" loop can't attribute.
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const mintLink = ambassadorCode ? refLink(ambassadorCode, origin) : "";
    const clip = mintLink ? `${idea.caption}\n\n${mintLink}` : idea.caption;
    try {
      navigator.clipboard?.writeText(clip);
    } catch {
      /* ignore */
    }
    toast(`Posted to ${idea.platform} · +${idea.rewardPts} points (${mintLink ? "caption + mint link" : "caption"} copied)`);
  };
  const refreshBatch = () => {
    // Cloud mode: re-pull the hosted agent's queue. Demo mode: rotate the local batch by a full
    // cadence so the new drafts don't overlap the previous ones (which would re-offer the same
    // content under fresh ids).
    if (agentCloud) void loadAgentQueue().then((q) => setAgentQueue(q.drafts));
    else setBatchOffset((o) => o + Math.max(1, agentConfig.cadencePerDay));
  };

  const setAgentConfig = (patch: Partial<AgentConfig>) => {
    setAgentConfigState((c) => {
      const next = { ...c, ...patch };
      saveAgentConfig(next);
      return next;
    });
    if (patch.enabled === true) toast("Your agent is live — it drafts on-brand content daily (hosted, no setup).");
    if (patch.autoPublish === true) toast("Auto-publish needs your connected socials (official APIs, ToS-safe).");
  };

  // Open an auto-pilot idea in the Studio: pre-fill the selection (the screen handles navigation).
  const applyIdea = (idea: ContentIdea) => {
    const sel: CatalogSelection = {
      preset_id: idea.presetId,
      persona_id: idea.personaId,
      background_id: idea.backgroundId,
      asset_id: idea.watchId,
      hook_id: "none",
      music_id: chosen.music_id,
      team_id: idea.teamId,
    };
    setChosen(sel);
    setPhase("idle");
    setPaid(null);
    setProgress(0);
    saveLastSelection(sel);
    toast("Loaded into the Studio — review and generate.");
  };

  const [capPlatform, setCapPlatformState] = useState<Platform>("TikTok");
  const [copied, setCopied] = useState(false);
  const copyCaption = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Couldn't copy — select and copy manually.", "err");
    }
  };

  // AI caption (LLM route) — upgrades the template caption when ANTHROPIC_API_KEY is set;
  // degrades honestly to the template otherwise. Per-platform: switching platforms resets it.
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [aiCaptionBusy, setAiCaptionBusy] = useState(false);
  const setCapPlatform = (p: Platform) => {
    setCapPlatformState(p);
    setAiCaption(null);
  };
  const generateAiCaption = async () => {
    if (aiCaptionBusy) return;
    setAiCaptionBusy(true);
    try {
      const res = await fetch("/api/rwa/agent/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchTitle: watch.title,
          styleTitle: preset.title,
          personaName: persona.display_name,
          platform: capPlatform,
          team: team.id !== "none" ? team.name : null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { source?: string; caption?: string | null };
      if (j.source === "llm" && j.caption) {
        setAiCaption(j.caption);
        toast("AI caption ready ✨");
      } else {
        toast("AI captions switch on with ANTHROPIC_API_KEY — using the on-brand template.");
      }
    } catch {
      toast("Caption service unreachable — using the template.", "err");
    } finally {
      setAiCaptionBusy(false);
    }
  };

  const submitPost = () =>
    run("submit", async () => {
      if (!submitFor) return;
      const url = submitUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        toast("Paste a valid post link (https://…).", "err");
        return;
      }
      if (creations.some((c) => c.id !== submitFor.id && c.postUrl && c.postUrl === url)) {
        toast("That post link is already submitted.", "err");
        return;
      }
      const today = new Date().toDateString();
      const alreadyToday = creations.some(
        (c) => c.id !== submitFor.id && c.postSubmittedAt && new Date(c.postSubmittedAt).toDateString() === today,
      );
      if (alreadyToday) {
        toast("One post per day — come back tomorrow to submit another.", "err");
        return;
      }
      setCreations(await updateInLibrary(submitFor.id, { postPlatform: submitPlatform, postUrl: url, postSubmittedAt: Date.now() }));
      setPoints((p) => p + POST_REWARD_POINTS); // create → post → earn (demo loop)
      setSubmitFor(null);
      setSubmitUrl("");
      toast(`Post submitted — +${POST_REWARD_POINTS} points, we'll track its performance.`);
    });

  const openSubmit = (c: Creation) => {
    setSubmitFor(c);
    setSubmitPlatform(c.postPlatform || "TikTok");
    setSubmitUrl(c.postUrl || "");
  };

  const watch = ASSETS.find((a) => a.asset_id === chosen.asset_id)!;
  const persona = PERSONAS.find((p) => p.model_id === chosen.persona_id)!;
  const preset = PRESETS.find((p) => p.preset_id === chosen.preset_id)!;
  const background = BACKGROUNDS.find((b) => b.background_id === chosen.background_id)!;
  const hook = HOOKS.find((h) => h.hook_id === chosen.hook_id)!;
  const music = MUSIC.find((m) => m.music_id === chosen.music_id)!;
  const team = teamById(chosen.team_id);
  // Cloud mode: the hosted queue IS the batch (even when empty → "all caught up", never the demo
  // batch, so points can't be farmed past the daily cadence). Demo mode: client-side tick.
  const agentQueueMode: "cloud" | "local" = agentCloud ? "cloud" : "local";
  const autopilotBatch = agentCloud ? agentQueue.map((q) => q.idea) : runAgentTick(agentConfig, batchOffset);
  const shortAddr = wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "";
  // "auto" resolves to the recommended model for this style + output (price/ETA/labels follow it).
  const modelChoice = resolveModel(output.model, preset.concept_type, output);
  const selectedModel = modelChoice.model;
  const modelIsAuto = output.model === AUTO_MODEL_ID;
  const price = priceFor(selectedModel, output.resolution, output.duration, xdcUsd);
  const cost = output.engine === "local" ? 0 : price.totalXdc;
  const effectiveCost = cost;
  // Total for the run: gen cost × takes + gas once (failed/demo-extra takes are refunded).
  const totalCost = output.engine === "local" ? 0 : price.genXdc * Math.min(3, Math.max(1, takes)) + price.gasXdc;

  const myPostEntries: LeaderEntry[] = creations
    .filter((c) => c.postUrl)
    .map((c) => ({ creator: c.creatorName, handle: "@you", platform: c.postPlatform || "TikTok", ...mockMetrics(c.id), you: true }));
  const leaderboard = rankEntries([...DEMO_LEADERBOARD, ...myPostEntries]);

  return {
    mounted, uiMode, setMode, busy,
    gallery, setGallery,
    xdcUsd, xdcLive,
    ambassadorCode, referredBy, refCopied, joinAmbassador, copyRefLink,
    points,
    mintState, minting, mintFractions,
    autopilotBatch, agentQueueMode, postedIds, postIdea, refreshBatch, applyIdea, agentConfig, setAgentConfig,
    wallet, connectWallet, disconnectWallet, shortAddr,
    phase, progress, paid, liveVideoUrl,
    chosen, rechoose, surprise,
    creations, libMode, removeCreation,
    credits, output, updateOutput, topUp,
    toast, toasts,
    recapOpen, setRecapOpen,
    submitFor, setSubmitFor, submitPlatform, setSubmitPlatform, submitUrl, setSubmitUrl, submitPost, openSubmit,
    capPlatform, setCapPlatform, copied, copyCaption,
    aiCaption, aiCaptionBusy, generateAiCaption,
    generate, onPrimary, createAnother,
    startGeneration, composeFrame, composedFrame, composeMode,
    regenerateFrame: () => composeFrame({ regenerate: true }),
    animate: () => generate(),
    watch, persona, preset, background, hook, music, team,
    selectedModel, modelChoice, modelIsAuto, price, cost, effectiveCost, totalCost, leaderboard,
    takes, setTakes, takeOptions, chooseTake,
  };
}

export type StudioValue = ReturnType<typeof useStudioController>;

const StudioContext = createContext<StudioValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const value = useStudioController();
  return (
    <StudioContext.Provider value={value}>
      {children}
      {/* Global toasts — shown on every page */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="true">
        {value.toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "fade-up pointer-events-auto flex items-center gap-2 rounded-xl border bg-bg px-4 py-3 text-sm font-medium shadow-xl",
              t.tone === "err" ? "border-fg text-fg" : "border-line2 text-fg",
            ].join(" ")}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fg text-xs text-bg">
              {t.tone === "err" ? "!" : "✓"}
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioValue {
  const v = useContext(StudioContext);
  if (!v) throw new Error("useStudio must be used within <StudioProvider>");
  return v;
}
