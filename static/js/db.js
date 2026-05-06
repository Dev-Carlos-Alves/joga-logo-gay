const DB_NAME = 'SorteioVoleiDB';
const DB_VERSION = 1;
const STORE_NAME = 'players';

let dbInstance;

window.db = {
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => reject(new Error("Erro ao abrir banco IndexedDB: " + e.target.error.message));

            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    },

    getAllPlayers: function() {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error("DB não iniciado"));
            const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(new Error("Erro ao buscar jogadores: " + e.target.error.message));
        });
    },

    addPlayer: function(player) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error("DB não iniciado"));
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(player);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(new Error("Erro ao adicionar jogador: " + e.target.error.message));
        });
    },

    updatePlayer: function(player) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error("DB não iniciado"));
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(player);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(new Error("Erro ao atualizar jogador: " + e.target.error.message));
        });
    },

    deletePlayer: function(id) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error("DB não iniciado"));
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(new Error("Erro ao deletar jogador: " + e.target.error.message));
        });
    },

    batchDeletePlayers: function(ids) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject(new Error("DB não iniciado"));
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            let count = 0;
            if (ids.length === 0) resolve();
            ids.forEach(id => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    count++;
                    if(count === ids.length) {
                        resolve();
                    }
                };
                request.onerror = (e) => reject(new Error("Erro ao deletar em lote: " + e.target.error.message));
            });
        });
    }
};
