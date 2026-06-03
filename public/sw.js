self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "Nueva reserva", {
      body:    data.body  ?? "",
      icon:    data.icon  ?? "/LogoC.png",
      badge:   "/LogoC.png",
      data:    data.url   ?? "/barber",
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || "/barber"));
});
