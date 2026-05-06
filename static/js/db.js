// Backend REST API client
window.db = {
    init: async function() {
        // No initialization required for REST API
        return Promise.resolve();
    },

    getAllPlayers: async function() {
        try {
            const res = await fetch('/api/players');
            if (!res.ok) throw new Error('Failed to fetch');
            return await res.json();
        } catch (e) {
            console.error('Error fetching players:', e);
            return [];
        }
    },

    addPlayer: async function(player) {
        try {
            const res = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(player)
            });
            if (!res.ok) throw new Error('Failed to add');
            const data = await res.json();
            return data.id;
        } catch (e) {
            console.error('Error adding player:', e);
        }
    },

    updatePlayer: async function(player) {
        try {
            const res = await fetch(`/api/players/${player.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(player)
            });
            if (!res.ok) throw new Error('Failed to update');
        } catch (e) {
            console.error('Error updating player:', e);
        }
    },

    deletePlayer: async function(id) {
        try {
            const res = await fetch(`/api/players/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
        } catch (e) {
            console.error('Error deleting player:', e);
        }
    },

    batchDeletePlayers: async function(ids) {
        try {
            const res = await fetch('/api/players/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (!res.ok) throw new Error('Failed to batch delete');
        } catch (e) {
            console.error('Error batch deleting players:', e);
        }
    }
};
