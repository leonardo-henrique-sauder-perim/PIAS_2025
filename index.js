const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 5000;

// Serve os arquivos estáticos da pasta "public"
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// Configura o body-parser para ler JSON
app.use(bodyParser.json());

// Conexão com o banco de dados SQLite
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
    }
});

// Criação das tabelas
db.serialize(() => {
    // Tabela de barbeiros ATUALIZADA com campo salario
    db.run(`
        CREATE TABLE IF NOT EXISTS barbeiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            salario REAL DEFAULT 0,
            especialidade TEXT,
            endereco TEXT,
            senha TEXT,
            cargo TEXT NOT NULL CHECK (cargo IN ('Barbeiro', 'Cabeleireiro', 'Recepcionista', 'Gerente', 'Outro')) DEFAULT 'Barbeiro'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            endereco TEXT
        )
    `);

    // CORREÇÃO: Mantido como TEXT para evitar problemas de conversão
    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            preco TEXT NOT NULL,
            duracao TEXT,
            descricao TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            horario TIME NOT NULL,
            cpf_cliente VARCHAR(11) NOT NULL,
            id_barbeiro INTEGER NOT NULL,
            id_servico INTEGER NOT NULL,
            FOREIGN KEY (cpf_cliente) REFERENCES clientes (cpf),
            FOREIGN KEY (id_barbeiro) REFERENCES barbeiros (id),
            FOREIGN KEY (id_servico) REFERENCES servicos (id)
        )
    `);

    // Inserir usuário admin padrão na tabela de barbeiros
    db.get("SELECT COUNT(*) as count FROM barbeiros WHERE cargo = 'Gerente'", (err, row) => {
        if (err) {
            console.error("Erro ao verificar barbeiros:", err);
            return;
        }

        if (row.count === 0) {
            db.run(`
                INSERT INTO barbeiros (nome, cpf, email, telefone, cargo, senha, salario) 
                VALUES ('Administrador do Sistema', '12345678900', 'admin@sistema.com', '(00) 00000-0000', 'Gerente', 'admin123', 5000.00)
            `, function(err) {
                if (err) {
                    console.error("Erro ao inserir admin padrão:", err);
                } else {
                    console.log("Usuário admin padrão criado: CPF 12345678900, Senha: admin123, Salário: R$ 5000,00");
                }
            });
        }
    });

    // INSERIR DADOS DE EXEMPLO SE AS TABELAS ESTIVEREM VAZIAS
    // Verificar e inserir barbeiros de exemplo
    db.get("SELECT COUNT(*) as count FROM barbeiros WHERE cargo IN ('Barbeiro', 'Cabeleireiro')", (err, row) => {
        if (err) {
            console.error("Erro ao verificar barbeiros:", err);
            return;
        }

        if (row.count === 0) {
            console.log("Inserindo barbeiros de exemplo...");
            const barbeirosExemplo = [
                { nome: "João Silva", cpf: "11122233344", cargo: "Barbeiro", senha: "123456" },
                { nome: "Maria Santos", cpf: "22233344455", cargo: "Cabeleireiro", senha: "123456" },
                { nome: "Pedro Oliveira", cpf: "33344455566", cargo: "Barbeiro", senha: "123456" }
            ];

            barbeirosExemplo.forEach(barbeiro => {
                db.run(`INSERT INTO barbeiros (nome, cpf, cargo, senha) VALUES (?, ?, ?, ?)`,
                    [barbeiro.nome, barbeiro.cpf, barbeiro.cargo, barbeiro.senha],
                    function(err) {
                        if (err) {
                            console.error("Erro ao inserir barbeiro:", err);
                        } else {
                            console.log(`Barbeiro inserido: ${barbeiro.nome}`);
                        }
                    }
                );
            });
        }
    });

    // Verificar e inserir serviços de exemplo
    db.get("SELECT COUNT(*) as count FROM servicos", (err, row) => {
        if (err) {
            console.error("Erro ao verificar serviços:", err);
            return;
        }

        if (row.count === 0) {
            console.log("Inserindo serviços de exemplo...");
            const servicosExemplo = [
                { nome: "Corte de Cabelo", preco: "30.00", duracao: "30 minutos" },
                { nome: "Barba", preco: "20.00", duracao: "20 minutos" },
                { nome: "Corte e Barba", preco: "45.00", duracao: "50 minutos" },
                { nome: "Sobrancelha", preco: "15.00", duracao: "15 minutos" }
            ];

            servicosExemplo.forEach(servico => {
                db.run(`INSERT INTO servicos (nome, preco, duracao) VALUES (?, ?, ?)`,
                    [servico.nome, servico.preco, servico.duracao],
                    function(err) {
                        if (err) {
                            console.error("Erro ao inserir serviço:", err);
                        } else {
                            console.log(`Serviço inserido: ${servico.nome}`);
                        }
                    }
                );
            });
        }
    });

    console.log("Tabelas criadas e inicializadas com sucesso.");
});

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Login de barbeiro (nome e senha)
app.post("/login-barbeiro", (req, res) => {
    const { nome, senha } = req.body;

    if (!nome || !senha) {
        return res.status(400).json({ 
            success: false, 
            message: "Nome e senha são obrigatórios." 
        });
    }

    const query = `SELECT * FROM barbeiros WHERE nome LIKE ? AND senha = ?`;
    db.get(query, [`%${nome}%`, senha], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao buscar barbeiro:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Erro interno do servidor." 
            });
        }

        if (barbeiro) {
            return res.json({
                success: true,
                user: {
                    id: barbeiro.id,
                    nome: barbeiro.nome,
                    cpf: barbeiro.cpf,
                    cargo: barbeiro.cargo,
                    email: barbeiro.email,
                    telefone: barbeiro.telefone,
                    salario: barbeiro.salario,
                    especialidade: barbeiro.especialidade,
                    endereco: barbeiro.endereco
                }
            });
        }

        res.status(401).json({
            success: false,
            message: "Nome ou senha incorretos."
        });
    });
});

// ========== ROTAS DE BARBEIROS ==========

// Cadastrar barbeiro - CORRIGIDO
app.post("/barbeiros", (req, res) => {
    console.log("Recebendo dados para cadastrar barbeiro:", req.body);

    const { nome, cpf, email, telefone, salario, especialidade, endereco, cargo, senha } = req.body;

    if (!nome || !cpf) {
        console.log("Dados incompletos:", { nome, cpf });
        return res.status(400).json({ 
            success: false,
            message: "Nome e CPF são obrigatórios." 
        });
    }

    const query = `INSERT INTO barbeiros (nome, cpf, email, telefone, salario, especialidade, endereco, cargo, senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(
        query,
        [
            nome, 
            cpf, 
            email || null, 
            telefone || null, 
            salario || 0, 
            especialidade || null, 
            endereco || null, 
            cargo || 'Barbeiro', 
            senha || '123456' // senha padrão
        ],
        function (err) {
            if (err) {
                console.error("Erro ao cadastrar barbeiro:", err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({
                        success: false,
                        message: "CPF já cadastrado no sistema."
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: "Erro ao cadastrar barbeiro."
                });
            }
            console.log("Barbeiro cadastrado com ID:", this.lastID);
            res.status(201).json({
                success: true,
                id: this.lastID,
                message: "Barbeiro cadastrado com sucesso."
            });
        }
    );
});

// Atualizar barbeiro por CPF - CORRIGIDO
app.put("/barbeiros/cpf/:cpf", (req, res) => {
    const cpf = req.params.cpf;
    const { nome, email, telefone, salario, especialidade, endereco, cargo, senha } = req.body;

    console.log("Atualizando barbeiro CPF:", cpf, "Dados:", req.body);

    if (!nome) {
        return res.status(400).json({
            success: false,
            message: "Nome é obrigatório."
        });
    }

    let query = `UPDATE barbeiros SET nome = ?, email = ?, telefone = ?, salario = ?, especialidade = ?, endereco = ?, cargo = ?`;
    let params = [
        nome, 
        email || null, 
        telefone || null, 
        salario || 0, 
        especialidade || null, 
        endereco || null, 
        cargo || 'Barbeiro'
    ];

    // Se senha foi fornecida, adiciona ao update
    if (senha && senha.trim() !== '') {
        query += `, senha = ?`;
        params.push(senha);
    }

    query += ` WHERE cpf = ?`;
    params.push(cpf);

    db.run(query, params, function(err) {
        if (err) {
            console.error("Erro ao atualizar barbeiro:", err);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar barbeiro."
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Barbeiro não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Barbeiro atualizado com sucesso."
        });
    });
});

// Listar barbeiros
app.get("/barbeiros", (req, res) => {
    const cpf = req.query.cpf || "";

    if (cpf) {
        const query = `SELECT * FROM barbeiros WHERE cpf LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM barbeiros ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    }
});

// Buscar barbeiros para agendamentos - CORRIGIDA COM LOGS
app.get("/buscar-barbeiros", (req, res) => {
    console.log("=== BUSCANDO BARBEIROS PARA AGENDAMENTOS ===");
    const query = `SELECT id, nome, cargo FROM barbeiros WHERE cargo IN ('Barbeiro', 'Cabeleireiro') ORDER BY nome`;

    db.all(query, (err, rows) => {
        if (err) {
            console.error("❌ Erro ao buscar barbeiros:", err);
            return res.status(500).json({ message: "Erro ao buscar barbeiros." });
        }

        console.log(`✅ Barbeiros encontrados: ${rows.length}`);
        console.log("Barbeiros:", rows);
        res.json(rows);
    });
});

// ========== ROTAS DE SERVIÇOS ==========

// Listar serviços
app.get("/servicos", (req, res) => {
    const nome = req.query.nome || "";

    if (nome) {
        const query = `SELECT * FROM servicos WHERE nome LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${nome}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM servicos ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    }
});

// Atualizar serviço - CORRIGIDO
app.put("/servicos/nome/:nome", (req, res) => {
    const nomeOriginal = req.params.nome;
    const { nome, preco, duracao, descricao } = req.body;

    console.log("Atualizando serviço:", nomeOriginal, "Dados:", req.body);

    if (!nome || !preco) {
        return res.status(400).json({
            success: false,
            message: "Nome e preço são obrigatórios."
        });
    }

    const query = `UPDATE servicos SET nome = ?, preco = ?, duracao = ?, descricao = ? WHERE nome = ?`;
    db.run(query, [
        nome, 
        preco, 
        duracao || null, 
        descricao || null, 
        nomeOriginal
    ], function(err) {
        if (err) {
            console.error("Erro ao atualizar serviço:", err);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar serviço."
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Serviço não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Serviço atualizado com sucesso."
        });
    });
});

// Buscar serviços - CORRIGIDA COM LOGS
app.get("/buscar-servicos", (req, res) => {
    console.log("=== BUSCANDO SERVIÇOS ===");
    const query = `SELECT id, nome, preco, duracao FROM servicos ORDER BY nome`;

    db.all(query, (err, rows) => {
        if (err) {
            console.error("❌ Erro ao buscar serviços:", err);
            return res.status(500).json({ message: "Erro ao buscar serviços." });
        }

        console.log(`✅ Serviços encontrados: ${rows.length}`);
        console.log("Serviços:", rows);
        res.json(rows);
    });
});

// Cadastrar serviço - CORRIGIDO
app.post("/servicos", (req, res) => {
    console.log("Recebendo dados para cadastrar serviço:", req.body);

    const { nome, preco, duracao, descricao } = req.body;

    if (!nome || !preco) {
        return res.status(400).json({
            success: false,
            message: "Nome e preço são obrigatórios."
        });
    }

    const query = `INSERT INTO servicos (nome, preco, duracao, descricao) VALUES (?, ?, ?, ?)`;
    db.run(query, [
        nome, 
        preco, 
        duracao || null, 
        descricao || null
    ], function(err) {
        if (err) {
            console.error("Erro ao cadastrar serviço:", err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({
                    success: false,
                    message: "Serviço já cadastrado no sistema."
                });
            }
            return res.status(500).json({
                success: false,
                message: "Erro ao cadastrar serviço."
            });
        }
        console.log("Serviço cadastrado com ID:", this.lastID);
        res.status(201).json({
            success: true,
            id: this.lastID,
            message: "Serviço cadastrado com sucesso."
        });
    });
});

// ========== ROTAS DE CLIENTES ==========

// Buscar clientes
app.get("/clientes", (req, res) => {
    const cpf = req.query.cpf || "";

    if (cpf) {
        const query = `SELECT * FROM clientes WHERE cpf LIKE ? ORDER BY nome`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM clientes ORDER BY nome`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    }
});

// Cadastrar cliente - CORRIGIDO
app.post("/clientes", (req, res) => {
    console.log("Recebendo dados para cadastrar cliente:", req.body);

    const { nome, cpf, email, telefone, endereco } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({
            success: false,
            message: "Nome e CPF são obrigatórios."
        });
    }

    const query = `INSERT INTO clientes (nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [
        nome, 
        cpf, 
        email || null, 
        telefone || null, 
        endereco || null
    ], function(err) {
        if (err) {
            console.error("Erro ao cadastrar cliente:", err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({
                    success: false,
                    message: "CPF já cadastrado no sistema."
                });
            }
            return res.status(500).json({
                success: false,
                message: "Erro ao cadastrar cliente."
            });
        }
        console.log("Cliente cadastrado com ID:", this.lastID);
        res.status(201).json({
            success: true,
            id: this.lastID,
            message: "Cliente cadastrado com sucesso."
        });
    });
});

// Atualizar cliente por CPF - CORRIGIDO
app.put("/clientes/cpf/:cpf", (req, res) => {
    const cpf = req.params.cpf;
    const { nome, email, telefone, endereco } = req.body;

    console.log("Atualizando cliente CPF:", cpf, "Dados:", req.body);

    if (!nome) {
        return res.status(400).json({
            success: false,
            message: "Nome é obrigatório."
        });
    }

    const query = `UPDATE clientes SET nome = ?, email = ?, telefone = ?, endereco = ? WHERE cpf = ?`;

    db.run(query, [
        nome, 
        email || null, 
        telefone || null, 
        endereco || null,
        cpf
    ], function(err) {
        if (err) {
            console.error("Erro ao atualizar cliente:", err);
            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar cliente."
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Cliente não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Cliente atualizado com sucesso."
        });
    });
});

// ========== ROTAS DE AGENDAMENTOS ==========

// Buscar horários disponíveis
app.get("/horarios-disponiveis", (req, res) => {
    const { data, id } = req.query;

    if (!data || !id) {
        return res.status(400).json({ message: "Data e ID do serviço são obrigatórios." });
    }

    const query = `SELECT horario FROM agendamentos WHERE data = ? AND id_servico = ?`;
    db.all(query, [data, id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar horários." });
        }

        const horariosOcupados = rows.map(row => row.horario);
        const todosHorarios = [];

        for (let hora = 8; hora <= 18; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
                if (!horariosOcupados.includes(horario)) {
                    todosHorarios.push(horario);
                }
            }
        }

        res.json(todosHorarios);
    });
});

// Cadastrar agendamento - CORRIGIDO
app.post("/cadastrar-agendamento", (req, res) => {
    console.log("Recebendo dados para agendamento:", req.body);

    const { data, horario, cpf_cliente, id_barbeiro, id_servico } = req.body;

    if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
        return res.status(400).json({
            success: false,
            message: "Todos os campos são obrigatórios."
        });
    }

    const verificaBarbeiroQuery = `SELECT cargo FROM barbeiros WHERE id = ? AND cargo IN ('Barbeiro', 'Cabeleireiro')`;
    db.get(verificaBarbeiroQuery, [id_barbeiro], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao verificar barbeiro:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno do servidor."
            });
        }

        if (!barbeiro) {
            return res.status(400).json({
                success: false,
                message: "Barbeiro selecionado não está autorizado a realizar serviços."
            });
        }

        const verificaHorarioQuery = `SELECT * FROM agendamentos WHERE data = ? AND horario = ? AND id_barbeiro = ?`;
        db.get(verificaHorarioQuery, [data, horario, id_barbeiro], (err, agendamentoExistente) => {
            if (err) {
                console.error("Erro ao verificar horário:", err);
                return res.status(500).json({
                    success: false,
                    message: "Erro interno do servidor."
                });
            }

            if (agendamentoExistente) {
                return res.status(400).json({
                    success: false,
                    message: "Já existe um agendamento para este barbeiro no horário selecionado."
                });
            }

            const query = `INSERT INTO agendamentos (data, horario, cpf_cliente, id_barbeiro, id_servico) VALUES (?, ?, ?, ?, ?)`;
            db.run(query, [data, horario, cpf_cliente, id_barbeiro, id_servico], function(err) {
                if (err) {
                    console.error("Erro ao cadastrar agendamento:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Erro ao cadastrar agendamento."
                    });
                }
                console.log("Agendamento cadastrado com ID:", this.lastID);
                res.status(201).json({
                    success: true,
                    message: "Agendamento cadastrado com sucesso."
                });
            });
        });
    });
});

// Listar agendamentos
app.get("/agendamentos", (req, res) => {
    const date = req.query.date;

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
    `;

    if (date) {
        query += ` WHERE a.data = ? ORDER BY a.horario`;
        db.all(query, [date], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY a.data DESC, a.horario DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    }
});

// Excluir agendamento - CORRIGIDO
app.delete("/excluir-agendamento/:id", (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM agendamentos WHERE id = ?`;

    db.run(query, [id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Erro ao excluir agendamento."
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Agendamento não encontrado."
            });
        }

        res.json({
            success: true,
            message: "Agendamento excluído com sucesso."
        });
    });
});

// ========== ROTAS DE RELATÓRIOS ==========

// ROTA CORRIGIDA - RELATÓRIO FINANCEIRO
app.get("/relatorio-financeiro", (req, res) => {
    console.log("Rota /relatorio-financeiro chamada com sucesso!");

    const { cpf_cliente, servico, dataInicio, dataFim } = req.query;
    console.log("Parâmetros:", { cpf_cliente, servico, dataInicio, dataFim });

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome,
            s.preco as servico_preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        WHERE 1=1
    `;

    const params = [];

    if (cpf_cliente && cpf_cliente.trim() !== '') {
        query += ` AND a.cpf_cliente LIKE ?`;
        params.push(`%${cpf_cliente}%`);
    }

    if (servico && servico.trim() !== '') {
        query += ` AND s.nome LIKE ?`;
        params.push(`%${servico}%`);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC`;

    console.log("Query SQL:", query);
    console.log("Parâmetros SQL:", params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro na consulta:", err);
            return res.status(500).json({ 
                success: false,
                message: "Erro no banco de dados",
                error: err.message 
            });
        }

        console.log(`Consulta retornou ${rows.length} registros`);
        res.json(rows);
    });
});

// NOVA ROTA - RELATÓRIO FINANCEIRO APENAS COM PAGAMENTOS CONFIRMADOS (CORRIGIDA)
app.post("/relatorio-financeiro-confirmados", (req, res) => {
    console.log("Rota /relatorio-financeiro-confirmados chamada com sucesso!");

    const { cpf_cliente, servico, dataInicio, dataFim } = req.query;
    const { pagamentos } = req.body;

    console.log("Parâmetros query:", { cpf_cliente, servico, dataInicio, dataFim });
    console.log("Pagamentos recebidos no body:", pagamentos);

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome,
            s.preco as servico_preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        WHERE 1=1
    `;

    const params = [];

    if (cpf_cliente && cpf_cliente.trim() !== '') {
        query += ` AND a.cpf_cliente LIKE ?`;
        params.push(`%${cpf_cliente}%`);
    }

    if (servico && servico.trim() !== '') {
        query += ` AND s.nome LIKE ?`;
        params.push(`%${servico}%`);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC`;

    console.log("Query SQL:", query);
    console.log("Parâmetros SQL:", params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro na consulta:", err);
            return res.status(500).json({ 
                success: false,
                message: "Erro no banco de dados",
                error: err.message 
            });
        }

        console.log(`Consulta retornou ${rows.length} registros do banco`);

        // Filtrar apenas os agendamentos que têm pagamento confirmado
        const pagamentosConfirmados = pagamentos || [];
        console.log("Pagamentos para filtrar:", pagamentosConfirmados);

        const agendamentosComPagamento = rows.filter(agendamento => {
            const pagamento = pagamentosConfirmados.find(p => p.id === agendamento.id);
            const temPagamento = pagamento && pagamento.valorFinal > 0;
            console.log(`Agendamento ${agendamento.id} - Tem pagamento: ${temPagamento}`);
            return temPagamento;
        });

        // Adicionar informações de pagamento aos agendamentos
        const agendamentosCompletos = agendamentosComPagamento.map(agendamento => {
            const pagamento = pagamentosConfirmados.find(p => p.id === agendamento.id);
            return {
                ...agendamento,
                valorFinal: pagamento ? pagamento.valorFinal : 0,
                desconto: pagamento ? pagamento.desconto : 0,
                formaPagamento: pagamento ? pagamento.formaPagamento : '',
                dataPagamento: pagamento ? pagamento.dataPagamento : '',
                valorPago: pagamento ? pagamento.valorPago : 0,
                troco: pagamento ? pagamento.troco : 0
            };
        });

        console.log(`Agendamentos com pagamento confirmado: ${agendamentosCompletos.length}`);
        res.json(agendamentosCompletos);
    });
});

// ========== ROTAS DE DEBUG ==========

// Debug - Verificar dados das tabelas
app.get("/debug-tabelas", (req, res) => {
    console.log("=== DEBUG TABELAS ===");

    // Verificar barbeiros
    db.all("SELECT id, nome, cargo FROM barbeiros", (err, barbeiros) => {
        if (err) {
            console.error("Erro ao buscar barbeiros:", err);
        } else {
            console.log("Barbeiros na tabela:", barbeiros);
        }

        // Verificar serviços
        db.all("SELECT id, nome, preco FROM servicos", (err, servicos) => {
            if (err) {
                console.error("Erro ao buscar serviços:", err);
            } else {
                console.log("Serviços na tabela:", servicos);
            }

            res.json({
                barbeiros: barbeiros,
                servicos: servicos,
                total_barbeiros: barbeiros.length,
                total_servicos: servicos.length
            });
        });
    });
});

// ========== ROTAS GERAIS ==========

// Rota de teste para verificar se o servidor está funcionando
app.get("/test", (req, res) => {
    res.json({ message: "Servidor funcionando!" });
});

// Rota padrão
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Rotas disponíveis:`);
    console.log(`- GET  /test (teste do servidor)`);
    console.log(`- GET  /debug-tabelas (debug das tabelas)`);
    console.log(`- GET  /buscar-barbeiros (barbeiros para agendamentos)`);
    console.log(`- GET  /buscar-servicos (serviços para agendamentos)`);
    console.log(`- GET  /relatorio-financeiro (relatório financeiro)`);
    console.log(`- GET  /agendamentos`);
    console.log(`- GET  /clientes`);
    console.log(`- GET  /servicos`);
    console.log(`- GET  /barbeiros`);
    console.log(`- POST /login-barbeiro (login com nome e senha)`);
    console.log(`- POST /clientes (cadastrar cliente)`);
    console.log(`- PUT  /clientes/cpf/:cpf (atualizar cliente por CPF)`);
    console.log(`- POST /barbeiros (cadastrar barbeiro)`);
    console.log(`- PUT  /barbeiros/cpf/:cpf (atualizar barbeiro por CPF)`);
    console.log(`- POST /servicos (cadastrar serviço)`);
    console.log(`- PUT  /servicos/nome/:nome (atualizar serviço)`);
    console.log(`- POST /cadastrar-agendamento (cadastrar agendamento)`);
    console.log(`- DELETE /excluir-agendamento/:id (excluir agendamento)`);
});

// Tratamento de erro para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: "Rota não encontrada" 
    });
});