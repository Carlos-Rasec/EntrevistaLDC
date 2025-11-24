// Chave usada para armazenar e recuperar dados no localStorage
const STORAGE_KEY = 'agendaEntrevistas';

document.addEventListener('DOMContentLoaded', () => {
    loadAppointments(); // Carrega os dados ao abrir a página
    
    document.getElementById('appointment-form').addEventListener('submit', addAppointment);
    document.getElementById('appointment-list').addEventListener('click', handleListActions);
    document.getElementById('clear-completed-btn').addEventListener('click', clearCompleted);
});

// --- FUNÇÕES DE ARMAZENAMENTO ---

function getAppointments() {
    // Tenta recuperar os dados, se não houver, retorna um array vazio.
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveAppointments(appointments) {
    // Converte o array para string e salva no armazenamento local.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    toggleClearButton();
}

function toggleClearButton() {
    const appointments = getAppointments();
    const hasCompleted = appointments.some(item => item.completed);
    document.getElementById('clear-completed-btn').style.display = hasCompleted ? 'block' : 'none';
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function loadAppointments() {
    const appointments = getAppointments();
    const listElement = document.getElementById('appointment-list');
    listElement.innerHTML = ''; // Limpa a lista antes de renderizar

    appointments.forEach(appointment => {
        const listItem = createListItem(appointment);
        listElement.appendChild(listItem);
    });
    toggleClearButton();
}

function createListItem(appointment) {
    const li = document.createElement('li');
    li.dataset.id = appointment.id;
    li.className = appointment.completed ? 'completed' : '';

    li.innerHTML = `
        <span class="info">
            <strong>${appointment.nome}</strong> (${appointment.congregacao}) - 
            Contato: ${appointment.contato} -  ${appointment.data} às ${appointment.horario}
        </span>
        <div class="actions">
            <button class="complete-btn" data-action="complete" title="Marcar como Concluído">✓</button>
            <button class="delete-btn" data-action="delete" title="Excluir">🗑️</button>
        </div>
    `;
    return li;
}

// --- FUNÇÕES DE AÇÃO ---

function addAppointment(e) {
    e.preventDefault();

    const nome = document.getElementById('nome-entrevistado').value;
    const congregacao = document.getElementById('congregacao').value;
    const contato = document.getElementById('contato').value; // 👈 Adicionada a captura do campo contato
    const data = document.getElementById('data-entrevista').value;
    const horario = document.getElementById('horario-entrevista').value;

    const newAppointment = {
        id: Date.now().toString(), // ID único baseado no timestamp
        nome,
        congregacao,
        contato, // 👈 Adicionado o campo contato ao objeto
        data,
        horario,
        completed: false
    };

    const appointments = getAppointments();
    appointments.push(newAppointment);
    saveAppointments(appointments);

    // Limpar o formulário
    e.target.reset(); 
    loadAppointments();
}

function handleListActions(e) {
    const target = e.target;
    const action = target.dataset.action;
    const listItem = target.closest('li');

    if (!listItem) return;

    const id = listItem.dataset.id;

    if (action === 'delete') {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            deleteAppointment(id);
        }
    } else if (action === 'complete') {
        markAsCompleted(id, listItem);
    }
}

function deleteAppointment(id) {
    let appointments = getAppointments();
    appointments = appointments.filter(appointment => appointment.id !== id);
    saveAppointments(appointments);
    loadAppointments();
}

function markAsCompleted(id, listItem) {
    let appointments = getAppointments();
    const index = appointments.findIndex(appointment => appointment.id === id);

    if (index !== -1) {
        // 1. Alterna o status de conclusão
        appointments[index].completed = !appointments[index].completed;

        // 2. Abre o ALERT de confirmação se for marcar como concluído
        if (appointments[index].completed) {
            const confirmed = confirm("Entrevista concluída. As informações JÁ FORAM COLOCADAS no Hub?");
            // Se o usuário clicar em "Cancelar" no alert, desfaz a marcação de concluída
            if (!confirmed) {
                appointments[index].completed = false;
            }
        }
        
        saveAppointments(appointments);
        loadAppointments(); // Recarrega para aplicar a classe 'completed'
    }
}

function clearCompleted() {
    let appointments = getAppointments();
    // Filtra para manter apenas os que NÃO estão completos
    appointments = appointments.filter(item => !item.completed);
    saveAppointments(appointments);
    loadAppointments();
}