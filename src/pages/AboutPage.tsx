import { useEffect, useState } from "react";
import { api } from "../lib/bindings";
import { useI18n } from "../hooks/useI18n";
import { HackerCard } from "../components/shared/HackerCard";

const ASCII_LOGO = `
 ███████╗███╗   ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
 ██╔════╝████╗  ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
 ███████╗██╔██╗ ██║███████║   ██║   ██║     ███████║
 ╚════██║██║╚██╗██║██╔══██║   ██║   ██║     ██╔══██║
 ███████║██║ ╚████║██║  ██║   ██║   ╚██████╗██║  ██║
 ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
`.trim();

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 font-mono text-xs py-1">
      <span className="text-hacker-text-dim w-24 shrink-0">{label}</span>
      <span className="text-[var(--accent)]">{value}</span>
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
      <pre className="text-[var(--accent)] text-[10px] leading-tight select-none opacity-80">
        {ASCII_LOGO}
      </pre>

      <HackerCard>
        <InfoRow label={t("about.version")} value={version} />
        <InfoRow label={t("about.engine")} value="Tauri 2 + Rust" />
        <InfoRow label={t("about.platform")} value={platform} />
        <InfoRow label={t("about.builtWith")} value="React, TypeScript, Tailwind CSS" />
      </HackerCard>

      <HackerCard>
        <div className="text-[var(--accent-dim)] font-mono text-xs uppercase tracking-widest mb-2">
          {"// "}{t("about.links")}
        </div>
        <div className="space-y-1">
          <LinkRow label={t("about.sourceCode")} href="https://github.com/snatch-app/snatch" />
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
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] hover:underline cursor-pointer"
      >
        {label}
      </a>
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
