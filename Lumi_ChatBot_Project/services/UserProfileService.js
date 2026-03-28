/**
 * services/UserProfileService.js
 * Gerencia a persistência do perfil de saúde do usuário.
 */

const DEFAULT_PROFILE = {
  userId: null,
  name: null,
  age: null,
  conditions: [],
  allergies: [],
  medications: [],
  recurringSymptoms: [],
  communicationStyle: 'simple',
  lastUpdated: null
};

const UserProfileService = {
  getProfile() {
    const data = localStorage.getItem('lumi_user_profile');
    if (!data) {
      const newProfile = { ...DEFAULT_PROFILE, userId: crypto.randomUUID() };
      this.saveProfile(newProfile);
      return newProfile;
    }
    return JSON.parse(data);
  },

  saveProfile(profile) {
    profile.lastUpdated = new Date().toISOString();
    localStorage.setItem('lumi_user_profile', JSON.stringify(profile));
    // Dispara evento para atualizar UI
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: profile }));
  },

  updateField(field, value) {
    const profile = this.getProfile();
    if (Array.isArray(profile[field])) {
      if (!profile[field].includes(value)) {
        profile[field].push(value);
      }
    } else {
      profile[field] = value;
    }
    this.saveProfile(profile);
  },

  clearProfile() {
    localStorage.removeItem('lumi_user_profile');
    return this.getProfile();
  },

  // Lógica simples de detecção de informações (Keywords)
  // Em uma app real, isso viria da extração de entidades da IA (Backend)
  detectNewInfo(text) {
    const info = {
      name: text.match(/meu nome é (\w+)/i)?.[1],
      age: text.match(/tenho (\d+) anos/i)?.[1],
      allergy: text.match(/tenho alergia [àa] ([\w\s]+)/i)?.[1],
      condition: text.match(/tenho (diabetes|hipertensão|asma|rinite)/i)?.[1],
      medication: text.match(/uso ([\w\s]+) continuamente/i)?.[1] || text.match(/tomo ([\w\s]+) todos os dias/i)?.[1]
    };
    
    // Filtra apenas o que foi encontrado
    return Object.fromEntries(Object.entries(info).filter(([_, v]) => v != null));
  }
};

window.UserProfileService = UserProfileService;
