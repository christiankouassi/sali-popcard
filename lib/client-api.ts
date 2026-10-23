export async function api(path: string, data?: any, options: RequestInit = {}) {
  const isForm = data instanceof FormData;
  const res = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    ...options,
    headers: {
      ...(data !== undefined && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    body: data === undefined ? undefined : isForm ? data : JSON.stringify(data),
  });
  const value = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      value.error ||
        (res.status === 413
          ? "Fichier trop volumineux."
          : "Connexion impossible. Vérifiez votre réseau et réessayez."),
    ) as Error & { status: number; issues?: any[] };
    error.status = res.status;
    error.issues = value.issues;
    throw error;
  }
  return value;
}
