// Config de PM2 para el servidor de email — lee vps/.env explícitamente
// y se lo pasa al proceso, sin depender del auto-load de dotenv/PM2 que
// puede pisar las variables en algunas versiones.
require("dotenv").config({ path: __dirname + "/.env" });

module.exports = {
  apps: [
    {
      name: "clippr-email",
      script: "./email-server.cjs",
      cwd: __dirname,
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
      },
    },
  ],
};
