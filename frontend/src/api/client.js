const API_BASE = import.meta.env.VITE_API_URL || 'https://https-ggshcare-app.onrender.com';

function getStaffToken() {
  try {
    const stored = localStorage.getItem('staff_auth');
    return stored ? JSON.parse(stored)?.token : null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getStaffToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // API routes in the app already include /api. Normalize the configured
  // base URL so both https://host and https://host/api work correctly.
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
  const url = `${base}${cleanPath}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { data };
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};