/**
 * components/DiaryEntryForm.js
 * Modal para registro diário de sintomas e humor.
 */

function DiaryEntryForm({ onSave, onCancel }) {
  const container = document.createElement('div');
  container.className = 'diary-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'diary-modal';
  
  modal.innerHTML = `
    <div class="diary-header">
      <h2>📔 Registro de Saúde</h2>
      <p>Acompanhe sua saúde em 1 minuto.</p>
    </div>
    
    <div class="diary-body">
      <!-- Humor -->
      <section class="diary-section">
        <label>Como você se sente hoje?</label>
        <div class="mood-selector">
          <button data-mood="bem" class="mood-btn">😊 Bem</button>
          <button data-mood="regular" class="mood-btn">😐 Regular</button>
          <button data-mood="mal" class="mood-btn">😟 Mal</button>
          <button data-mood="ansioso" class="mood-btn">😰 Ansioso</button>
        </div>
      </section>

      <!-- Sintomas -->
      <section class="diary-section">
        <label>Sintomas presentes:</label>
        <div class="symptom-chips-diary">
          ${['Dor de cabeça', 'Cansaço', 'Tosse', 'Dor no corpo', 'Enjoo', 'Febre', 'Coriza', 'Falta de ar'].map(s => `
            <button class="diary-chip" data-symptom="${s.toLowerCase()}">${s}</button>
          `).join('')}
        </div>
      </section>

      <!-- Intensidade (Geral) -->
      <section class="diary-section" id="intensity-section" style="display:none;">
        <label>Intensidade média (0-10):</label>
        <input type="range" min="0" max="10" value="5" class="diary-slider" id="intensity-slider">
        <div class="slider-val" id="intensity-val">5</div>
      </section>

      <!-- Medicamentos e Notas -->
      <section class="diary-section">
        <label>Medicamentos e Notas:</label>
        <textarea id="diary-notes" placeholder="Ex: Tomei 1 comprimido de dipirona. Dormi pouco ontem..."></textarea>
      </section>
    </div>

    <div class="diary-footer">
      <button class="diary-cancel-btn">Cancelar</button>
      <button class="diary-save-btn">Salvar Registro</button>
    </div>
  `;

  let selectedMood = null;
  const selectedSymptoms = new Set();

  // Humor Logic
  modal.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = btn.dataset.mood;
    };
  });

  // Symptom Logic
  modal.querySelectorAll('.diary-chip').forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle('active');
      const s = chip.dataset.symptom;
      if (selectedSymptoms.has(s)) selectedSymptoms.delete(s);
      else selectedSymptoms.add(s);
      
      modal.querySelector('#intensity-section').style.display = selectedSymptoms.size > 0 ? 'block' : 'none';
    };
  });

  // Slider Logic
  const slider = modal.querySelector('#intensity-slider');
  const valDisp = modal.querySelector('#intensity-val');
  slider.oninput = (e) => { valDisp.textContent = e.target.value; };

  // Footer Actions
  modal.querySelector('.diary-cancel-btn').onclick = onCancel;
  modal.querySelector('.diary-save-btn').onclick = () => {
    if (!selectedMood) {
        alert("Por favor, selecione como você se sente hoje.");
        return;
    }

    const data = {
      mood: selectedMood,
      symptoms: Array.from(selectedSymptoms),
      intensity: parseInt(slider.value),
      notes: modal.querySelector('#diary-notes').value,
      riskLevel: selectedSymptoms.size > 2 || parseInt(slider.value) >= 7 ? 'ALTO' : (selectedSymptoms.size > 0 ? 'MODERADO' : 'BAIXO')
    };

    window.DiaryService.saveEntry(data);
    onSave(data);
  };

  container.appendChild(modal);
  return container;
}

window.DiaryEntryForm = DiaryEntryForm;
