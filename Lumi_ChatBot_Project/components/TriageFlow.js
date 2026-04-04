/**
 * components/TriageFlow.js
 * Orquestra o fluxo de perguntas da triagem.
 */

function TriageFlow({ mainSymptom, onComplete, onCancel }) {
  const container = document.createElement('div');
  container.className = 'triage-flow-container';
  
  const steps = window.TriageService.getSteps();
  let currentStepIdx = 0;
  const responses = { initial: mainSymptom };

  const renderCurrentStep = () => {
    container.innerHTML = '';
    const step = steps[currentStepIdx];
    
    // Check if we should skip personal context (T6) if profile is complete
    if (step.id === 'personal_context') {
      const profile = window.UserProfileService.getProfile();
      if (profile.conditions.length > 0) {
        responses.personal_context = profile.conditions.join(', ');
        handleNext();
        return;
      }
    }

    const stage = document.createElement('div');
    stage.className = 'triage-stage';
    
    // Progress Bar
    const progress = (currentStepIdx / (steps.length - 1)) * 100;
    const bar = document.createElement('div');
    bar.className = 'triage-progress-wrapper';
    bar.innerHTML = `
      <div class="triage-progress-bar" style="width: ${progress}%"></div>
      <span class="triage-step-counter">ETAPA ${currentStepIdx + 1} de ${steps.length}</span>
    `;

    const title = document.createElement('h3');
    title.className = 'triage-question';
    title.textContent = step.question;

    const content = document.createElement('div');
    content.className = 'triage-content';

    // Variáveis locais para armazenar o valor atual do passo
    let currentVal = null;

    if (step.type === 'choice') {
      step.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'triage-opt-btn';
        btn.textContent = opt;
        btn.onclick = () => {
           responses[step.id] = opt;
           handleNext();
        };
        content.appendChild(btn);
      });
    } else if (step.type === 'slider') {
      const slider = window.SymptomScaleSlider({ 
        min: step.min, 
        max: step.max, 
        onValueChange: (v) => { currentVal = v; } 
      });
      content.appendChild(slider);
    } else if (step.type === 'checklist') {
      const options = window.TriageService.getChecklistOptions(mainSymptom);
      const checklist = window.SymptomChecklist({ 
        options, 
        onCheckChange: (v) => { currentVal = v; } 
      });
      content.appendChild(checklist);
    } else if (step.type === 'text') {
      const textarea = document.createElement('textarea');
      textarea.className = 'triage-input';
      textarea.placeholder = step.placeholder || 'Digite aqui...';
      textarea.oninput = (e) => { currentVal = e.target.value; };
      content.appendChild(textarea);
    }

    const controls = document.createElement('div');
    controls.className = 'triage-controls';

    if (step.type !== 'choice') {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'triage-next-btn';
        nextBtn.textContent = 'Confirmar e Próximo';
        nextBtn.onclick = () => {
          responses[step.id] = currentVal || (step.type === 'slider' ? 5 : '');
          handleNext();
        };
        controls.appendChild(nextBtn);
    }

    if (step.optional || step.type === 'checklist') {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'triage-skip-btn';
      skipBtn.textContent = 'Não soube responder / Nenhum';
      skipBtn.onclick = () => {
        responses[step.id] = null;
        handleNext();
      };
      controls.appendChild(skipBtn);
    }

    stage.appendChild(bar);
    stage.appendChild(title);
    stage.appendChild(content);
    stage.appendChild(controls);
    container.appendChild(stage);
  };

  const handleNext = () => {
    currentStepIdx++;
    if (currentStepIdx >= steps.length) {
      onComplete(responses);
    } else {
      renderCurrentStep();
    }
  };

  renderCurrentStep();
  return container;
}

window.TriageFlow = TriageFlow;
