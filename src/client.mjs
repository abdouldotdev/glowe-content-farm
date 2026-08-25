const DEFAULT_URL = "https://glowe-studio.vercel.app";

function baseUrl() {
  return (process.env.GLOWE_STUDIO_URL || DEFAULT_URL).replace(/\/$/, "");
}

function headers(json = false) {
  const out = {};
  if (json) out["Content-Type"] = "application/json";
  if (process.env.GLOWE_STUDIO_TOKEN) out.Authorization = `Bearer ${process.env.GLOWE_STUDIO_TOKEN}`;
  return out;
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...headers(Boolean(init.body)), ...(init.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) throw new Error(`Glowe Studio ${response.status}: ${body.error || body.message || text}`);
  return body;
}

export const studioUrl = baseUrl;
export const listPosts = () => request("/api/tiktok/remix/posts");
export const getCatalog = (includeInactive = false) => request(`/api/mcp/catalog?includeInactive=${includeInactive}`);
export const getHistory = ({ limit = 50, source = "all", status } = {}) => request(`/api/mcp/history?limit=${limit}&source=${source}${status ? `&status=${encodeURIComponent(status)}` : ""}`);
export const listCtaOverlays = () => request("/api/tiktok/cta-overlays");
export const uploadCtaOverlay = (body) => request("/api/tiktok/cta-overlays", { method: "POST", body: JSON.stringify(body) });

export async function generateRemix(body) {
  const response = await fetch(`${baseUrl()}/api/tiktok/remix/generate`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Glowe Studio ${response.status}: ${await response.text()}`);

  const text = await response.text();
  const events = [];
  for (const chunk of text.split("\n\n")) {
    const line = chunk.split("\n").find((item) => item.startsWith("data: "));
    if (!line) continue;
    try { events.push(JSON.parse(line.slice(6))); } catch {}
  }
  const done = events.find((event) => event.type === "done");
  const errors = events.filter((event) => event.type === "error").map((event) => event.data);
  return { ok: errors.length === 0, events, results: done?.data?.results || [], totalCost: done?.data?.totalCost || 0, errors };
}

export const exportSlides = (body) => request("/api/tiktok/remix/export", { method: "POST", body: JSON.stringify(body) });
export const updateStyle = (id, body) => request(`/api/annotate/styles/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const markStylesForTiktok = (body) => request("/api/annotate/tiktok/mark", { method: "POST", body: JSON.stringify(body) });
export const reorderTrending = (body) => request("/api/annotate/trending/reorder", { method: "POST", body: JSON.stringify(body) });
export const favoriteModel = (body) => request("/api/models/favorite", { method: "POST", body: JSON.stringify(body) });

export async function generateStudioRun(body) {
  const response = await fetch(`${baseUrl()}/api/tiktok/generate`, {
    method: "POST", headers: headers(true), body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Glowe Studio ${response.status}: ${await response.text()}`);
  const text = await response.text();
  const events = [];
  for (const chunk of text.split("\n\n")) {
    const line = chunk.split("\n").find((item) => item.startsWith("data: "));
    if (!line) continue;
    try { events.push(JSON.parse(line.slice(6))); } catch {}
  }
  const done = events.find((event) => event.type === "done");
  return { ok: !events.some((event) => event.type === "error"), events, ...(done?.data || {}) };
}
