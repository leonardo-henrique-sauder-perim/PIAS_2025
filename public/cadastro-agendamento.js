// Variável global para armazenar o ID do agendamento atual
let agendamentoAtualId = null;

// Função para buscar barbeiros - CORRIGIDA
async function buscarBarbeiro() {
    try {
        console.log("=== INICIANDO BUSCA DE BARBEIROS ===");
        const response = await fetch("/buscar-barbeiros");

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const barbeiros = await response.json();
        console.log("Barbeiros recebidos do servidor:", barbeiros);

        const select = document.getElementById("barbeiroSelecionado");
        console.log("Select de barbeiros encontrado:", select);

        select.innerHTML = '<option value="">Selecione o Barbeiro</option>';

        if (barbeiros.length === 0) {
            console.log("Nenhum barbeiro cadastrado no banco de dados");
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhum barbeiro disponível";
            select.appendChild(option);
        } else {
            barbeiros.forEach((barbeiro, index) => {
                console.log(`Processando barbeiro ${index + 1}:`, barbeiro);
                const option = document.createElement("option");
                option.value = barbeiro.id;
                option.textContent = barbeiro.nome;
                select.appendChild(option);
            });
        }

        console.log("=== BUSCA DE BARBEIROS FINALIZADA ===");
    } catch (error) {
        console.error("Erro ao carregar os barbeiros:", error);
        alert("Erro ao carregar barbeiros. Verifique o console.");
    }
}

// Função para buscar serviços - CORRIGIDA
async function buscarServico() {
    try {
        console.log("=== INICIANDO BUSCA DE SERVIÇOS ===");
        const response = await fetch("/buscar-servicos");

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const servicos = await response.json();
        console.log("Serviços recebidos do servidor:", servicos);

        const select = document.getElementById("servicoSelecionado");
        console.log("Select de serviços encontrado:", select);

        select.innerHTML = '<option value="">Selecione o Serviço</option>';

        if (servicos.length === 0) {
            console.log("Nenhum serviço cadastrado no banco de dados");
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhum serviço disponível";
            select.appendChild(option);
        } else {
            servicos.forEach((servico, index) => {
                console.log(`Processando serviço ${index + 1}:`, servico);
                const option = document.createElement("option");
                option.value = servico.id;
                option.textContent = `${servico.nome} - R$ ${parseFloat(servico.preco).toFixed(2)}`;
                select.appendChild(option);
            });
        }

        console.log("=== BUSCA DE SERVIÇOS FINALIZADA ===");
    } catch (error) {
        console.error("Erro ao carregar os serviços:", error);
        alert("Erro ao carregar serviços. Verifique o console.");
    }
}

// Função para buscar horários disponíveis
async function buscaHorariosDisponiveis() {
    const data = document.getElementById("data").value;
    const id = document.getElementById("servicoSelecionado").value;

    if (!data || !id) {
        document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';
        return;
    }

    try {
        const response = await fetch(`/horarios-disponiveis?data=${data}&id=${id}`);
        if (!response.ok) {
            throw new Error("Erro ao buscar horários disponíveis");
        }
        const horariosDisponiveis = await response.json();

        const selectHorario = document.getElementById("horaSelecionada");
        selectHorario.innerHTML = '<option value="">Selecione o Horário</option>';

        if (horariosDisponiveis.length > 0) {
            horariosDisponiveis.forEach((horario) => {
                const option = document.createElement("option");
                option.value = horario;
                option.textContent = horario;
                selectHorario.appendChild(option);
            });
        } else {
            alert("Não há horários disponíveis para esta data e serviço.");
        }
    } catch (error) {
        console.error("Erro ao carregar horários disponíveis:", error);
    }
}

// Função para cadastrar agendamento
async function cadastrarAgendamento(event) {
    event.preventDefault();

    const data = document.getElementById("data").value;
    const horario = document.getElementById("horaSelecionada").value;
    const cpf_cliente = document.getElementById("cpf_cli").value;
    const id_barbeiro = document.getElementById("barbeiroSelecionado").value;
    const id_servico = document.getElementById("servicoSelecionado").value;

    // Validação do CPF (11 dígitos)
    const cpfNumeros = cpf_cliente.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !/^\d+$/.test(cpfNumeros)) {
        alert("CPF deve conter exatamente 11 números.");
        return;
    }

    if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        const resp = await fetch("/cadastrar-agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data,
                horario,
                cpf_cliente: cpfNumeros,
                id_barbeiro,
                id_servico,
            }),
        });

        const resultado = await resp.json();

        if (!resp.ok) {
            console.error("Falha no cadastro:", resultado);
            alert(`Erro ao cadastrar: ${resultado.message}`);
            return;
        }

        alert("Agendamento cadastrado com sucesso!");
        document.getElementById("filters").reset();
        document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';

        // Atualiza a lista de agendamentos após cadastro
        listarAgendamentos();
    } catch (e) {
        console.error("Erro ao cadastrar agendamento:", e);
        alert("Erro de rede ao cadastrar.");
    }
}

// Função para listar todos os agendamentos ou buscar por data
async function listarAgendamentos() {
    const data = document.getElementById("data").value.trim();

    let url = "/agendamentos";
    if (data) {
        url += `?date=${data}`;
    }

    try {
        const response = await fetch(url);
        const agendamentos = await response.json();

        const tabela = document.getElementById("tabela-agendamentos");
        tabela.innerHTML = "";

        if (agendamentos.length === 0) {
            tabela.innerHTML = '<tr><td colspan="7">Nenhum agendamento encontrado.</td></tr>';
        } else {
            // Carrega a lista de IDs finalizados do localStorage
            const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
            // Carrega a lista de IDs com histórico de finalização
            const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

            agendamentos.forEach(agendamento => {
                const linha = document.createElement("tr");
                linha.id = `agendamento-${agendamento.id}`;

                // Verifica se este agendamento está na lista de finalizados
                const estaFinalizado = agendamentosFinalizados.includes(agendamento.id);
                // Verifica se tem histórico de finalização
                const temHistorico = agendamentosComHistorico.includes(agendamento.id);

                if (estaFinalizado) {
                    linha.style.display = 'none';
                }

                linha.innerHTML = `
                    <td>${agendamento.id}</td>
                    <td>${agendamento.data}</td>
                    <td>${agendamento.horario}</td>
                    <td>${agendamento.cliente_nome || agendamento.cpf_cliente}</td>
                    <td>${agendamento.barbeiro_nome || agendamento.id_barbeiro}</td>
                    <td>${agendamento.servico_nome || agendamento.id_servico}</td>
                    <td>
                        <button type="button" class="btn-finalizar" onclick="abrirModalPagamento(${agendamento.id})">
                            <i class="fas ${estaFinalizado ? 'fa-undo' : 'fa-check'}"></i> ${estaFinalizado ? 'Reabrir' : 'Finalizar'}
                        </button>
                        <button type="button" class="btn-excluir" onclick="excluirAgendamento(${agendamento.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </td>
                `;

                // Aplica a cor do botão baseado no estado e histórico
                const btnFinalizar = linha.querySelector('.btn-finalizar');
                if (estaFinalizado) {
                    // Se está finalizado - Amarelo
                    btnFinalizar.style.backgroundColor = '#ffc107';
                    btnFinalizar.style.color = '#000';
                } else if (temHistorico) {
                    // Se tem histórico mas está reaberto - Azul
                    btnFinalizar.style.backgroundColor = '#17a2b8';
                    btnFinalizar.style.color = '#fff';
                } else {
                    // Se nunca foi finalizado - Verde
                    btnFinalizar.style.backgroundColor = '#28a745';
                    btnFinalizar.style.color = '#fff';
                }

                tabela.appendChild(linha);
            });
        }
    } catch (error) {
        console.error("Erro ao listar agendamentos:", error);
    }
}

// Função para excluir agendamento
async function excluirAgendamento(id) {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
        return;
    }

    try {
        const resp = await fetch(`/excluir-agendamento/${id}`, {
            method: "DELETE",
        });

        const resultado = await resp.json();

        if (!resp.ok) {
            console.error("Falha na exclusão:", resultado);
            alert(`Erro ao excluir: ${resultado.message}`);
            return;
        }

        // Remove o ID de todas as listas
        const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
        const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');
        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');

        const novaListaFinalizados = agendamentosFinalizados.filter(agendamentoId => agendamentoId !== id);
        const novaListaHistorico = agendamentosComHistorico.filter(agendamentoId => agendamentoId !== id);
        const novaListaPagamentos = pagamentos.filter(pagamento => pagamento.id !== id);

        localStorage.setItem('agendamentosFinalizados', JSON.stringify(novaListaFinalizados));
        localStorage.setItem('agendamentosComHistorico', JSON.stringify(novaListaHistorico));
        localStorage.setItem('pagamentosAgendamentos', JSON.stringify(novaListaPagamentos));

        alert("Agendamento excluído com sucesso!");
        listarAgendamentos(); // Atualiza a lista após exclusão
    } catch (e) {
        console.error("Erro ao excluir agendamento:", e);
        alert("Erro de rede ao excluir.");
    }
}

// Função para abrir o modal de pagamento
function abrirModalPagamento(id) {
    agendamentoAtualId = id;

    // Buscar informações completas do agendamento para preencher o valor do serviço
    fetch(`/agendamentos`)
        .then(response => response.json())
        .then(agendamentos => {
            const agendamento = agendamentos.find(a => a.id === id);

            // Buscar o preço do serviço separadamente
            if (agendamento && agendamento.id_servico) {
                fetch(`/servicos`)
                    .then(response => response.json())
                    .then(servicos => {
                        const servico = servicos.find(s => s.id == agendamento.id_servico);
                        if (servico && servico.preco) {
                            document.getElementById('valorServico').value = parseFloat(servico.preco).toFixed(2);
                        } else {
                            document.getElementById('valorServico').value = '';
                        }

                        // Verificar se já existe pagamento para este agendamento
                        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');
                        const pagamentoExistente = pagamentos.find(p => p.id === id);

                        if (pagamentoExistente) {
                            // Preencher com os valores existentes
                            document.getElementById('desconto').value = pagamentoExistente.desconto || '0';
                            document.getElementById('formaPagamento').value = pagamentoExistente.formaPagamento || '';
                            document.getElementById('valorPago').value = pagamentoExistente.valorPago || '0';
                            document.getElementById('troco').value = pagamentoExistente.troco || '0';
                        } else {
                            // Resetar outros campos
                            document.getElementById('formaPagamento').value = '';
                            document.getElementById('desconto').value = '0';
                            document.getElementById('valorPago').value = '0';
                            document.getElementById('troco').value = '0';
                        }

                        calcularValorFinal();
                        toggleCampoDesconto(); // Atualizar visibilidade dos campos
                    })
                    .catch(error => {
                        console.error('Erro ao buscar serviço:', error);
                        document.getElementById('valorServico').value = '';
                    });
            } else {
                document.getElementById('valorServico').value = '';
            }

            // Mostrar modal
            document.getElementById('modalPagamento').style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao buscar agendamento:', error);
            // Se der erro, ainda assim abre o modal
            document.getElementById('modalPagamento').style.display = 'block';
        });
}

// Função para fechar o modal de pagamento
function fecharModalPagamento() {
    document.getElementById('modalPagamento').style.display = 'none';
    agendamentoAtualId = null;
}

// Função para mostrar/ocultar campos baseado na forma de pagamento
function toggleCampoDesconto() {
    const formaPagamento = document.getElementById('formaPagamento').value;
    const grupoDesconto = document.getElementById('grupoDesconto');
    const grupoValorPago = document.getElementById('grupoValorPago');
    const grupoTroco = document.getElementById('grupoTroco');

    // Sempre mostra desconto para todas as formas de pagamento
    grupoDesconto.style.display = 'block';

    // Mostra campos de valor pago e troco apenas para dinheiro
    if (formaPagamento === 'Dinheiro') {
        grupoValorPago.style.display = 'block';
        grupoTroco.style.display = 'block';
    } else {
        grupoValorPago.style.display = 'none';
        grupoTroco.style.display = 'none';
        document.getElementById('valorPago').value = '0';
        document.getElementById('troco').value = '0';
    }

    // Recalcula valores
    calcularValorFinal();
}

// Função para calcular o valor final com desconto
function calcularValorFinal() {
    const valorServico = parseFloat(document.getElementById('valorServico').value) || 0;
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;

    const valorFinal = Math.max(0, valorServico - desconto);
    document.getElementById('valorFinal').value = valorFinal.toFixed(2);

    // Se for dinheiro, recalcula o troco
    if (document.getElementById('formaPagamento').value === 'Dinheiro') {
        calcularTroco();
    }
}

// Função para calcular o troco
function calcularTroco() {
    const valorFinal = parseFloat(document.getElementById('valorFinal').value) || 0;
    const valorPago = parseFloat(document.getElementById('valorPago').value) || 0;

    const troco = Math.max(0, valorPago - valorFinal);
    document.getElementById('troco').value = troco.toFixed(2);
}

// Função para confirmar o pagamento e finalizar o agendamento
function confirmarPagamento() {
    const valorServico = parseFloat(document.getElementById('valorServico').value) || 0;
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;
    const valorFinal = parseFloat(document.getElementById('valorFinal').value) || 0;
    const formaPagamento = document.getElementById('formaPagamento').value;
    const valorPago = parseFloat(document.getElementById('valorPago').value) || 0;
    const troco = parseFloat(document.getElementById('troco').value) || 0;

    // Validações
    if (!valorServico || valorServico <= 0) {
        alert("Por favor, informe o valor do serviço.");
        return;
    }

    if (!formaPagamento) {
        alert("Por favor, selecione a forma de pagamento.");
        return;
    }

    if (formaPagamento === 'Dinheiro' && (!valorPago || valorPago < valorFinal)) {
        alert("O valor pago deve ser maior ou igual ao valor final quando pagamento em dinheiro.");
        return;
    }

    if (desconto > valorServico) {
        alert("O desconto não pode ser maior que o valor do serviço.");
        return;
    }

    // Confirmar finalização
    if (confirm(`Confirmar finalização do agendamento?\n\nValor do Serviço: R$ ${valorServico.toFixed(2)}\nDesconto: R$ ${desconto.toFixed(2)}\nValor Final: R$ ${valorFinal.toFixed(2)}\nForma de Pagamento: ${formaPagamento}${formaPagamento === 'Dinheiro' ? `\nValor Pago: R$ ${valorPago.toFixed(2)}\nTroco: R$ ${troco.toFixed(2)}` : ''}`)) {

        // Salvar informações do pagamento no localStorage
        const pagamentoInfo = {
            id: agendamentoAtualId,
            valorServico: valorServico,
            desconto: desconto,
            valorFinal: valorFinal,
            formaPagamento: formaPagamento,
            valorPago: valorPago,
            troco: troco,
            dataPagamento: new Date().toISOString()
        };

        // Salvar no localStorage
        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');
        const pagamentoExistenteIndex = pagamentos.findIndex(p => p.id === agendamentoAtualId);

        if (pagamentoExistenteIndex !== -1) {
            pagamentos[pagamentoExistenteIndex] = pagamentoInfo;
        } else {
            pagamentos.push(pagamentoInfo);
        }

        localStorage.setItem('pagamentosAgendamentos', JSON.stringify(pagamentos));

        // Finalizar o agendamento (adicionar às listas de finalizados)
        const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
        const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

        if (!agendamentosFinalizados.includes(agendamentoAtualId)) {
            agendamentosFinalizados.push(agendamentoAtualId);
            localStorage.setItem('agendamentosFinalizados', JSON.stringify(agendamentosFinalizados));
        }

        if (!agendamentosComHistorico.includes(agendamentoAtualId)) {
            agendamentosComHistorico.push(agendamentoAtualId);
            localStorage.setItem('agendamentosComHistorico', JSON.stringify(agendamentosComHistorico));
        }

        alert("Pagamento confirmado e agendamento finalizado com sucesso!");
        fecharModalPagamento();
        listarAgendamentos(); // Atualiza a lista
    }
}

// Função para reabrir um agendamento finalizado
function reabrirAgendamento(id) {
    const linha = document.getElementById(`agendamento-${id}`);
    const btnFinalizar = linha.querySelector('.btn-finalizar');

    // Carrega as listas
    const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
    const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

    if (linha.style.display === 'none') {
        // Reabrir agendamento - Remove da lista de finalizados
        linha.style.display = 'table-row';
        btnFinalizar.innerHTML = '<i class="fas fa-check"></i> Finalizar';

        // Muda para cor azul (tem histórico)
        btnFinalizar.style.backgroundColor = '#17a2b8';
        btnFinalizar.style.color = '#fff';

        const novaListaFinalizados = agendamentosFinalizados.filter(agendamentoId => agendamentoId !== id);
        localStorage.setItem('agendamentosFinalizados', JSON.stringify(novaListaFinalizados));

        alert("Agendamento reaberto com sucesso!");
        listarAgendamentos();
    }
}

// Função para reabrir todos os agendamentos finalizados
function reabrirTodosAgendamentos() {
    // Carrega a lista atual de finalizados
    const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
    const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

    // Adiciona todos os finalizados ao histórico
    agendamentosFinalizados.forEach(id => {
        if (!agendamentosComHistorico.includes(id)) {
            agendamentosComHistorico.push(id);
        }
    });

    // Salva o histórico atualizado
    localStorage.setItem('agendamentosComHistorico', JSON.stringify(agendamentosComHistorico));

    // Limpa a lista de finalizados
    localStorage.setItem('agendamentosFinalizados', JSON.stringify([]));

    // Recarrega a lista
    listarAgendamentos();
    alert("Todos os agendamentos foram reabertos!");
}

// Função para buscar clientes por CPF (com sugestões)
async function buscarClientes(cpfParcial) {
    if (cpfParcial.length < 3) {
        document.getElementById('cpfClientes').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/clientes?cpf=${cpfParcial}`);
        const clientes = await response.json();

        const datalist = document.getElementById('cpfClientes');
        datalist.innerHTML = '';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.cpf} - ${cliente.nome}`;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
}

// Função para preencher automaticamente os dados do cliente quando o CPF for selecionado
async function preencherDadosCliente(cpf) {
    if (!cpf) return;

    try {
        const response = await fetch(`/clientes?cpf=${cpf}`);
        const clientes = await response.json();

        if (clientes.length > 0) {
            const cliente = clientes[0];
            console.log('Cliente encontrado:', cliente.nome);
        }
    } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
    }
}

// Função para limpar todos os dados do localStorage (para desenvolvimento)
function limparLocalStorage() {
    if (confirm("Tem certeza que deseja limpar TODOS os dados do sistema? Esta ação não pode ser desfeita.")) {
        localStorage.removeItem('agendamentosFinalizados');
        localStorage.removeItem('agendamentosComHistorico');
        localStorage.removeItem('pagamentosAgendamentos');
        alert("Todos os dados foram limpos!");
        listarAgendamentos();
    }
}

// Função para formatar CPF (xxx.xxx.xxx-xx)
function formatarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    cpf = cpf.substring(0, 11);
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
}

// Função para validar e formatar CPF enquanto digita
function formatarCPFInput(input) {
    let cpf = input.value.replace(/\D/g, '');
    cpf = cpf.substring(0, 11);

    if (cpf.length > 3) {
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    }
    if (cpf.length > 6) {
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    }
    if (cpf.length > 9) {
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    input.value = cpf;
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("=== INICIALIZANDO PÁGINA DE AGENDAMENTOS ===");

    // Configurar limite de caracteres para CPF
    const cpfInput = document.getElementById('cpf_cli');
    if (cpfInput) {
        cpfInput.setAttribute('maxlength', '14'); // xxx.xxx.xxx-xx
        cpfInput.addEventListener('input', function() {
            formatarCPFInput(this);
        });

        cpfInput.addEventListener('change', function() {
            preencherDadosCliente(this.value.replace(/\D/g, ''));
        });
    }

    // Carregar barbeiros e serviços ao carregar a página
    console.log("Carregando barbeiros e serviços...");
    buscarBarbeiro();
    buscarServico();
    listarAgendamentos();

    // Adicionar eventos para os selects
    const servicoSelect = document.getElementById('servicoSelecionado');
    if (servicoSelect) {
        servicoSelect.addEventListener('change', function() {
            if (document.getElementById('data').value) {
                buscaHorariosDisponiveis();
            }
        });
    }

    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.addEventListener('change', function() {
            if (document.getElementById('servicoSelecionado').value) {
                buscaHorariosDisponiveis();
            }
        });
    }

    // Adicionar botão para debug
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        const debugBtn = document.createElement('button');
        debugBtn.type = 'button';
        debugBtn.textContent = 'Debug Tabelas';
        debugBtn.className = 'btn-excluir';
        debugBtn.style.marginTop = '10px';
        debugBtn.style.backgroundColor = '#6c757d';
        debugBtn.onclick = async function() {
            try {
                const response = await fetch('/debug-tabelas');
                const data = await response.json();
                console.log('DEBUG TABELAS:', data);
                alert(`Barbeiros: ${data.total_barbeiros}, Serviços: ${data.total_servicos}\nVerifique o console para detalhes.`);
            } catch (error) {
                console.error('Erro no debug:', error);
            }
        };
        mainContainer.appendChild(debugBtn);
    }

    console.log("=== PÁGINA DE AGENDAMENTOS INICIALIZADA ===");
});

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('modalPagamento');
    if (event.target === modal) {
        fecharModalPagamento();
    }
}

// Adicionar eventos de input para cálculos automáticos
document.addEventListener('DOMContentLoaded', function() {
    const valorServicoInput = document.getElementById('valorServico');
    const descontoInput = document.getElementById('desconto');
    const valorPagoInput = document.getElementById('valorPago');
    const formaPagamentoSelect = document.getElementById('formaPagamento');

    if (valorServicoInput) {
        valorServicoInput.addEventListener('input', calcularValorFinal);
    }
    if (descontoInput) {
        descontoInput.addEventListener('input', calcularValorFinal);
    }
    if (valorPagoInput) {
        valorPagoInput.addEventListener('input', calcularTroco);
    }
    if (formaPagamentoSelect) {
        formaPagamentoSelect.addEventListener('change', toggleCampoDesconto);
    }
});