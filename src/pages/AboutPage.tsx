import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/bindings";
import { useI18n } from "../hooks/useI18n";
import { HackerCard } from "../components/shared/HackerCard";

const ASCII_LOGO = ` ███████╗███╗   ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
 ██╔════╝████╗  ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
 ███████╗██╔██╗ ██║███████║   ██║   ██║     ███████║
 ╚════██║██║╚██╗██║██╔══██║   ██║   ██║     ██╔══██║
 ███████║██║ ╚████║██║  ██║   ██║   ╚██████╗██║  ██║
 ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝`;

const FONT_STACK = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function ScaledAsciiLogo() {
  const preRef = useRef<HTMLPreElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const intrinsicWidthRef = useRef(0);
  const [scale, setScale] = useState(1);
  const [wrapperHeight, setWrapperHeight] = useState<number | undefined>(undefined);

  const recalculate = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || intrinsicWidthRef.current === 0) return;

    const availableWidth = wrapper.clientWidth;
    const newScale = Math.min(1, availableWidth / intrinsicWidthRef.current);
    setScale(newScale);

    const pre = preRef.current;
    if (pre) {
      setWrapperHeight(pre.scrollHeight * newScale);
    }
  }, []);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    intrinsicWidthRef.current = pre.scrollWidth;
    recalculate();

    window.addEventListener("resize", recalculate);
    return () => window.removeEventListener("resize", recalculate);
  }, [recalculate]);

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden"
      style={wrapperHeight ? { height: wrapperHeight } : undefined}
    >
      <pre
        ref={preRef}
        style={{
          fontFamily: FONT_STACK,
          transform: `scale(${scale})`,
          transformOrigin: "left top",
          willChange: "transform",
        }}
        className="whitespace-pre text-[13px] leading-[1.2] text-[var(--accent)] select-none [text-shadow:0_0_8px_var(--accent-glow)]"
      >
        {ASCII_LOGO}
      </pre>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 font-mono text-xs py-1">
      <span className="text-hacker-text-dim w-24 shrink-0">{label}</span>
      <span className="text-[var(--accent)]">{value}</span>
    </div>
  );
}

function InfoLinkRow({ label, text, href }: { label: string; text: string; href: string }) {
  return (
    <div className="flex gap-3 font-mono text-xs py-1">
      <span className="text-hacker-text-dim w-24 shrink-0">{label}</span>
      <button
        onClick={() => void api.dialog.openUrl(href)}
        className="text-[var(--accent)] hover:underline cursor-pointer"
      >
        {text}
      </button>
    </div>
  );
}

export function AboutPage() {
  const [version, setVersion] = useState("...");
  const { t } = useI18n();

  useEffect(() => {
    api.app.getVersion().then(setVersion).catch(() => setVersion("unknown"));
  }, []);

  const platform = detectPlatform();

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto items-center">
      <ScaledAsciiLogo />

      <HackerCard>
        <InfoRow label={t("about.version")} value={version} />
        <InfoRow label={t("about.engine")} value="Tauri 2 + Rust" />
        <InfoRow label={t("about.platform")} value={platform} />
        <InfoRow label={t("about.builtWith")} value="React, TypeScript, Tailwind CSS" />
        <InfoLinkRow label={t("about.authorLabel")} text="supostat" href="https://github.com/supostat" />
        <InfoLinkRow label={t("about.website")} text="byigor.dev" href="https://byigor.dev" />
      </HackerCard>

      <HackerCard>
        <div className="text-[var(--accent-dim)] font-mono text-xs uppercase tracking-widest mb-2">
          {"// "}{t("about.links")}
        </div>
        <div className="space-y-1">
          <LinkRow label={t("about.sourceCode")} href="https://github.com/supostat/snatch" />
          <LinkRow label={t("about.ytdlpProject")} href="https://github.com/yt-dlp/yt-dlp" />
        </div>
      </HackerCard>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="font-mono text-xs py-0.5">
      <span className="text-hacker-text-dim mr-2">{">"}</span>
      <button
        onClick={() => void api.dialog.openUrl(href)}
        className="text-[var(--accent)] hover:underline cursor-pointer"
      >
        {label}
      </button>
    </div>
  );
}

function detectPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macOS";
  if (userAgent.includes("win")) return "Windows";
  if (userAgent.includes("linux")) return "Linux";
  return "Unknown";
}
