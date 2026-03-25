let cofheModule: typeof import("cofhejs/web") | null = null;
let loadingPromise: Promise<typeof import("cofhejs/web")> | null = null;

export async function loadCofheWeb() {
  if (typeof window === "undefined") return null;
  if (cofheModule) return cofheModule;
  if (!loadingPromise) {
    loadingPromise = import("cofhejs/web").then((mod) => {
      cofheModule = mod;
      return mod;
    });
  }
  return loadingPromise;
}

export function getCofheWebSync() {
  return cofheModule;
}
