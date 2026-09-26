import { openDB } from "idb";

const DB_NAME = "FPSOSDB";
const STORE_NAME = "wallpapers";

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveWallpaperBlob(file: File | Blob) {
  const db = await initDB();
  await db.put(STORE_NAME, file, "current_wallpaper");
}

export async function getWallpaperBlob(): Promise<Blob | null> {
  const db = await initDB();
  return (await db.get(STORE_NAME, "current_wallpaper")) || null;
}
