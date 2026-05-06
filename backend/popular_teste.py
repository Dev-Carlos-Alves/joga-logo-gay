import sqlite3
import random
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

nomes = [
    "Vini", "Pedro", "Cadu", "Bruno", "Caio",
    "Lucas", "Renan", "Beto", "Samuel", "João",
    "Alex", "Gui", "Marcos", "Léo", "Thiago",
    "Diego", "Felipe", "Eduardo", "Rafa", "Victor",
    "André", "Marcelo", "Gael", "Théo"
]

def popular_banco():
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
        
        c.execute('DELETE FROM players')
        
        for nome in nomes[:23]:
            skill = random.randint(1, 5)
            c.execute('INSERT INTO players (name, skill, photo) VALUES (?, ?, ?)', (nome, skill, ''))
            
        conn.commit()
    print("Banco de dados SQLite populado com 23 jogadores para teste!")

if __name__ == '__main__':
    popular_banco()
