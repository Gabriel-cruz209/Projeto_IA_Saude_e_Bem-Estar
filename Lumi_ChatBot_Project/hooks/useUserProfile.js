/**
 * hooks/useUserProfile.js
 * Centraliza as ações e o estado do perfil de saúde.
 */

function useUserProfile() {
  const getProfile = () => window.UserProfileService.getProfile();

  const updateProfileField = (field, value) => {
    window.UserProfileService.updateField(field, value);
    // Dispara a notificação de dado salvo
    if (window.ProfileMemoryNotice) {
        window.ProfileMemoryNotice(`Lumi salvou na memória: ${value}`);
    }
  };

  const clearProfile = () => {
    window.UserProfileService.clearProfile();
    if (window.ProfileMemoryNotice) {
        window.ProfileMemoryNotice("Todos os dados de saúde foram apagados.", "info");
    }
  };

  const detectAndSaveInfo = (text) => {
    const detected = window.UserProfileService.detectNewInfo(text);
    
    // Processar informações detectadas e perguntar antes de salvar
    Object.entries(detected).forEach(([key, value]) => {
        // Simulação de confirmação (em app real seria via chat)
        if (confirm(`A Lumi detectou ${key === 'name' ? 'seu nome' : key}: ${value}. Posso salvar esta informação para lembrar no futuro?`)) {
            if (key === 'name') updateProfileField('name', value);
            if (key === 'age') updateProfileField('age', value);
            if (key === 'allergy') updateProfileField('allergies', value);
            if (key === 'condition') updateProfileField('conditions', value);
            if (key === 'medication') updateProfileField('medications', value);
        }
    });
    
    return detected;
  };

  return { getProfile, updateProfileField, clearProfile, detectAndSaveInfo };
}

window.useUserProfile = useUserProfile;
