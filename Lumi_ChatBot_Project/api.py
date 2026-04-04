from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import datetime
import logging
import shutil

# Carregar variáveis de ambiente do arquivo .env
# Tenta carregar do diretório atual ou do diretório pai
if not load_dotenv():
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configurações de Persistência
DATA_DIR = './data'
CONVERSATIONS_FILE = os.path.join(DATA_DIR, 'conversations.json')
LOG_FILE = 'lumi_errors.log'
BACKUP_DIR = os.path.join(DATA_DIR, 'backups')

# Garantir existência dos diretórios
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# Configuração de Logs
logging.basicConfig(filename=LOG_FILE, level=logging.ERROR, 
                    format='%(asctime)s %(levelname)s:%(message)s')

app = Flask(__name__)
CORS(app)

# Configurar chave da API OpenAI (use variáveis de ambiente para segurança)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    logging.error("Variável OPENAI_API_KEY não foi encontrada. Verifique seu arquivo .env.")
    raise ValueError("ERRO CRÍTICO: OPENAI_API_KEY ausente.")

# Limpar aspas da chave se existirem
OPENAI_API_KEY = OPENAI_API_KEY.strip("'\"")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({'error': 'Mensagem não fornecida.'}), 400

    try:
        system_prompt = (
            "Você é Lumi, um assistente de saúde e bem-estar amigável, técnico e empático. "
            "Sua missão é fornecer orientações baseadas em evidências. Sua resposta deve ser estruturada e prática.\n\n"
            "DIRETRIZES DE RESPOSTA:\n"
            "1. RESUMO E SÍNTESE: Comece com uma análise direta dos sintomas relatados.\n"
            "2. CONDUTA PRÁTICA: Explique exatamente 'O que fazer agora' (ex: procurar médico, repouso, hidratação).\n"
            "3. CUIDADOS EM CASA: Sugira medidas não farmacológicas seguras (ex: compressas, dieta leve).\n"
            "4. SINAIS DE ALERTA: Liste sinais (Bandeiras Vermelhas) que indicam necessidade de ida imediata ao Pronto-Socorro.\n\n"
            "FORMATO OBRIGATÓRIO (blocos JSON nas últimas linhas):\n"
            "Ao final, inclua sempre:\n"
            "SOURCES: [ { \"name\": \"...\", \"url\": \"...\", \"type\": \"national\" | \"international\" } ]\n"
            "RESOURCES: [ { \"type\": \"video\" | \"article\", \"title\": \"...\", \"url\": \"...\", \"source\": \"...\" } ]\n"
            "Mantenha os links reais de fontes como Ministério da Saúde, Drauzio Varella, Einstein, OMS, Mayo Clinic.\n"
            "Importante: Use apenas aspas duplas (\") nos JSONs. Não adicione texto após o último bloco JSON."
        )

        # Recuperar histórico de mensagens (contexto)
        messages_history = data.get('history', [])
        
        # Iniciar lista de mensagens com o prompt do sistema
        messages = [{"role": "system", "content": system_prompt}]
        
        # Se houver histórico, formatar e adicionar (bot -> assistant)
        if messages_history:
            # Mapear roles para o formato OpenAI e limitar histórico
            formatted_history = []
            for msg in messages_history[-10:]:
                role = "assistant" if msg.get('role') == 'bot' else msg.get('role')
                formatted_history.append({"role": role, "content": msg.get('content')})
            
            # Verificar se a última mensagem do histórico já é a mensagem atual para evitar duplicidade
            if formatted_history and formatted_history[-1]['content'] == user_message:
                messages.extend(formatted_history)
            else:
                messages.extend(formatted_history)
                messages.append({"role": "user", "content": user_message})
        else:
            # Caso não venha histórico, adiciona apenas a mensagem atual
            messages.append({"role": "user", "content": user_message})

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=800,  # Limite aumentado para prevenir corte do payload JSON
            temperature=0.6
        )

        bot_response = response.choices[0].message.content.strip()
        return jsonify({'response': bot_response})

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Erro ao processar a mensagem: {error_msg}")
        print(f"ERRO NO BACKEND: {error_msg}")
        return jsonify({'error': f'Erro ao processar a mensagem: {error_msg}'}), 500

# Helper: Carregar conversas do arquivo
def load_conversations_from_disk():
    if not os.path.exists(CONVERSATIONS_FILE):
        return {"version": "1.0", "lastUpdated": "", "conversations": []}
    try:
        with open(CONVERSATIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Erro ao carregar conversas: {str(e)}")
        return None

# Helper: Criar Backup Diário
def create_backup():
    try:
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        backup_path = os.path.join(BACKUP_DIR, f'lumi_conversations_backup_{today}.json')
        if not os.path.exists(backup_path) and os.path.exists(CONVERSATIONS_FILE):
            shutil.copy2(CONVERSATIONS_FILE, backup_path)
            
            # Manter apenas os últimos 7 backups
            backups = sorted([os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR)])
            while len(backups) > 7:
                os.remove(backups.pop(0))
    except Exception as e:
        logging.error(f"Erro ao criar backup: {str(e)}")

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    data = load_conversations_from_disk()
    if data is None:
        return jsonify({"error": "Falha ao ler arquivo de dados"}), 500
    return jsonify(data)

@app.route('/api/conversations', methods=['POST'])
def save_conversations():
    try:
        data = request.get_json()
        data['lastUpdated'] = datetime.datetime.now().isoformat() + 'Z'
        
        with open(CONVERSATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        create_backup()
        return jsonify({"success": True})
    except Exception as e:
        logging.error(f"Erro ao salvar conversas: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)


