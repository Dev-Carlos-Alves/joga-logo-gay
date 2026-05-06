import pandas as pd
import json
import os

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'images', 'jogadores', 'Informações de Jogador - Vale no Volei (respostas).xlsx')
JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'json', 'teste_jogadores.json')
IMAGES_BASE = '/static/images/jogadores/'

def sync_players():
    try:
        df = pd.read_excel(EXCEL_PATH)
        jogadores = []
        
        for index, row in df.iterrows():
            nome = str(row['Qual seu nome de Jogador no Vale?']).strip()
            if pd.isna(nome) or nome == 'nan':
                continue
                
            skill_str = str(row['Qual seu nivel de Habilidade no Vôlei?'])
            # Extract the first digit for skill
            skill = 1
            for char in skill_str:
                if char.isdigit():
                    skill = int(char)
                    break
                    
            foto_nome = str(row['Nome da foto no sistema']).strip()
            foto_path = IMAGES_BASE + foto_nome if foto_nome and foto_nome != 'nan' else '/static/images/vale.jpg'
            
            jogadores.append({
                "id": index + 1,
                "name": nome,
                "skill": skill,
                "photo": foto_path
            })
            
        # Salva no arquivo JSON
        os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(jogadores, f, ensure_ascii=False, indent=2)
            
        print(f"Sucesso! {len(jogadores)} jogadores foram importados da planilha e salvos no banco fixo.")
    except Exception as e:
        print(f"Erro ao processar a planilha: {e}")

if __name__ == '__main__':
    sync_players()
