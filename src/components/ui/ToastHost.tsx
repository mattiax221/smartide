import { useEffect } from "react";
import { useIdeStore } from "../../state/store";
import { Button } from "./Button";

export function ToastHost() {
  const { state, dismissToast, setHostBanner } = useIdeStore();

  useEffect(() => {
    if (state.toasts.length === 0) return;
    const latest = state.toasts[state.toasts.length - 1];
    const t = window.setTimeout(() => dismissToast(latest.id), 5200);
    return () => window.clearTimeout(t);
  }, [state.toasts, dismissToast]);

  return (
    <>
      {state.hostBanner ? (
        <div className="host-banner" role="status">
          <span className="host-banner__text">{state.hostBanner}</span>
          <Button variant="subtle" onClick={() => setHostBanner(null)} aria-label="Dismiss">
            Dismiss
          </Button>
        </div>
      ) : null}
      <div className="toast-host" aria-live="polite">
        {state.toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`} role="alert">
            <div className="toast__body">
              <strong>{toast.title}</strong>
              {toast.detail ? <p>{toast.detail}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Close"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
