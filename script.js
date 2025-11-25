// Chave usada para armazenar e recuperar dados no localStorage
// ---- Sincroniza 'agendaEntrevistas' com a chave 'entrevistas' usada pelo calendário
// Sincroniza 'agendaEntrevistas' com a chave 'entrevistas' usada pelo calendário
function mirrorAgendaToEntrevistas() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const appointments = raw ? JSON.parse(raw) : [];

        const entrevistas = appointments.map(a => {
            // Garante que exista data e horário no formato esperado pelo calendário
            const dataPart = a.data || ''; // espera 'YYYY-MM-DD'
            const horaPart = a.horario || '';
            return {
                nome: a.nome || '',
                congregacao: a.congregacao || '',
                contato: a.contato || '',
                // formato esperado: 'AAAA-MM-DD às HH:MM' (getEntrevistas faz split por ' ')
                data: `${dataPart}${horaPart ? ' às ' + horaPart : ''}`,
                horario: horaPart
            };
        });

        localStorage.setItem('entrevistas', JSON.stringify(entrevistas));
        // Atualiza o calendário se a função existir
        if (typeof renderizarCalendario === 'function') {
            renderizarCalendario(mesCorrente, anoCorrente);
        }
    } catch (err) {
        console.error('Erro ao sincronizar agenda para entrevistas:', err);
    }
}

// --- Navegação de meses do calendário ---
// Funções para avançar/retroceder o mês e voltar ao mês atual.
function prevMonth() {
    mesCorrente--;
    if (mesCorrente < 0) {
        mesCorrente = 11;
        anoCorrente--;
    }
    renderizarCalendario(mesCorrente, anoCorrente);
}

function nextMonth() {
    mesCorrente++;
    if (mesCorrente > 11) {
        mesCorrente = 0;
        anoCorrente++;
    }
    renderizarCalendario(mesCorrente, anoCorrente);
}

function goToCurrentMonth() {
    const now = new Date();
    mesCorrente = now.getMonth();
    anoCorrente = now.getFullYear();
    renderizarCalendario(mesCorrente, anoCorrente);
}

// Cria/associa controles de navegação ao calendário.
// Procura por elementos com ids 'prev-month-btn', 'next-month-btn', 'today-month-btn'.
// Se não existirem, cria um pequeno controle e insere antes do elemento 'mes-ano-atual'.
function setupCalendarNavigation() {
    const mesAnoEl = document.getElementById('mes-ano-atual');
    if (!mesAnoEl) return;

    // Se já houver um container, usa; senão cria um
    let container = document.getElementById('calendar-controls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'calendar-controls';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.marginBottom = '8px';
        mesAnoEl.parentNode.insertBefore(container, mesAnoEl);
    }

    // Helper para criar botão apenas se não existir
    function ensureButton(id, text, title, onClick) {
        let btn = document.getElementById(id);
        if (!btn) {
            btn = document.createElement('button');
            btn.id = id;
            btn.type = 'button';
            btn.textContent = text;
            btn.title = title;
            btn.style.padding = '4px 8px';
            btn.style.cursor = 'pointer';
            container.appendChild(btn);
        }
        btn.addEventListener('click', onClick);
    }

    ensureButton('prev-month-btn', '<', 'Mês anterior', prevMonth);
    ensureButton('today-month-btn', 'Hoje', 'Ir para o mês atual', goToCurrentMonth);
    ensureButton('next-month-btn', '>', 'Próximo mês', nextMonth);

    // Suporte a setas esquerda/direita para navegar quando o foco estiver no calendário
    mesAnoEl.tabIndex = 0; // permitir foco
    mesAnoEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevMonth();
        if (e.key === 'ArrowRight') nextMonth();
        if (e.key === 'Home') goToCurrentMonth();
    });
}

// Ativa os controles quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setupCalendarNavigation();
});

// Injeta estilo para indicar um círculo azul nos dias com compromisso
(function injectCalendarStyles() {
    const css = `
        /* marcação visual: pequeno círculo azul dentro do dia */
        .dia-com-compromisso { position: relative; }
        .dia-com-compromisso::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #007bff;
            bottom: 6px;
            right: 6px;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.12);
        }
        .dia-com-compromisso:hover { cursor: pointer; filter: brightness(0.95); }
    `;
    const style = document.createElement('style');
    style.setAttribute('data-generated', 'calendar-mark');
    style.textContent = css;
    document.head.appendChild(style);
})();

// Garante que sempre que o usuário adicionar/excluir/marcar entrevistas a sincronização aconteça.
// Adiciona listeners que chamam a função imediatamente após as ações do formulário/lista.
document.addEventListener('DOMContentLoaded', () => {
    // Sincroniza ao carregar
    mirrorAgendaToEntrevistas();

    // Hook para quando o formulário principal for submetido
    const form = document.getElementById('appointment-form');
    if (form) {
        form.addEventListener('submit', () => {
            // setTimeout para rodar depois que o handler original processar e salvar
            setTimeout(mirrorAgendaToEntrevistas, 0);
        });
    }

    // Quando a lista de itens for clicada (delete/complete) actualiza calendário depois da ação
    const list = document.getElementById('appointment-list');
    if (list) {
        list.addEventListener('click', () => {
            setTimeout(mirrorAgendaToEntrevistas, 0);
        });
    }

    // Clear completed também deve atualizar o calendário
    const clearBtn = document.getElementById('clear-completed-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            setTimeout(mirrorAgendaToEntrevistas, 0);
        });
    }
});
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

function adicionarEntrevista() {
    // ... Seu código de coleta de dados do formulário aqui ...

    const novaEntrevista = {
        // ... dados da entrevista ...
        nome: document.getElementById('nome').value, // Exemplo
        data: '2025-11-25 às 14:00', // Exemplo do formato esperado
        // ...
    };

    // 1. Pega os dados atuais, adiciona o novo e salva no localStorage
    const entrevistas = JSON.parse(localStorage.getItem('entrevistas')) || [];
    entrevistas.push(novaEntrevista);
    localStorage.setItem('entrevistas', JSON.stringify(entrevistas));

    // 2. Renderiza a lista de entrevistas (o código que exibe a lista abaixo do formulário)
    renderizarListaEntrevistas(); // Sua função existente para a lista

    // 🔑 O AJUSTE PRINCIPAL ESTÁ AQUI:
    // 3. ATUALIZA O CALENDÁRIO para que o círculo azul apareça
    renderizarCalendario(mesCorrente, anoCorrente); 
    
    // ... Seu código para limpar o formulário ...
}
// Certifique-se de que a função 'adicionarEntrevista' está ligada ao clique do botão!


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


// A função que lê suas entrevistas (Adapte para sua lógica de dados)
function getEntrevistas() {
    // Exemplo: '2025-11-25'
    const entrevistas = JSON.parse(localStorage.getItem('entrevistas')) || []; 
    
    // Simplificando o filtro e o retorno dos dados
    // Retorna um objeto onde a chave é a data (AAAA-MM-DD) e o valor é um array de entrevistas
    const eventosPorData = {};
    
    entrevistas.forEach(entrevista => {
        // A data salva no seu objeto de entrevista DEVE ser formatada como 'AAAA-MM-DD'
        const dataCompromisso = entrevista.data.split(' ')[0]; // Ex: "2025-11-25 às 11:19" -> "2025-11-25"
        
        if (!eventosPorData[dataCompromisso]) {
            eventosPorData[dataCompromisso] = [];
        }
        eventosPorData[dataCompromisso].push(entrevista);
    });
    
    return eventosPorData;
}

const dataAtual = new Date();
let mesCorrente = dataAtual.getMonth();
let anoCorrente = dataAtual.getFullYear();

function renderizarCalendario(mes, ano) {
    const tbody = document.getElementById('dias-calendario');
    const mesAnoElement = document.getElementById('mes-ano-atual');
    
    tbody.innerHTML = ''; // Limpa o calendário anterior
    
    const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    mesAnoElement.textContent = `${nomeMeses[mes]} ${ano}`;
    
    const primeiroDia = new Date(ano, mes, 1).getDay(); // Dia da semana (0=Dom, 6=Sáb)
    const totalDias = new Date(ano, mes + 1, 0).getDate(); // Último dia do mês

    let dia = 1;
    let linha = document.createElement('tr');
    
    const eventos = getEntrevistas(); // Busca todos os eventos

    // 1. Células vazias para o início da semana
    for (let i = 0; i < primeiroDia; i++) {
        linha.appendChild(document.createElement('td'));
    }

    // 2. Renderiza os dias
    while (dia <= totalDias) {
        if (linha.children.length === 7) {
            tbody.appendChild(linha);
            linha = document.createElement('tr');
        }
        
        const celula = document.createElement('td');
        celula.textContent = dia;
        
        // Formata a data atual para comparação (Ex: 2025-11-25)
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        // Verifica se há compromisso neste dia
        if (eventos[dataFormatada]) {
            celula.classList.add('dia-com-compromisso');
            
            // Adiciona o evento de clique para abrir o modal
            celula.addEventListener('click', () => {
                abrirModal(dataFormatada, eventos[dataFormatada]);
            });
        }
        
        linha.appendChild(celula);
        dia++;
    }

    // 3. Células vazias para o final da semana
    while (linha.children.length < 7) {
        linha.appendChild(document.createElement('td'));
    }

    tbody.appendChild(linha);
}

// Inicializa o calendário ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario(mesCorrente, anoCorrente);
});

// --- Funções do Modal ---

function abrirModal(data, listaEntrevistas) {
    const modal = document.getElementById('modal-eventos');
    const titulo = document.getElementById('modal-titulo-data');
    const listaEventos = document.getElementById('lista-eventos');

    titulo.textContent = `Entrevistas em ${data.split('-').reverse().join('/')}`;
    listaEventos.innerHTML = ''; // Limpa a lista anterior

    // Adiciona cada entrevista à lista
    if (listaEntrevistas && listaEntrevistas.length > 0) {
        listaEntrevistas.forEach(entrevista => {
            const li = document.createElement('li');
            
            // Supondo que você tem o nome e o contato na sua entrevista
            li.innerHTML = `
                <strong>${entrevista.nome}</strong> (${entrevista.congregacao})<br>
                Contato: ${entrevista.contato} - ${entrevista.data.split(' ')[1]}
            `;
            listaEventos.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "Nenhuma entrevista agendada para este dia.";
        listaEventos.appendChild(li);
    }

    modal.style.display = 'block';
}

function fecharModal() {
    document.getElementById('modal-eventos').style.display = 'none';
}

// Fecha o modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('modal-eventos');
    if (event.target == modal) {
        fecharModal();
    }
}
// OBS: Você precisará chamar 'renderizarCalendario(mesCorrente, anoCorrente);' novamente
// sempre que uma nova entrevista for adicionada para atualizar as marcações de compromisso.

