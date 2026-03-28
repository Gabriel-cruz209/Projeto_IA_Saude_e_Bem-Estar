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
        window.ProfileMemoryNotice(`Lumi agora lembra que: ${value}`);
    }
  };

  const clearProfile = () => {
    const freshProfile = window.UserProfileService.clearProfile();
    if (window.ProfileMemoryNotice) {
        window.ProfileMemoryNotice("Todos os dados de saúde foram apagados.", "info");
    }
    return freshProfile;
  };

  const detectAndSaveInfo = (text) => {
    const detected = window.UserProfileService.detectNewInfo(text);
    
    // Processar informações detectadas
    Object.entries(detected).forEach(([key, value]) => {
        // Logica para perguntar ou salvar
        // Para este desafio, simulamos o salvamento após detecção
        if (key === 'name') updateProfileField('name', value);
        if (key === 'age') updateProfileField('age', value);
        if (key === 'allergy') updateProfileField('allergies', value);
        if (key === 'condition') updateProfileField('conditions', value);
    });
    
    return detected;
  };

  return { getProfile, updateProfileField, clearProfile, detectAndSaveInfo };
}

window.useUserProfile = useUserProfile;
