import { useState, useEffect } from "react";

const VAPID_PUBLIC = "BOTgc6bINijFbgcRknxzADcJDwbmDUwAQBPS1Djud5f8SFX-I64XbH2gBK4PXCam-ibLJYIwekC6F2uPQAGfPcY";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(barberId) {
  const [permission, setPermission] = useState(() => typeof Notification !== "undefined" ? Notification.permission : "default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!barberId || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, [barberId]);

  async function subscribe() {
    if (!barberId) return;
    setLoading(true);
    try {
      const reg  = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      await fetch("/api/push-subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ barberId, subscription: sub.toJSON() }),
      });
      setSubscribed(true);
    } catch (e) {
      console.error("Push subscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
    } catch {}
  }

  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
