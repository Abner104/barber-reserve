/**
 * WebAuthn / Passkey helpers
 * Funciona con huella, Face ID y cualquier autenticador del dispositivo
 */
import { supabase } from "./supabase";

const RP_ID   = window.location.hostname;
const RP_NAME = "Clippr";

function b64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

function isSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials?.create);
}

// ── REGISTRAR passkey para el usuario actual ──────────────────
export async function registerPasskey(userId, userEmail) {
  if (!isSupported()) throw new Error("Tu dispositivo no soporta passkeys");

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      rp:      { id: RP_ID, name: RP_NAME },
      user:    { id: Uint8Array.from(userId, c => c.charCodeAt(0)), name: userEmail, displayName: userEmail },
      challenge,
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // solo sensor del dispositivo
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  });

  if (!credential) throw new Error("No se pudo crear la passkey");

  const credId  = b64url(credential.rawId);
  const pubKey  = b64url(credential.response.getPublicKey?.() ?? credential.response.attestationObject);
  const device  = navigator.userAgent.includes("iPhone") ? "iPhone"
                : navigator.userAgent.includes("Android") ? "Android"
                : navigator.userAgent.includes("Mac") ? "Mac"
                : "Dispositivo";

  const { error } = await supabase.from("passkeys").insert({
    user_id:       userId,
    credential_id: credId,
    public_key:    pubKey,
    counter:       0,
    device_name:   device,
  });

  if (error) throw error;
  return true;
}

// ── AUTENTICAR con passkey ────────────────────────────────────
export async function authenticatePasskey(userId) {
  if (!isSupported()) throw new Error("Tu dispositivo no soporta passkeys");

  // Obtener credenciales registradas del usuario
  const { data: passkeys } = await supabase
    .from("passkeys")
    .select("credential_id")
    .eq("user_id", userId);

  if (!passkeys?.length) throw new Error("Sin passkeys registradas");

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      rpId:      RP_ID,
      challenge,
      allowCredentials: passkeys.map(p => ({
        id:   fromB64url(p.credential_id),
        type: "public-key",
      })),
      userVerification: "required",
      timeout: 60000,
    },
  });

  if (!assertion) throw new Error("Autenticación cancelada");
  return true;
}

// ── VERIFICAR si el usuario tiene passkeys ────────────────────
export async function hasPasskeys(userId) {
  const { count } = await supabase
    .from("passkeys")
    .select("id", { count: "exact" })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

// ── ELIMINAR passkey ──────────────────────────────────────────
export async function deletePasskey(passkeyId) {
  const { error } = await supabase.from("passkeys").delete().eq("id", passkeyId);
  if (error) throw error;
}

export { isSupported };
