import sqlite3
from flask import Flask, send_from_directory, request, jsonify
import os

app = Flask(__name__, static_folder='.', static_url_path='')
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                skill INTEGER NOT NULL,
                photo TEXT
            )
        ''')
        conn.commit()

# Inicializa o banco de dados
init_db()

@app.route('/')
def index():
    # Envia o arquivo index.html que está na pasta /frontend/html/
    return send_from_directory('frontend/html', 'index.html')

@app.route('/api/players', methods=['GET'])
def get_players():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM players')
        players = [dict(row) for row in c.fetchall()]
    return jsonify(players)

@app.route('/api/players', methods=['POST'])
def add_player():
    data = request.json
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('INSERT INTO players (name, skill, photo) VALUES (?, ?, ?)',
                  (data['name'], data['skill'], data.get('photo', '')))
        player_id = c.lastrowid
        conn.commit()
    return jsonify({'id': player_id}), 201

@app.route('/api/players/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    data = request.json
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('UPDATE players SET name = ?, skill = ?, photo = ? WHERE id = ?',
                  (data['name'], data['skill'], data.get('photo', ''), player_id))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('DELETE FROM players WHERE id = ?', (player_id,))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/players/batch', methods=['POST'])
def batch_delete():
    data = request.json
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'success': True})
    
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        # Create placeholders for IN clause
        placeholders = ','.join(['?'] * len(ids))
        c.execute(f"DELETE FROM players WHERE id IN ({placeholders})", ids)
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/players/populate', methods=['POST'])
def populate_db():
    import random
    nomes = [
        "Vini", "Pedro", "Cadu", "Bruno", "Caio",
        "Lucas", "Renan", "Beto", "Samuel", "João",
        "Alex", "Gui", "Marcos", "Léo", "Thiago",
        "Diego", "Felipe", "Eduardo", "Rafa", "Victor",
        "André", "Marcelo", "Gael", "Théo"
    ]
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('DELETE FROM players')
        for nome in nomes[:23]:
            skill = random.randint(1, 5)
            c.execute('INSERT INTO players (name, skill, photo) VALUES (?, ?, ?)', (nome, skill, ''))
        conn.commit()
    return jsonify({'success': True})

@app.route('/service-worker.js')
def service_worker():
    """
    O Service Worker PRECISA ser entregue na raiz (/) para conseguir 
    interceptar os arquivos. Portanto criamos uma rota específica para ele.
    """
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')

if __name__ == '__main__':
    # Roda o servidor. Usamos a porta 8080 padrão para Replit/Testes locais.
    port = int(os.environ.get("PORT", 8080))
    print(f"Subindo servidor PWA na porta {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
