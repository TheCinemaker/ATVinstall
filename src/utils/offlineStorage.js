import { openDB } from 'idb';

const DB_NAME = 'atvinstall-offline';
const STORE_NAME = 'imageQueue';

export const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

export const saveToQueue = async (item) => {
    const db = await initDB();
    await db.put(STORE_NAME, item);
};

export const getQueue = async () => {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
};

export const removeFromQueue = async (id) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};
