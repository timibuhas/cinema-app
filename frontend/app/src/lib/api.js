const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

function getAbsoluteApiUrl(path) {
  return `${API_URL}${path}`;
}

export function resolveImageUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("/")) {
    return getAbsoluteApiUrl(rawUrl);
  }

  return rawUrl;
}

async function readError(response) {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (typeof payload?.message === "string") {
      return payload.message;
    }
    return JSON.stringify(payload);
  } catch {
    try {
      const text = await response.text();
      return text || "Request failed";
    } catch {
      return "Request failed";
    }
  }
}

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    headers,
    isFormData = false,
  } = options;

  const token = localStorage.getItem("token");

  const response = await fetch(getAbsoluteApiUrl(path), {
    method,
    headers: {
      ...(isFormData || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body:
      body === undefined
        ? undefined
        : isFormData
        ? body
        : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

export const authApi = {
  login: (payload) => request("/login", { method: "POST", body: payload }),
  logout: () => request("/logout", { method: "POST" }),
  register: (payload) => request("/register", { method: "POST", body: payload }),
  me: () => request("/me"),
  sendVerificationCode: (email) => request("/verify-email/send", { method: "POST", body: { email } }),
  checkVerificationCode: (email, code) => request("/verify-email/check", { method: "POST", body: { email, code } }),
};

export const moviesApi = {
  list: () => request("/movies"),
  get: (id) => request(`/movies/${id}`),
  create: (payload) => request("/movies", { method: "POST", body: payload }),
  update: (id, payload) => request(`/movies/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/movies/${id}`, { method: "DELETE" }),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/movies/upload-image", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/movies/upload-image", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },
};

export const usersApi = {
  list: () => request("/users/"),
  create: (payload) => request("/users/", { method: "POST", body: payload }),
  update: (id, payload) => request(`/users/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
};

export const hallsApi = {
  list: () => request("/halls"),
  create: (payload) => request("/halls", { method: "POST", body: payload }),
  update: (id, payload) => request(`/halls/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/halls/${id}`, { method: "DELETE" }),
};

export const screeningsApi = {
  list: () => request("/screenings"),
  create: (payload) => request("/screenings", { method: "POST", body: payload }),
  update: (id, payload) => request(`/screenings/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/screenings/${id}`, { method: "DELETE" }),
  seats: (screeningId) => request(`/screenings/${screeningId}/seats`),
};

export const reservationsApi = {
  listMine: () => request("/reservations/me"),
  listAll: () => request("/reservations/admin"),
  createMine: (payload) => request("/reservations/me", { method: "POST", body: payload }),
  createMineBulk: (payload) => request("/reservations/me/bulk", { method: "POST", body: payload }),
  createAdmin: (payload) => request("/reservations/admin", { method: "POST", body: payload }),
  createAdminBulk: (payload) => request("/reservations/admin/bulk", { method: "POST", body: payload }),
  updateMine: (id, payload) => request(`/reservations/me/${id}`, { method: "PUT", body: payload }),
  updateAdmin: (id, payload) => request(`/reservations/admin/${id}`, { method: "PUT", body: payload }),
  removeMine: (id) => request(`/reservations/me/${id}`, { method: "DELETE" }),
  removeAdmin: (id) => request(`/reservations/admin/${id}`, { method: "DELETE" }),
};

export const chatApi = {
  ask: (payload) => request("/chat/ask", { method: "POST", body: payload }),
  mutate: (payload) => request("/chat/mutate", { method: "POST", body: payload }),
  health: () => request("/chat/health"),
};

export const contactApi = {
  send: (payload) => request("/contact", { method: "POST", body: payload }),
};

export const reviewsApi = {
  listForMovie: (movieId) => request(`/reviews/movie/${movieId}`),
  canReview: (movieId) => request(`/reviews/can-review/${movieId}`),
  create: (payload) => request("/reviews", { method: "POST", body: payload }),
  remove: (id) => request(`/reviews/${id}`, { method: "DELETE" }),
};

export { API_URL };
