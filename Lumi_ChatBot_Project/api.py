from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()
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

if __name__ == '__main__':
    app.run(debug=True)

