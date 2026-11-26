/// <reference lib="dom" />
import type { PluginViewClient } from "../../../packages/plugin-sdk/src/ui.js";
import { PLUGIN_ID } from "../src/shared.js";
import type { UiIconName } from "./icons.js";

export type NotificationPref = "off" | "sound" | "desktop" | "both";

export type NotificationHintPayload = {
  cliSessionId: string;
  engine: string;
  label?: string;
  kind: "intervention" | "completed" | "failed";
  title: string;
  body: string;
};

const STORAGE_KEY = "extcli.notificationPref";
let audioCtx: AudioContext | undefined;

export function getNotificationPref(): NotificationPref {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (raw === "off" || raw === "sound" || raw === "desktop" || raw === "both") return raw;
  } catch {
    // Ignore restricted storage.
  }
  return "both";
}

export function setNotificationPref(pref: NotificationPref): void {
  try {
    window.localStorage?.setItem(STORAGE_KEY, pref);
  } catch {
    // Ignore restricted storage.
  }
}

export function cycleNotificationPref(current: NotificationPref): NotificationPref {
  const order: NotificationPref[] = ["both", "sound", "desktop", "off"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length]!;
}

export function notificationPrefIcon(pref: NotificationPref): UiIconName {
  switch (pref) {
    case "both":
      return "bell";
    case "sound":
      return "volume2";
    case "desktop":
      return "messageSquare";
    case "off":
      return "bellOff";
  }
}

export function notificationPrefLabel(pref: NotificationPref): string {
  switch (pref) {
    case "both":
      return "声音 + 弹窗";
    case "sound":
      return "仅提示音";
    case "desktop":
      return "仅系统通知";
    case "off":
      return "静音";
  }
}

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return undefined;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

export function playChime(kind: "intervention" | "completed" | "failed"): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      kind === "intervention"
        ? [880, 1174.66]
        : kind === "completed"
          ? [523.25, 659.25, 783.99]
          : [329.63, 261.63];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "intervention" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(kind === "intervention" ? 0.09 : 0.06, now + idx * 0.085 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.24);
    });
  } catch {
    // WebAudio may be unavailable before first user gesture.
  }
}

export function handleNotificationHint(view: PluginViewClient, hint: NotificationHintPayload): void {
  const pref = getNotificationPref();
  if (pref === "off") return;

  if (pref === "sound" || pref === "both") {
    playChime(hint.kind);
  }

  if (pref === "desktop" || pref === "both") {
    const level = hint.kind === "failed" ? "error" : hint.kind === "intervention" ? "warning" : "info";
    void view.commands
      .execute(`${PLUGIN_ID}.notify`, {
        title: hint.title,
        body: hint.body,
        level,
        playSound: false
      })
      .catch(() => undefined);
  }
}
