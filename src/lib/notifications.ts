import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let permissionChecked = false;
let permissionGranted = false;

async function ensurePermission(): Promise<boolean> {
  if (permissionChecked) return permissionGranted;

  permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const result = await requestPermission();
    permissionGranted = result === "granted";
  }
  permissionChecked = true;
  return permissionGranted;
}

export async function notifyDownloadComplete(title: string): Promise<void> {
  if (document.hasFocus()) return;

  const allowed = await ensurePermission();
  if (!allowed) return;

  sendNotification({ title: "SNATCH", body: title });
}

export async function notifyQueueComplete(
  doneCount: number,
  errorCount: number,
): Promise<void> {
  if (document.hasFocus()) return;

  const allowed = await ensurePermission();
  if (!allowed) return;

  const body =
    errorCount > 0
      ? `${doneCount} downloaded, ${errorCount} failed`
      : `${doneCount} downloaded`;

  sendNotification({ title: "SNATCH — Queue complete", body });
}
