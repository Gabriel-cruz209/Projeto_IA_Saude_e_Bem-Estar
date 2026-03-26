from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os
import json
import datetime
import logging
import shutil

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

# Configurar chave da API Groq (use variáveis de ambiente para segurança)
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
groq_client = Groq(api_key=GROQ_API_KEY)

# Simulação de usuários para login (em produção, use um banco de dados)
users = {
    'user@example.com': 'password123'
}

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if email in users and users[email] == password:
        return jsonify({'success': True, 'message': 'Login realizado com sucesso!'})
    else:
        return jsonify({'success': False, 'message': 'Credenciais inválidas.'}), 401

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({'error': 'Mensagem não fornecida.'}), 400

    try:
        # Prompt para o chatbot focado em saúde e bem-estar
        prompt = f"Você é Lumi, um assistente de IA especializado em saúde e bem-estar. Responda de forma amigável, empática e informativa. A mensagem do usuário é: {user_message}"

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Atualizado para o modelo funcional atual da Groq
            messages=[
                {"role": "system", "content": "Você é Lumi, um assistente de saúde e bem-estar."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=150,
            temperature=0.7
        )

        bot_response = response.choices[0].message.content.strip()
        return jsonify({'response': bot_response})

    except Exception as e:
        return jsonify({'error': f'Erro ao processar a mensagem: {str(e)}'}), 500

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
    load_dotenv()
    app.run(debug=True)


