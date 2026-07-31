// Config de PM2 para el servidor de email. Los secretos NO pasan por acá ni por
// variables de entorno de PM2 — email-server.cjs los lee directo de
// vps/secrets.local.cjs, para evitar el auto-loader de .env de PM2 7.x que
// interfería de forma errática con process.env.
module.exports = {
  apps: [
    {
      name: "clippr-email",
      script: "./email-server.cjs",
      cwd: __dirname,
    },
  ],
};
