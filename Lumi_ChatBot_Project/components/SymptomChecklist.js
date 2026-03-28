/**
 * components/SymptomChecklist.js
 * Componente de checklist dinâmico de sintomas.
 */

function SymptomChecklist({ options, onCheckChange }) {
    const list = document.createElement('div');
    list.className = 'symptom-checklist';
    
    const selected = new Set();

    options.forEach(opt => {
        const item = document.createElement('label');
        item.className = 'checklist-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = opt;
        
        const text = document.createElement('span');
        text.className = 'check-text';
        text.textContent = opt;

        checkbox.onchange = (e) => {
            if (e.target.checked) selected.add(opt);
            else selected.delete(opt);
            
            item.classList.toggle('checked', e.target.checked);
            onCheckChange(Array.from(selected));
        };

        item.appendChild(checkbox);
        item.appendChild(text);
        list.appendChild(item);
    });

    return list;
}

window.SymptomChecklist = SymptomChecklist;
