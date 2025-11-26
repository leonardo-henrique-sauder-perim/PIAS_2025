let todosFuncionarios = [];

// Carregar funcionários
async function carregarFuncionarios() {
    const loading = document.getElementById('loading');
    const noEmployees = document.getElementById('no-employees');

    loading.classList.remove('hidden');
    noEmployees.classList.add('hidden');

    try {
        const response = await fetch('/barbeiros');

        if (!response.ok) {
            throw new Error('Erro ao carregar funcionários');
        }

        const funcionarios = await response.json();
        todosFuncionarios = funcionarios;

        if (funcionarios.length === 0) {
            loading.classList.add('hidden');
            noEmployees.classList.remove('hidden');
            return;
        }

        atualizarEstatisticas(funcionarios);
        renderizarFuncionarios(funcionarios);
        loading.classList.add('hidden');

    } catch (error) {
        console.error('Erro:', error);
        loading.classList.add('hidden');
        alert('Erro ao carregar funcionários: ' + error.message);
    }
}

// Atualizar estatísticas
function atualizarEstatisticas(funcionarios) {
    const estatisticas = {
        'Barbeiro': { count: 0, totalSalario: 0 },
        'Cabeleireiro': { count: 0, totalSalario: 0 },
        'Recepcionista': { count: 0, totalSalario: 0 },
        'Gerente': { count: 0, totalSalario: 0 },
        'Outro': { count: 0, totalSalario: 0 }
    };

    funcionarios.forEach(funcionario => {
        const cargo = funcionario.cargo || 'Outro';
        if (estatisticas[cargo]) {
            estatisticas[cargo].count++;
            estatisticas[cargo].totalSalario += parseFloat(funcionario.salario || 0);
        }
    });

    // Atualizar cards de estatísticas
    for (const [cargo, dados] of Object.entries(estatisticas)) {
        const elementoCount = document.getElementById(`total-${cargo.toLowerCase()}s`);
        const elementoMedia = document.getElementById(`media-${cargo.toLowerCase()}s`);

        if (elementoCount) {
            elementoCount.textContent = dados.count;
        }

        if (elementoMedia) {
            const media = dados.count > 0 ? (dados.totalSalario / dados.count).toFixed(2) : 0;
            elementoMedia.textContent = `Média: R$ ${media}`;
        }
    }
}

// Renderizar funcionários - FUNÇÃO CORRIGIDA
function renderizarFuncionarios(funcionarios) {
    // Limpar grids
    const grids = ['barbeiros', 'cabeleireiros', 'recepcionistas', 'gerentes', 'outros'];
    grids.forEach(grid => {
        const elemento = document.getElementById(`grid-${grid}`);
        if (elemento) elemento.innerHTML = '';
    });

    // Contadores por seção
    const contadores = {
        'Barbeiro': 0,
        'Cabeleireiro': 0,
        'Recepcionista': 0,
        'Gerente': 0,
        'Outro': 0
    };

    // Renderizar cada funcionário
    funcionarios.forEach(funcionario => {
        const cargo = funcionario.cargo || 'Outro';
        contadores[cargo]++;
        criarCardFuncionario(funcionario);
    });

    // Atualizar contadores e mostrar/ocultar seções
    for (const [cargo, count] of Object.entries(contadores)) {
        const section = document.getElementById(`section-${cargo.toLowerCase()}s`);
        const countElement = document.getElementById(`count-${cargo.toLowerCase()}s`);

        if (section && countElement) {
            countElement.textContent = count;
            if (count > 0) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        }
    }

    // Verificar se há funcionários para mostrar mensagem "nenhum funcionário"
    const totalFuncionarios = funcionarios.length;
    const noEmployees = document.getElementById('no-employees');

    if (totalFuncionarios === 0) {
        noEmployees.classList.remove('hidden');
    } else {
        noEmployees.classList.add('hidden');
    }
}

// Criar card de funcionário - FUNÇÃO CORRIGIDA
function criarCardFuncionario(funcionario) {
    const cargo = funcionario.cargo || 'Outro';
    const gridId = `grid-${cargo.toLowerCase()}s`;
    const grid = document.getElementById(gridId);

    if (!grid) {
        console.warn(`Grid não encontrado: ${gridId}`);
        return;
    }

    const card = document.createElement('div');
    card.className = 'employee-card';

    // Usar closure para garantir que o funcionário correto seja passado
    card.onclick = () => abrirModal(funcionario);

    const salario = parseFloat(funcionario.salario || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    card.innerHTML = `
        <div class="card-header">
            <div class="employee-avatar ${cargo.toLowerCase()}">
                <i class="fas ${getCargoIcon(cargo)}"></i>
            </div>
            <div class="employee-info">
                <h3>${funcionario.nome || 'Nome não informado'}</h3>
                <span class="employee-cargo ${cargo.toLowerCase()}">${cargo}</span>
            </div>
        </div>
        <div class="card-body">
            <div class="employee-detail">
                <i class="fas fa-id-card"></i>
                <span>${funcionario.cpf || 'CPF não informado'}</span>
            </div>
            <div class="employee-detail">
                <i class="fas fa-money-bill-wave"></i>
                <span>${salario}</span>
            </div>
            ${funcionario.especialidade ? `
            <div class="employee-detail">
                <i class="fas fa-star"></i>
                <span>${funcionario.especialidade}</span>
            </div>
            ` : ''}
        </div>
        <div class="card-footer">
            <button class="btn-view" onclick="event.stopPropagation(); abrirModal(${JSON.stringify(funcionario).replace(/"/g, '&quot;')})">
                <i class="fas fa-eye"></i> Ver Detalhes
            </button>
        </div>
    `;

    grid.appendChild(card);
}

// Obter ícone do cargo
function getCargoIcon(cargo) {
    const icons = {
        'Barbeiro': 'fa-cut',
        'Cabeleireiro': 'fa-female',
        'Recepcionista': 'fa-headset',
        'Gerente': 'fa-user-tie',
        'Outro': 'fa-user'
    };
    return icons[cargo] || 'fa-user';
}

// Abrir modal de detalhes - FUNÇÃO CORRIGIDA
function abrirModal(funcionario) {
    // Se for chamada via string JSON (do onclick)
    if (typeof funcionario === 'string') {
        try {
            funcionario = JSON.parse(funcionario.replace(/&quot;/g, '"'));
        } catch (e) {
            console.error('Erro ao parsear funcionário:', e);
            return;
        }
    }

    const modal = document.getElementById('employee-modal');
    const salario = parseFloat(funcionario.salario || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // Preencher dados do modal
    document.getElementById('modal-title').textContent = `Detalhes - ${funcionario.nome}`;
    document.getElementById('modal-nome').textContent = funcionario.nome || 'Nome não informado';
    document.getElementById('modal-cargo').textContent = funcionario.cargo || 'Outro';
    document.getElementById('modal-cargo').className = `employee-cargo ${(funcionario.cargo || 'Outro').toLowerCase()}`;
    document.getElementById('modal-cpf').textContent = funcionario.cpf || 'CPF não informado';
    document.getElementById('modal-email').textContent = funcionario.email || 'E-mail não informado';
    document.getElementById('modal-telefone').textContent = funcionario.telefone || 'Telefone não informado';
    document.getElementById('modal-salario').textContent = salario;
    document.getElementById('modal-endereco').textContent = funcionario.endereco || 'Endereço não informado';
    document.getElementById('modal-especialidade').textContent = funcionario.especialidade || 'Nenhuma especialidade informada';
    document.getElementById('modal-id').textContent = funcionario.id || 'N/A';

    // Definir ícone do avatar
    const modalAvatar = document.getElementById('modal-avatar');
    modalAvatar.className = `fas ${getCargoIcon(funcionario.cargo)}`;

    // Armazenar CPF para edição
    modal.setAttribute('data-cpf', funcionario.cpf);

    modal.classList.remove('hidden');
}

// Fechar modal
function fecharModal() {
    const modal = document.getElementById('employee-modal');
    modal.classList.add('hidden');
}

// Editar funcionário
function editarFuncionario() {
    const modal = document.getElementById('employee-modal');
    const cpf = modal.getAttribute('data-cpf');

    if (cpf) {
        // Redirecionar para página de edição com o CPF como parâmetro
        window.location.href = `cadastro-barbeiro.html?cpf=${cpf}&edit=true`;
    }
}

// Filtrar funcionários
function filtrarFuncionarios() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cargoFiltro = document.getElementById('filter-cargo').value;

    const funcionariosFiltrados = todosFuncionarios.filter(funcionario => {
        const nomeMatch = funcionario.nome?.toLowerCase().includes(searchTerm);
        const cargoMatch = !cargoFiltro || funcionario.cargo === cargoFiltro;

        return nomeMatch && cargoMatch;
    });

    renderizarFuncionarios(funcionariosFiltrados);
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    carregarFuncionarios();

    // Configurar event listeners para filtros
    document.getElementById('search-input').addEventListener('input', filtrarFuncionarios);
    document.getElementById('filter-cargo').addEventListener('change', filtrarFuncionarios);

    // Fechar modal ao clicar fora
    document.getElementById('employee-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModal();
        }
    });
});