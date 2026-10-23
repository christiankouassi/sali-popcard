"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { clientId } from "@/lib/client-id.mjs";
import {
  clearDraft,
  draftAsset,
  draftKey,
  readDraft,
  registerDraft,
  writeDraft,
} from "@/lib/draft-storage";

type Session = {
  key: string;
  userId: string;
  owner: string;
  clientId: string;
  card: any;
  data: any;
  ready: boolean;
  dirty: boolean;
  logo: any;
  logoStore?: Promise<any>;
  revision: number;
  saved: number;
  promise?: Promise<any>;
};

export default function useCardDraft(
  id: string | undefined,
  userId: string,
  defaults: any,
) {
  const [card, setCard] = useState<any>(null);
  const [d, setData] = useState<any>(structuredClone(defaults));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [localLogo, setLocalLogo] = useState<string>();
  const [storageWarning, setStorageWarning] = useState("");
  const current = useRef<Session | null>(null);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const persist = useCallback((s: Session) => {
    try {
      writeDraft(s.key, {
        owner: s.owner,
        clientId: s.clientId,
        cardId: s.card?.id,
        data: s.data,
        logo: !!s.logo,
        version: s.card?.draft_version,
        updatedAt: Date.now(),
      });
    } catch {
      if (mounted.current)
        setStorageWarning(
          "La récupération sur cet appareil est indisponible. Attendez la confirmation d’enregistrement avant de fermer cette page.",
        );
    }
  }, []);
  const flush = useCallback(
    async (force = false): Promise<any> => {
      clearTimeout(timer.current);
      const s = current.current;
      if (!s?.ready) return s?.card;
      if (force && !s.card) {
        s.dirty = true;
        persist(s);
      }
      if (s.promise) return s.promise;
      if (!s.dirty && !s.logo) return s.card;
      const show = (fn: () => void) => {
        if (mounted.current && current.current === s) fn();
      };
      s.promise = (async () => {
        show(() => {
          setSaveStatus("Enregistrement…");
          setError("");
          setBusy(true);
        });
        try {
          while (s.dirty || s.logo) {
            const revision = s.revision;
            const snapshot = structuredClone(s.data);
            if (!s.card) {
              const created = await api("cards", snapshot, {
                headers: { "X-Popcard-Draft-Id": s.clientId },
              });
              s.card = created;
              const oldKey = s.key;
              s.key = draftKey(s.userId, created.id);
              if (s.logo) {
                await s.logoStore;
                s.logoStore = draftAsset(s.key, "put", s.logo).catch(() => {});
                await draftAsset(oldKey, "delete").catch(() => {});
              }
              persist(s);
              clearDraft(oldKey, s.owner);
              // Idempotent retries can return an older accepted creation.
              if (JSON.stringify(created.data) !== JSON.stringify(snapshot))
                s.dirty = true;
              else if (revision === s.revision) s.dirty = false;
              show(() => setCard(created));
              if (
                current.current === s &&
                location.pathname === "/app/cards/new"
              )
                window.history.replaceState(
                  null,
                  "",
                  "/app/cards/" + created.id,
                );
            }
            if (s.dirty) {
              const saved = await api("cards/" + s.card.id, snapshot, {
                headers: s.card.draft_version
                  ? { "X-Popcard-Version": s.card.draft_version }
                  : {},
              });
              s.card = saved;
              if (revision === s.revision) {
                s.dirty = false;
                s.saved = revision;
                s.data = { ...defaults, ...saved.data };
                show(() => setData(s.data));
              }
              show(() => setCard(saved));
            }
            const asset = s.logo;
            if (asset) {
              await s.logoStore;
              const form = new FormData();
              form.set("file", asset.file);
              form.set("original", asset.original);
              const uploaded = await api("cards/" + s.card.id + "/logo", form, {
                headers: s.card.draft_version
                  ? { "X-Popcard-Version": s.card.draft_version }
                  : {},
              });
              s.card = { ...s.card, ...uploaded };
              if (s.logo === asset) {
                s.logo = null;
                await draftAsset(s.key, "delete").catch(() => {});
              }
              show(() => setCard(s.card));
            }
            if (s.dirty || s.logo) persist(s);
          }
          clearDraft(s.key, s.owner);
          show(() => setSaveStatus("Enregistré"));
          return s.card;
        } catch (e: any) {
          persist(s);
          show(() => {
            setSaveStatus(
              e.status === 409 ? "Conflit de modification" : "À synchroniser",
            );
            setError(
              e.status === 409
                ? e.message + " Vos saisies sont conservées sur cet appareil."
                : "Enregistrement interrompu. Vos saisies sont conservées sur cet appareil. Réessayez après avoir vérifié votre connexion. " +
                    ([400, 422].includes(e.status) ? e.message : ""),
            );
          });
          throw e;
        } finally {
          s.promise = undefined;
          show(() => setBusy(false));
        }
      })();
      return s.promise;
    },
    [defaults, persist],
  );
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush().catch(() => {});
    }, 650);
  }, [flush]);
  const setD = useCallback(
    (next: any) => {
      const s = current.current;
      if (!s?.ready) return;
      s.data = typeof next === "function" ? next(s.data) : next;
      s.revision++;
      s.dirty = true;
      setData(s.data);
      setSaveStatus("Modifications en cours");
      persist(s);
      schedule();
    },
    [persist, schedule],
  );
  const onLogo = useCallback(
    async (file: File, url: string, original: File) => {
      const s = current.current;
      if (!s?.ready) return;
      s.logo = { file, original };
      setLocalLogo(url);
      persist(s);
      s.logoStore = draftAsset(s.key, "put", s.logo).catch(() => {
        setStorageWarning(
          "Le logo doit finir son envoi avant de fermer cette page.",
        );
      });
      await flush(true);
    },
    [flush, persist],
  );
  const resolveConflict = useCallback(
    async (keepLocal: boolean) => {
      const s = current.current;
      if (!s?.card) return;
      try {
        const latest = await api("cards/" + s.card.id);
        s.card = latest;
        setCard(latest);
        if (keepLocal) {
          s.dirty = true;
          persist(s);
          await flush();
        } else {
          s.dirty = false;
          s.logo = null;
          s.data = { ...defaults, ...latest.data };
          clearDraft(s.key, readDraft(s.key)?.owner || s.owner);
          await draftAsset(s.key, "delete").catch(() => {});
          setData(s.data);
          setLocalLogo(undefined);
          setError("");
          setSaveStatus("Enregistré");
        }
      } catch (e: any) {
        setError(e.message);
      }
    },
    [defaults, flush, persist],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      void flush().catch(() => {});
    };
  }, [flush]);
  useEffect(() => {
    if (
      current.current?.ready &&
      current.current.userId === userId &&
      current.current.card?.id === id
    )
      return;
    let cancelled = false;
    const key = draftKey(userId, id);
    const local = readDraft(key);
    const s: Session = {
      key,
      userId,
      owner: clientId(),
      clientId: local?.clientId || clientId(),
      card: null,
      data: structuredClone(defaults),
      ready: false,
      dirty: false,
      logo: null,
      revision: 0,
      saved: 0,
    };
    current.current = s;
    setReady(false);
    setCard(null);
    setLocalLogo(undefined);
    setError("");
    (async () => {
      try {
        const server =
          id || local?.cardId
            ? await api("cards/" + (id || local.cardId))
            : null;
        if (cancelled) return;
        s.card = server;
        s.data = { ...defaults, ...(server?.data || {}) };
        if (local) {
          s.data = { ...s.data, ...local.data };
          // Preserve the version the local edits were based on; a second tab
          // cannot silently overwrite a newer server version.
          if (s.card && local.version)
            s.card = { ...s.card, draft_version: local.version };
          s.dirty = true;
          if (local.logo) {
            s.logo = await draftAsset(key, "get").catch(() => null);
            if (s.logo) setLocalLogo(URL.createObjectURL(s.logo.file));
          }
          setSaveStatus("Brouillon récupéré sur cet appareil");
        } else setSaveStatus(server ? "Enregistré" : "Sauvegarde automatique");
        if (cancelled) return;
        s.ready = true;
        setData(s.data);
        setCard(server);
        setReady(true);
        if (local) {
          persist(s);
          schedule();
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          setSaveStatus("Chargement impossible");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, userId, defaults, persist, schedule]);
  useEffect(() => registerDraft(() => flush()), [flush]);
  useEffect(() => {
    const online = () => {
      void flush().catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") online();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = current.current;
      // Text has a synchronous backup. A blob whose persistence is still in
      // flight needs the browser's native leave protection.
      if (s?.logo) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("pagehide", online);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("pagehide", online);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [flush]);
  useEffect(
    () => () => {
      if (localLogo?.startsWith("blob:")) URL.revokeObjectURL(localLogo);
    },
    [localLogo],
  );
  return {
    card,
    d,
    setD,
    ready,
    error,
    setError,
    saveStatus,
    busy,
    localLogo,
    storageWarning,
    flush,
    onLogo,
    resolveConflict,
  };
}
