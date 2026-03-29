// ═══ MATRIX RAIN ═══

(function initMatrixRain() {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  const fontSize = 14;
  let columns;
  let drops;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * -50)
    );
  }

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff41";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < columns; i++) {
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      drops[i]++;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  setInterval(draw, 50);
})();

// ═══ PREVIEW TABS ═══

(function initPreviewTabs() {
  const tabs = document.querySelectorAll(".preview-tab");
  if (tabs.length === 0) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-target");

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".screenshot-frame .screenshot").forEach((img) => {
        img.classList.toggle("hidden", img.id !== targetId);
      });
    });
  });
})();

// ═══ PLATFORM DETECTION ═══

(function initDownloadButtons() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  let detectedOS = "unknown";
  if (platform.includes("mac") || platform.includes("darwin")) {
    detectedOS = "macos";
  } else if (platform.includes("win")) {
    detectedOS = "windows";
  } else if (platform.includes("linux")) {
    detectedOS = "linux";
  }

  const buttons = {
    macos: document.getElementById("btn-macos"),
    windows: document.getElementById("btn-windows"),
    linux: document.getElementById("btn-linux"),
  };

  // Highlight detected OS button, dim others
  for (const [os, btn] of Object.entries(buttons)) {
    if (!btn) continue;
    if (os === detectedOS) {
      btn.style.order = "-1";
    } else {
      btn.style.opacity = "0.5";
    }
  }

  // Set download links from latest GitHub release
  fetchLatestRelease(buttons);
})();

async function fetchLatestRelease(buttons) {
  try {
    const response = await fetch(
      "https://api.github.com/repos/supostat/snatch/releases?per_page=5"
    );
    if (!response.ok) return;

    const releases = await response.json();
    const published = releases.find((r) => !r.draft && !r.prerelease);
    if (!published) return;

    const version = document.getElementById("version");
    if (version) version.textContent = published.tag_name;

    const assets = published.assets;

    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".dmg") && buttons.macos) {
        buttons.macos.href = asset.browser_download_url;
      } else if (
        (name.endsWith(".exe") || name.endsWith("-setup.exe")) &&
        !name.endsWith(".sig") &&
        buttons.windows
      ) {
        buttons.windows.href = asset.browser_download_url;
      } else if (name.endsWith(".appimage") && buttons.linux) {
        buttons.linux.href = asset.browser_download_url;
      }
    }
  } catch {
    // Fallback to releases page
    for (const btn of Object.values(buttons)) {
      if (btn && btn.href === "#") {
        btn.href = "https://github.com/supostat/snatch/releases";
      }
    }
  }
}

