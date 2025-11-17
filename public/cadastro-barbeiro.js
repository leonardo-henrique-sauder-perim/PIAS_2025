    async function cadastrarBarbeiro(event) {
        event.preventDefault();

        // Mostrar loading no botão
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        button.disabled = true;

        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmar-senha").value;

        // Validação da senha
        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem!");
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        if (senha.length < 4) {
            alert("A senha deve ter pelo menos 4 caracteres!");
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        const barbeiro = {
            nome: document.getElementById("nome").value,
            telefone: document.getElementById("telefone").value,
            email: document.getElementById("email").value,
            cpf: document.getElementById("cpf").value,
            cargo: document.getElementById("cargo").value,
            especialidade: document.getElementById("especialidade").value,
            endereco: document.getElementById("endereco").value,
            senha: senha
        };

        // Validação básica
        if (!barbeiro.nome || !barbeiro.cpf) {
            alert("Nome e CPF são obrigatórios!");
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        if (barbeiro.cpf.length !== 11) {
            alert("CPF deve conter 11 números!");
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        try {
            const response = await fetch('/barbeiros', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(barbeiro)
            });

            if (response.ok) {
                try {
                    const result = await response.json();
                    alert("Funcionário cadastrado com sucesso! ID: " + (result.id || ''));
                } catch (jsonError) {
                    const textResult = await response.text();
                    alert("Funcionário cadastrado com sucesso!");
                }
                document.getElementById("barbeiro-form").reset();
            } else {
                const errorText = await response.text();
                alert(`Erro: ${errorText}`);
            }
        } catch (err) {
            console.error("Erro na solicitação:", err);
            alert("Erro de conexão ao cadastrar funcionário. Verifique se o servidor está rodando.");
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // Função para listar todos os funcionários ou buscar funcionários por CPF
    async function listarBarbeiros() {
        const cpf = document.getElementById('cpf').value.trim();  // Pega o valor do CPF digitado no input

        let url = '/barbeiros';  // URL padrão para todos os funcionários

        if (cpf) {
            // Se CPF foi digitado, adiciona o parâmetro de consulta
            url += `?cpf=${cpf}`;
        }

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Erro ao buscar funcionários');
            }

            const barbeiros = await response.json();

            const tabela = document.getElementById('tabela-barbeiros');
            tabela.innerHTML = ''; // Limpa a tabela antes de preencher

            if (barbeiros.length === 0) {
                // Caso não encontre funcionários, exibe uma mensagem
                tabela.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>';
            } else {
                barbeiros.forEach(barbeiro => {
                    const linha = document.createElement('tr');
                    linha.innerHTML = `
                        <td>${barbeiro.id}</td>
                        <td>${barbeiro.nome || '-'}</td>
                        <td>${barbeiro.cpf}</td>
                        <td>${barbeiro.email || '-'}</td>
                        <td>${barbeiro.telefone || '-'}</td>
                        <td>${barbeiro.cargo || '-'}</td>
                        <td>${barbeiro.especialidade || '-'}</td>
                        <td>${barbeiro.endereco || '-'}</td>
                    `;
                    tabela.appendChild(linha);
                });
            }
        } catch (error) {
            console.error('Erro ao listar funcionários:', error);
            const tabela = document.getElementById('tabela-barbeiros');
            tabela.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">Erro ao carregar funcionários.</td></tr>';
        }
    }

    // Função para atualizar as informações do funcionário
    async function atualizarBarbeiro() {
        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const cargo = document.getElementById('cargo').value;
        const especialidade = document.getElementById('especialidade').value;
        const endereco = document.getElementById('endereco').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        // Validação
        if (!nome || !cpf) {
            alert("Nome e CPF são obrigatórios para atualização!");
            return;
        }

        if (cpf.length !== 11) {
            alert("CPF deve conter 11 números!");
            return;
        }

        // Validação da senha se for preenchida
        if (senha && senha !== confirmarSenha) {
            alert("As senhas não coincidem!");
            return;
        }

        const barbeiroAtualizado = {
            nome,
            email,
            telefone,
            cargo,
            especialidade,
            endereco,
            senha: senha || undefined // Só envia a senha se foi preenchida
        };

        try {
            const response = await fetch(`/barbeiros/cpf/${cpf}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(barbeiroAtualizado)
            });

            if (response.ok) {
                alert('Funcionário atualizado com sucesso!');
                listarBarbeiros(); // Atualiza a lista
            } else {
                const errorMessage = await response.text();
                alert('Erro ao atualizar funcionário: ' + errorMessage);
            }
        } catch (error) {
            console.error('Erro ao atualizar funcionário:', error);
            alert('Erro de conexão ao atualizar funcionário.');
        }
    }

    // Função para limpar o formulário
    async function limpaBarbeiro() {
        document.getElementById('nome').value = '';
        document.getElementById('cpf').value = '';
        document.getElementById('email').value = '';
        document.getElementById('telefone').value = '';
        document.getElementById('cargo').value = '';
        document.getElementById('especialidade').value = '';
        document.getElementById('endereco').value = '';
        document.getElementById('senha').value = '';
        document.getElementById('confirmar-senha').value = '';
    }

    // Validação do CPF (apenas números)
    document.addEventListener('DOMContentLoaded', function() {
        const cpfInput = document.getElementById('cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/\D/g, ''); // Remove não-números
            });
        }

        // Validação do telefone (apenas números e caracteres especiais básicos)
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^\d()+-]/g, ''); // Permite apenas números, (), + e -
            });
        }
    });

    // Função para testar conexão com o servidor
    async function testarConexao() {
        try {
            const response = await fetch('/barbeiros');
            if (!response.ok) {
                console.warn('Servidor respondendo com status:', response.status);
            } else {
                console.log('Conexão com servidor OK');
            }
        } catch (error) {
            console.error('Não foi possível conectar ao servidor:', error);
            alert('⚠️ Não foi possível conectar ao servidor. Verifique se o servidor está rodando.');
        }
    }

    // Testa a conexão quando a página carrega
    document.addEventListener('DOMContentLoaded', function() {
        testarConexao();

        // Adiciona evento de submit ao formulário
        const form = document.getElementById('barbeiro-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                cadastrarBarbeiro(e);
            });
        }
    });