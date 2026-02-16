import { useEffect, useState } from "react";

const isTauri = !!(window as any).__TAURI_INTERNALS__;
const font = "Menlo, Monaco, 'SF Mono', monospace";

export function UpdateChecker() {
  const [update, setUpdate] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    const checkForUpdate = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const result = await check();
        if (result) {
          setUpdate(result);
        }
      } catch (e) {
        // No update available or check failed — silent
      }
    };

    // Check after 3 seconds, then every 30 minutes
    const timeout = setTimeout(checkForUpdate, 3000);
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const installUpdate = async () => {
    if (!update) return;
    setDownloading(true);
    try {
      await update.downloadAndInstall((event: any) => {
        if (event.event === "Started" && event.data?.contentLength) {
          setProgress(0);
        } else if (event.event === "Progress") {
          setProgress((prev: number) => prev + (event.data?.chunkLength || 0));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });

      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setDownloading(false);
    }
  };

  if (!update || dismissed) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "#1e1e1e", borderRadius: 12, padding: 24, width: 360,
        border: "1px solid #2a2a2e", fontFamily: font, fontSize: 13, color: "#d1d1d6",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          Update Available
        </div>
        <div style={{ color: "#9898a0", marginBottom: 4 }}>
          Version {update.version} is ready to install.
        </div>
        {update.body && (
          <div style={{ color: "#636366", fontSize: 12, marginBottom: 16, lineHeight: 1.5, maxHeight: 100, overflow: "auto" }}>
            {update.body}
          </div>
        )}

        {downloading ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "#2a2a2e", borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{ background: "#32d74b", height: "100%", width: `${Math.min(progress, 100)}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ color: "#636366", fontSize: 11, marginTop: 6, textAlign: "center" }}>
              Downloading...
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setDismissed(true)} style={{
              background: "none", border: "1px solid #2a2a2e", borderRadius: 6,
              color: "#636366", fontSize: 12, fontFamily: font, padding: "6px 14px", cursor: "pointer",
            }}>Later</button>
            <button onClick={installUpdate} style={{
              background: "#32d74b", border: "none", borderRadius: 6,
              color: "#000", fontSize: 12, fontFamily: font, fontWeight: 600,
              padding: "6px 14px", cursor: "pointer",
            }}>Update & Restart</button>
          </div>
        )}
      </div>
    </div>
  );
}
