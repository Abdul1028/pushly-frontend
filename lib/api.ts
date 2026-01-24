export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://api.wareality.tech";

// export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(options.headers || {}),
//     },
//     cache: "no-store",
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(text || `Request failed: ${res.status}`);
//   }
//   return res.json();

// }

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let body: any = null;

  // Only attempt reading body once
  const raw = await res.text();
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw; // plain text fallback
    }
  }

  if (!res.ok) {
    throw {
      status: res.status,
      data: body
    };
  }

  return body as T;
}


export async function apiFetchAuth<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

