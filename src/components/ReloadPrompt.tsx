import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Small toast shown when the service worker has cached the app for offline use,
 * or when a new version is available to activate.
 */
export const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="reload-toast" role="status">
      <span>
        {needRefresh ? 'A new version is available.' : 'Ready to play offline.'}
      </span>
      <div className="reload-toast__actions">
        {needRefresh && (
          <button onClick={() => updateServiceWorker(true)}>Reload</button>
        )}
        <button onClick={close}>Dismiss</button>
      </div>
    </div>
  );
};
