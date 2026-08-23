import { secrets } from "base44:runtime";

export function getMomoConfig() {
  const apiUser = secrets.get("MTN_MOMO_API_USER");
  const apiKey = secrets.get("MTN_MOMO_API_KEY");
  const subscriptionKey = secrets.get("MTN_MOMO_SUBSCRIPTION_KEY");
  const env = secrets.get("MTN_MOMO_ENVIRONMENT") || "sandbox";
  const baseUrl = env === "production"
    ? "https://momodeveloper.mtn.com"
    : "https://sandbox.momodeveloper.mtn.com";

  if (!apiUser || !apiKey || !subscriptionKey) {
    throw new Error("MTN MoMo credentials are not configured. Set MTN_MOMO_API_USER, MTN_MOMO_API_KEY, and MTN_MOMO_SUBSCRIPTION_KEY in app secrets.");
  }

  return { apiUser, apiKey, subscriptionKey, env, baseUrl };
}

export async function getAccessToken() {
  const { apiUser, apiKey, subscriptionKey, baseUrl } = getMomoConfig();
  const credentials = btoa(`${apiUser}:${apiKey}`);
  const res = await fetch(`${baseUrl}/collection/token/`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoMo token failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

export function validateGhanaMsisdn(phone) {
  let cleaned = phone.replace(/\s+|-/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "233" + cleaned.slice(1);
  if (!cleaned.startsWith("233")) cleaned = "233" + cleaned;
  if (!/^233\d{9}$/.test(cleaned)) {
    throw new Error("Invalid Ghana phone number. Use format 0244XXXXXX or 233244XXXXXX.");
  }
  return cleaned;
}