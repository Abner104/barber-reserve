self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "Nueva reserva ✂️", {
      body:    data.body  ?? "",
      icon:    data.icon  ?? "/LogoC.png",
      badge:   "/LogoC.png",
      data:    data.url   ?? "/barber",
      vibrate: [300, 100, 300, 100, 500],
      sound:   "/sound/mixkit-sci-fi-click-900.wav",
      actions: [
        { action: "ver", title: "Ver reserva" },
      ],
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || "/barber"));
});
