/**
 * services/TriageService.js
 * Gerencia a lógica das etapas de triagem médica.
 */

const TRIAGE_STEPS = [
  {
    id: 'characterization',
    question: 'Onde exatamente você sente e como descreveria essa sensação?',
    options: ['Constante', 'Em crises/Pontadas', 'Vai e volta (Intermitente)', 'Latejante', 'Pressão/Aperto'],
    type: 'choice'
  },
  {
    id: 'timing',
    question: 'Há quanto tempo sente isso e como tem evoluído?',
    options: ['Começou agora/Súbito', 'Algumas horas', 'Alguns dias', 'Mais de uma semana', 'Piora progressiva'],
    type: 'choice'
  },
  {
    id: 'intensity',
    question: 'Em uma escala de 0 a 10, qual a intensidade deste desconforto?',
    type: 'slider',
    min: 0,
    max: 10
  },
  {
    id: 'associated',
    question: 'Você está sentindo algum desses outros sintomas também?',
    type: 'checklist',
    options: {
      'dor de cabeça': ['Febre', 'Náusea', 'Sensibilidade à luz', 'Tontura', 'Rigidez no pescoço'],
      'dor no peito': ['Falta de ar', 'Suor frio', 'Palpitação', 'Dor no braço', 'Desmaio'],
      'abdominal': ['Enjoo', 'Diarréia', 'Gases', 'Inchaço', 'Falta de apetite'],
      'gripe': ['Febre', 'Coriza', 'Dor no corpo', 'Tosse seca', 'Espirros', 'Dor de garganta'],
      'resfriado': ['Coriza', 'Espirros', 'Tosse leve', 'Nariz entupido', 'Dor de garganta'],
      'febre': ['Calafrios', 'Suor excessivo', 'Dores musculares', 'Desidratação', 'Fraqueza'],
      'default': ['Febre', 'Tosse', 'Fraqueza', 'Perda de apetite', 'Coceira']
    }
  },
  {
    id: 'factors',
    question: 'Algo que você faz melhora ou piora o sintoma? Tomou algum remédio?',
    type: 'text',
    placeholder: 'Ex: Melhora ao deitar, piora ao comer...'
  },
  {
    id: 'personal_context',
    question: 'Tem alguma outra condição de saúde relevante que eu deva saber?',
    type: 'text',
    optional: true
  }
];

const TriageService = {
  getSteps() { return TRIAGE_STEPS; },
  
  getChecklistOptions(mainSymptom) {
    const symptom = mainSymptom.toLowerCase();
    for (const key in TRIAGE_STEPS[3].options) {
      if (symptom.includes(key)) return TRIAGE_STEPS[3].options[key];
    }
    return TRIAGE_STEPS[3].options.default;
  },

  // Lógica simplificada para calcular o risco final
  calculateFinalRisk(responses) {
    let score = 0;
    
    // Intensidade
    if (responses.intensity >= 8) score += 3;
    else if (responses.intensity >= 5) score += 1;

    // Tempo
    if (responses.timing === 'Começou agora/Súbito') score += 2;

    // Sintomas Associados perigosos
    const dangerous = ['Falta de ar', 'Desmaio', 'Suor frio', 'Rigidez no pescoço', 'Dor no braço'];
    if (responses.associated && responses.associated.some(s => dangerous.includes(s))) {
        score += 4;
    }

    if (score >= 6) return 'URGENTE';
    if (score >= 4) return 'ALTO';
    if (score >= 2) return 'MODERADO';
    return 'BAIXO';
  }
};

window.TriageService = TriageService;
