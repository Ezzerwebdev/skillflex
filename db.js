/**
 * SkillFlex PWA — db.js
 * This file contains all the helper functions for interacting with IndexedDB.
 * It sets up the database, handles version upgrades, and provides simple
 * async functions for getting, putting, and deleting data.
 */

// --- Database Configuration ---
const DB_NAME = 'skillflex-db';
// IMPORTANT: Start with version 2 to match the app.js integration guide.
// Increment this number whenever you change the database structure below.
const DB_VER = 2;

// A map of all the "tables" (Object Stores) in our database.
const STORES = {
    packs: 'packs',         // Caches lesson content fetched from JSON files.
    queue: 'queue',         // For queueing API requests when offline (future use).
    meta: 'meta',           // Stores metadata like the guest user ID.
    progress: 'progress'    // Stores the user's entire game progress object.
};

// --- Core IndexedDB Functions ---

/**
 * Opens a connection to the IndexedDB database.
 * This function also handles creating and updating the database schema.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database connection object.
 */
function idbOpen() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VER);

        // This event only runs when the DB_VER is higher than the existing version.
        // It's the only place where you can alter the database structure.
        request.onupgradeneeded = (event) => {
            const db = request.result;
            console.log(`Upgrading database to version ${DB_VER}`);

            // We check if each store exists before creating it. This makes
            // future upgrades easier and prevents errors.
            if (!db.objectStoreNames.contains(STORES.packs)) {
                db.createObjectStore(STORES.packs, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.queue)) {
                db.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.meta)) {
                db.createObjectStore(STORES.meta, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.progress)) {
                db.createObjectStore(STORES.progress, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * A generic function to add or update a record in a specified store.
 * @param {string} storeName - The name of the store to write to.
 * @param {object} value - The object to save.
 * @returns {Promise<boolean>} A promise that resolves to true on success.
 */
export async function idbPut(storeName, value) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).put(value);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * A generic function to retrieve a single record by its key.
 * @param {string} storeName - The name of the store to read from.
 * @param {any} key - The key of the record to find.
 * @returns {Promise<object|null>} A promise that resolves with the record or null if not found.
 */
export async function idbGet(storeName, key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * A generic function to retrieve all records from a store.
 * @param {string} storeName - The name of the store to read from.
 * @returns {Promise<Array>} A promise that resolves with an array of all records.
 */
export async function idbGetAll(storeName) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * A generic function to delete a record by its key.
 * @param {string} storeName - The name of the store to delete from.
 * @param {any} key - The key of the record to delete.
 * @returns {Promise<boolean>} A promise that resolves to true on success.
 */
export async function idbDelete(storeName, key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).delete(key);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
}
