/**
 * components/AudioButton.js
 * Botão de voz para reprodução das mensagens da Lumi.
 */

function AudioButton({ text, messageId } = {}) {
  // Verifica suporte ao SpeechSynthesis
  if (!window.SpeechService.isSupported()) {
    return null; // Fallback silencioso
  }

  const { play, getActiveId } = window.useAudio();
  const button = document.createElement('button');
  button.className = 'audio-button';
  button.setAttribute('aria-label', 'Ouvir resposta');
  button.title = "Ouvir resposta";

  const updateUI = (isPlaying) => {
    button.innerHTML = isPlaying
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>` // Stop Icon
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`; // Sound Icon
    
    if (isPlaying) {
      button.classList.add('playing');
    } else {
      button.classList.remove('playing');
    }
  };

  updateUI(getActiveId() === messageId);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    play(messageId, text, () => {
      updateUI(false);
    });
    updateUI(getActiveId() === messageId);
  });

  // Atualizar quando áudio ativo mudar de outro lugar
  window.addEventListener('audioChanged', (e) => {
    updateUI(e.detail === messageId);
  });

  return button;
}

window.AudioButton = AudioButton;
