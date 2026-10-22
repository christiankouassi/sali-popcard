// Text is written synchronously before navigation; blobs live in IndexedDB.
// Keys always include the account ID. No public or shared preview reads here.
export const draftKey = (userId: string, cardId?: string) =>
  `popcard:draft:v3:${userId}:${cardId || "new"}`;
export function readDraft(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value?.v === 3 &&
      value.pending &&
      value.data &&
      Array.isArray(value.data.phones) &&
      Array.isArray(value.data.emails)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function writeDraft(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify({ ...value, v: 3, pending: true }));
  window.dispatchEvent(new Event("popcard-draft-change"));
}
export function clearDraft(key: string, owner: string) {
  if (readDraft(key)?.owner === owner) {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("popcard-draft-change"));
  }
}
export function recoverableDrafts(userId: string) {
  try {
    const prefix = `popcard:draft:v3:${userId}:`;
    return Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    )
      .filter((key): key is string => !!key && key.startsWith(prefix))
      .map((key) => ({ key, ...readDraft(key) }))
      .filter((record) => record.pending && record.data);
  } catch {
    return [];
  }
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("popcard-draft-assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("logos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Le stockage du logo est indisponible."));
  });
}
export async function draftAsset(
  key: string,
  action: "get" | "put" | "delete",
  value?: any,
): Promise<any> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "logos",
        action === "get" ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("logos");
      const req =
        action === "put"
          ? store.put(value, key)
          : action === "delete"
            ? store.delete(key)
            : store.get(key);
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
let active: (() => Promise<any>) | undefined;
export function registerDraft(flush: () => Promise<any>) {
  active = flush;
  return () => {
    if (active === flush) active = undefined;
  };
}
export function flushActiveDraft() {
  return active?.();
}
