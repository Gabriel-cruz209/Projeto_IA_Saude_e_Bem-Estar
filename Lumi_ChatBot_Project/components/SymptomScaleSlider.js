/**
 * components/SymptomScaleSlider.js
 * Componente visual de slider para a escala de dor.
 */

function SymptomScaleSlider({ onValueChange, min = 0, max = 10 }) {
    const container = document.createElement('div');
    container.className = 'symptom-slider-wrapper';

    const header = document.createElement('div');
    header.className = 'slider-header';
    header.innerHTML = `
        <span class="slider-min">${min} (Mínima)</span>
        <span class="slider-current">Intensidade: <span id="slider-val">5</span></span>
        <span class="slider-max">${max} (Máxima)</span>
    `;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = 1;
    input.value = 5;
    input.className = 'symptom-slider';

    input.oninput = (e) => {
        const val = e.target.value;
        container.querySelector('#slider-val').textContent = val;
        onValueChange(val);
        
        // Cores conforme intensidade
        const percent = (val - min) / (max - min) * 100;
        const color = `hsl(${120 - (percent * 1.2)}, 80%, 45%)`;
        input.style.setProperty('--slider-fill', color);
    };

    container.appendChild(header);
    container.appendChild(input);
    
    // Inicialização da cor
    input.oninput({ target: input });

    return container;
}

window.SymptomScaleSlider = SymptomScaleSlider;
