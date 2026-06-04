export default async function handler(req, res) {
  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_WHATSAPP_NUMBER;

  // Test base64 sin Buffer
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function b64(str) {
    let result = "", i = 0;
    while (i < str.length) {
      const a = str.charCodeAt(i++), b = str.charCodeAt(i++), c = str.charCodeAt(i++);
      result += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] +
        (isNaN(b) ? "=" : chars[((b & 15) << 2) | (c >> 6)]) +
        (isNaN(c) ? "=" : chars[c & 63]);
    }
    return result;
  }

  res.status(200).json({
    sid_present: !!SID,
    token_present: !!TOKEN,
    from_present: !!FROM,
    b64_test: b64("hello:world"),
    node_version: process.version,
  });
}
