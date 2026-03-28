/**
 * hooks/useAudio.js
 * Hook de controle de áudio ativo para garantir reprodução única.
 */

function useAudio() {
  const getActiveId = () => localStorage.getItem('active_audio_id');
  const setActiveId = (id) => {
    if (id) {
      localStorage.setItem('active_audio_id', id);
    } else {
      localStorage.removeItem('active_audio_id');
    }
    // Notifica outros componentes da mudança
    window.dispatchEvent(new CustomEvent('audioChanged', { detail: id }));
  };

  const play = (id, text, onEnd) => {
    // Se clicou no mesmo áudio que já está tocando, para
    if (getActiveId() === id) {
      stop();
      return;
    }

    // Para áudio anterior
    stop();

    // Iniciar novo
    setActiveId(id);
    window.SpeechService.speak(text, () => {
      setActiveId(null);
      if (onEnd) onEnd();
    });
  };

  const stop = () => {
    window.SpeechService.stop();
    setActiveId(null);
  };

  return { play, stop, getActiveId };
}

window.useAudio = useAudio;
