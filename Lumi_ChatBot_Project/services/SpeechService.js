/**
 * services/SpeechService.js
 * Serviço de Text-to-Speech usando Web Speech API nativa
 */

const SpeechService = {
  // Verifica suporte do browser
  isSupported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  },

  // Inicia reprodução
  speak(text, onEnd) {
    if (!this.isSupported()) return;

    // Cancela qualquer fala anterior
    this.stop();

    const sanitizedText = this.sanitizeText(text);
    const utterance = new SpeechSynthesisUtterance(sanitizedText);
    
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;   // Velocidade natural
    utterance.pitch = 1.05;  // Tom levemente suave
    utterance.volume = 1;    // Volume máximo

    // Configuração de vozes - Priorizando as mais naturais (Google, Microsoft Online, etc)
    const setVoice = () => {
      const vozes = window.speechSynthesis.getVoices();
      
      // Lista de termos que indicam vozes de maior qualidade em diferentes browsers
      const termosQualidade = ['natural', 'google', 'online', 'enhanced', 'neural'];
      
      // 1. Tenta achar uma voz pt-BR feminina com termos de alta qualidade
      let vozSelecionada = vozes.find(v => {
        const name = v.name.toLowerCase();
        return v.lang === 'pt-BR' && 
               name.includes('female') && 
               termosQualidade.some(t => name.includes(t));
      });

      // 2. Se não achou, tenta qualquer pt-BR com termos de qualidade
      if (!vozSelecionada) {
        vozSelecionada = vozes.find(v => {
          const name = v.name.toLowerCase();
          return v.lang === 'pt-BR' && termosQualidade.some(t => name.includes(t));
        });
      }

      // 3. Se ainda não achou, tenta Maria (padrão Microsoft) ou qualquer feminina
      if (!vozSelecionada) {
        vozSelecionada = vozes.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('female')) ||
                        vozes.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('maria'));
      }

      // 4. Fallback final para a primeira pt-BR disponível
      if (!vozSelecionada) {
        vozSelecionada = vozes.find(v => v.lang === 'pt-BR');
      }

      if (vozSelecionada) utterance.voice = vozSelecionada;
    };

    // Chrome precisa do evento onvoiceschanged
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('SpeechService Error:', event);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  },

  // Para reprodução
  stop() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
  },

  // Verifica se está reproduzindo
  isSpeaking() {
    return window.speechSynthesis ? window.speechSynthesis.speaking : false;
  },

  // Pré-processa texto antes de falar
  sanitizeText(text) {
    if (!text) return '';

    let clean = text
      // Remover Markdown comum
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/\*(.*?)\*/g, '$1')   // italic
      .replace(/#(.*?)\n/g, '$1')    // headers
      .replace(/`(.*?)`/g, '$1')     // code
      .replace(/~~(.*?)~~/g, '$1')   // strikethrough
      // Remover URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remover prefixos comuns do bot (ex: "Lumi: Olá") que soam artificiais
      .replace(/^lumi:\s*/gi, '')
      .replace(/^bot:\s*/gi, '')
      // Remover emojis
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Expansão de abreviações (Saúde e Geral)
      .replace(/\bmg\b/gi, ' miligramas ')
      .replace(/\bml\b/gi, ' mililitros ')
      .replace(/\bh\b/gi, ' horas ')
      .replace(/\bmin\b/gi, ' minutos ')
      .replace(/\bupa\b/gi, ' Unidade de Pronto Atendimento ')
      .replace(/\bsus\b/gi, ' Sistema Único de Saúde ')
      .replace(/\bvc\b/gi, ' você ')
      .replace(/\bpresc\b/gi, ' prescrição ')
      .replace(/\bmed\b/gi, ' medicamento ')
      // Limpeza de espaços duplos
      .replace(/\s+/g, ' ')
      .trim();

    return clean;
  }
};

window.SpeechService = SpeechService;
window.addEventListener('beforeunload', () => SpeechService.stop());
