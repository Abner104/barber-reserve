/**
 * Rutas de Mercado Pago para suscripciones Clippr
 * Agregar al servidor existente: require('./mp-payments')(app)
 */

const { MercadoPagoConfig, Preference } = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key — bypasses RLS
);

const VPS_URL    = `http://${process.env.VPS_IP}:3001`;
const FRONT_URL  = process.env.FRONTEND_URL || "https://barber-reserve-omega.vercel.app";

// ── Calcular precio según barberos activos ────────────────────
async function calcPrice(shopId) {
  const [configRes, barbersRes] = await Promise.all([
    supabase.from("saas_config").select("base_price, price_per_barber").eq("id", 1).single(),
    supabase.from("barbers").select("id", { count: "exact" }).eq("shop_id", shopId).eq("is_active", true),
  ]);

  const base     = Number(configRes.data?.base_price       ?? 11990);
  const perExtra = Number(configRes.data?.price_per_barber ?? 2990);
  const count    = barbersRes.count ?? 1;

  // 1-2 barberos: precio base. Cada uno adicional desde el 3ro suma perExtra
  const extras = Math.max(0, count - 2);
  return base + extras * perExtra;
}

module.exports = function mountMpRoutes(app) {

  // ── POST /create-payment ────────────────────────────────────
  // Frontend llama aquí para obtener la URL de pago de MP
  app.post("/create-payment", async (req, res) => {
    try {
      const { shop_id, shop_name, owner_email } = req.body;
      if (!shop_id) return res.status(400).json({ error: "shop_id requerido" });

      const price = await calcPrice(shop_id);

      const preference = new Preference(mp);
      const result = await preference.create({
        body: {
          items: [{
            title:       `Clippr Pro — ${shop_name || "Barbería"}`,
            description: "Suscripción mensual al software de gestión Clippr",
            quantity:    1,
            unit_price:  price,
            currency_id: "CLP",
          }],
          payer: { email: owner_email || "cliente@clippr.app" },
          back_urls: {
            success: `${FRONT_URL}/admin?payment=success`,
            failure: `${FRONT_URL}/admin/subscription?payment=failure`,
            pending: `${FRONT_URL}/admin/subscription?payment=pending`,
          },
          auto_return:        "approved",
          notification_url:   `${VPS_URL}/mp-webhook`,
          external_reference: shop_id,   // usamos esto en el webhook para saber qué shop activar
          statement_descriptor: "CLIPPR",
        },
      });

      res.json({ init_point: result.init_point, price });
    } catch (err) {
      console.error("create-payment error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /mp-webhook ────────────────────────────────────────
  // Mercado Pago llama aquí al aprobar/rechazar un pago
  app.post("/mp-webhook", async (req, res) => {
    try {
      // Verificar firma del webhook
      const secret    = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const xSig      = req.headers["x-signature"] ?? "";
      const xReqId    = req.headers["x-request-id"] ?? "";
      const { data }  = req.query;

      if (secret && xSig) {
        const parts   = Object.fromEntries(xSig.split(",").map(p => p.split("=")));
        const ts      = parts.ts ?? "";
        const v1      = parts.v1 ?? "";
        const manifest = `id:${data?.id ?? ""};request-id:${xReqId};ts:${ts};`;
        const hmac    = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
        if (hmac !== v1) {
          console.warn("MP webhook firma inválida");
          return res.sendStatus(400);
        }
      }

      const { type, action } = req.body;

      // Solo nos interesan pagos aprobados
      if (type !== "payment" || action !== "payment.updated") {
        return res.sendStatus(200);
      }

      // Obtener detalle del pago desde MP
      const paymentId = req.body?.data?.id;
      if (!paymentId) return res.sendStatus(200);

      const mpRes  = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });
      const payment = await mpRes.json();

      if (payment.status !== "approved") return res.sendStatus(200);

      const shopId = payment.external_reference;
      if (!shopId) return res.sendStatus(200);

      // Activar plan Pro por 30 días
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from("barbershops")
        .update({
          plan:            "pro",
          is_active:       true,
          subscribed_at:   new Date().toISOString(),
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", shopId);

      if (error) {
        console.error("Supabase update error:", error);
        return res.sendStatus(500);
      }

      console.log(`✅ Plan Pro activado para shop ${shopId} hasta ${expiresAt.toISOString()}`);
      res.sendStatus(200);

    } catch (err) {
      console.error("mp-webhook error:", err);
      res.sendStatus(500);
    }
  });

  // ── GET /subscription-status/:shopId ───────────────────────
  // Frontend consulta si el plan está activo
  app.get("/subscription-status/:shopId", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { data, error } = await supabase
        .from("barbershops")
        .select("plan, plan_expires_at, trial_ends_at, name")
        .eq("id", shopId)
        .single();

      if (error) return res.status(404).json({ error: "Shop no encontrado" });

      const now        = new Date();
      const trialEnd   = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const planExpiry = data.plan_expires_at ? new Date(data.plan_expires_at) : null;

      const trialActive = trialEnd && trialEnd > now;
      const proActive   = data.plan === "pro" && planExpiry && planExpiry > now;
      const isActive    = trialActive || proActive;

      res.json({
        plan:          data.plan,
        is_active:     isActive,
        trial_active:  trialActive,
        pro_active:    proActive,
        trial_ends_at: data.trial_ends_at,
        plan_expires_at: data.plan_expires_at,
        days_left:     trialActive
          ? Math.ceil((trialEnd - now) / 86400000)
          : proActive
          ? Math.ceil((planExpiry - now) / 86400000)
          : 0,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("💳 Rutas MP montadas: /create-payment, /mp-webhook, /subscription-status/:id");
};
