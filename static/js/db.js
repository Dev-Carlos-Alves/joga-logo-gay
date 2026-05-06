const DB_NAME = 'SorteioVoleiDB';
const DB_VERSION = 1;
const STORE_NAME = 'players';

let dbInstance;

window.db = {
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => reject("Erro ao abrir banco IndexedDB");

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
            if (!dbInstance) return reject("DB não iniciado");
            const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Erro ao buscar jogadores");
        });
    },

    addPlayer: function(player) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject("DB não iniciado");
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(player);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Erro ao adicionar jogador");
        });
    },

    updatePlayer: function(player) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject("DB não iniciado");
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(player);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Erro ao atualizar jogador");
        });
    },

    deletePlayer: function(id) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject("DB não iniciado");
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Erro ao deletar jogador");
        });
    },

    batchDeletePlayers: function(ids) {
        return new Promise((resolve, reject) => {
            if (!dbInstance) return reject("DB não iniciado");
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
                request.onerror = () => reject("Erro ao deletar em lote");
            });
        });
    }
};
