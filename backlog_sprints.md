# Backlog e Plano de Sprints

Este documento descreve a organização do backlog do projeto e o planejamento de sprints lógicas para o desenvolvimento da esteira automatizada CORBAN no monorepo NestJS. A organização segue as metodologias ágeis de desenvolvimento de software (Scrum) com uma separação clara de responsabilidades por Sprints e Épicos.

---

## 1. Estrutura de Épicos (Backlog Geral)

### Épico 1: Infraestrutura do Monorepo e Dockerização
Foco na configuração estrutural inicial do projeto, garantindo que o monorepo possua configurações TypeScript unificadas, pacotes compatíveis, bancos de dados e filas locais orquestrados através de contêineres Docker.

### Épico 2: Microserviço `rpa-imp-c6` (Extração C6)
Refatoração do script legando em Python para TypeScript usando NestJS e Playwright com técnica Stealth. Envolve a automação completa do portal C6, geração de planilha dinâmica e endpoint de controle REST.

### Épico 3: Microserviço `rpa-imp-workbank` (Importação CRM)
Portabilidade e refatoração do robô do CRM. Envolve login com quebra de reCAPTCHA usando a API do Anti-Captcha, navegação em submenus internos do CRM, upload em iframe oculta e callback de status.

### Épico 4: Núcleo Orquestrador `proposta-queue` (Mensageria e Banco)
Integração e ajuste do app central. Envolve a escrita de entidades de banco de dados relacional PostgreSQL, mapeador inteligente das planilhas brutas do banco C6 (`C6Mapper`), fila BullMQ rodando no Redis e disparo agendado dos RPAs.

### Épico 5: Validação de Ponta a Ponta e Estabilização
Testes de integração locais, instrumentação de logging nativo estruturado e simulações de cenários de erro (credenciais inválidas, portais fora do ar, limites de timeout).

---

## 2. Cronograma das Sprints

### Sprint 1: Fundação do Monorepo e Infraestrutura Local
* **Objetivo da Sprint**: Estabelecer a estrutura física do Monorepo NestJS e orquestrar os serviços auxiliares (PostgreSQL, Redis) no Docker Compose.
* **Histórias de Usuário & Tarefas**:
  1. **Configuração de Workspaces**:
     - Criar `package.json` raiz definindo os subdiretórios `proposta-queue`, `rpa-imp-c6` e `rpa-imp-workbank` como workspaces NPM/Yarn.
     - Centralizar dependências comuns de linting e build.
  2. **Estrutura Base de Compilação TypeScript**:
     - Configurar `tsconfig.json` global na raiz e herdar configurações (`extends`) nos subprojetos.
     - Garantir compilações isoladas sem conflito de pacotes.
  3. **Composição Docker Local**:
     - Criar `docker-compose.yml` contendo:
       - Banco PostgreSQL com volume persistente e script de inicialização.
       - Redis configurado com persistência simples de chaves para mensageria.
       - Configuração de rede ponte interna (`corban-network`).
  4. **Instalação e Conexão Base Database**:
     - Instalar dependências do TypeORM em `proposta-queue` e testar a conexão inicial com o banco Postgres do docker.

---

### Sprint 2: Microserviço de Extração do Banco C6 (`rpa-imp-c6`)
* **Objetivo da Sprint**: Refatorar o fluxo legado em Python para uma API NestJS stateless controlando o robô de extração em Playwright.
* **Histórias de Usuário & Tarefas**:
  1. **Boilerplate NestJS & Playwright**:
     - Inicializar o app NestJS na pasta `rpa-imp-c6`.
     - Instalar as dependências do Playwright e Firefox extra stealth.
  2. **Controlador e DTOs de Início**:
     - Criar a rota `POST /rpa/start` mapeando o payload de parâmetros (usuário, senha, datas, callbackUrl) validando via `class-validator`.
     - Desenhar a rota `POST /rpa/stop` para controle de cancelamento manual de processos.
  3. **Automação do Fluxo de Login C6**:
     - Escrever rotina em Playwright preenchendo os seletores `#EUsuario_CAMPO` e `#ESenha_CAMPO`.
     - Implementar detecção de erro para fluxo de expiração de senha.
  4. **Extração de Dados e Navegação**:
     - Implementar navegação direta via token `FISession` na URL de aprovação de propostas.
     - Capturar a tabela HTML `table#ctl00_Cph_AprCons_grdConsulta` navegando entre páginas até o fim dos registros.
  5. **Geração de Planilha e Envio de Callback**:
     - Integrar a biblioteca `xlsx` para conversão dos dados raspados para binário de Excel.
     - Desenvolver o envio via POST Multipart para a URL de retorno informada no start.

---

### Sprint 3: Microserviço de Importação do CRM (`rpa-imp-workbank`)
* **Objetivo da Sprint**: Implementar a API stateless NestJS + Playwright capaz de autenticar no CRM quebrando captcha e fazer upload de planilhas.
* **Histórias de Usuário & Tarefas**:
  1. **Setup NestJS do Robô do CRM**:
     - Inicializar o app NestJS na pasta `rpa-imp-workbank`.
     - Instalar dependências da API do resolvedor do Anti-Captcha.
  2. **Estrutura dos Endpoints de Importação**:
     - Desenvolver rota `POST /rpa/start` que recebe credenciais, lote/esteira e o arquivo excel serializado em Base64.
  3. **Resolvedor de ReCAPTCHA**:
     - Programar a verificação visual do contêiner do Captcha.
     - Integrar chamada à API do Anti-Captcha para o SiteKey do CRM.
     - Injetar o token nos seletores corretos do formulário e executar a trigger JavaScript `setResponse(token)`.
  4. **Automação de Navegação de Menus**:
     - Executar cliques coordenados em "CADASTROS" -> "Importação de Arquivos" -> "Mapeamento de Arquivos".
  5. **Mapeamento e Upload na Iframe**:
     - Mapear a iframe `#reactFrame`.
     - Escrever no filtro da iframe a esteira solicitada.
     - Acionar a captura do evento `filechooser` e enviar o arquivo excel físico reconstruído do Base64.
     - Submeter clicando em "Enviar Arquivo".
  6. **Notificação de Fim de Importação**:
     - Disparar requisição de sucesso/erro para a URL de callback.

---

### Sprint 4: Fila, Mapeamento e Orquestrador (`proposta-queue`)
* **Objetivo da Sprint**: Estruturar a persistência relacional das propostas, os mapeadores e a lógica de agendamento por fila (BullMQ).
* **Histórias de Usuário & Tarefas**:
  1. **Entidades PostgreSQL e Migrations**:
     - Desenvolver a tabela de persistência de propostas mapeando colunas de negócio e a coluna coringa `dadosOriginais` do tipo JSONB.
  2. **Desenvolvimento do `C6Mapper`**:
     - Escrever o tradutor de objetos da planilha para o banco de dados.
     - Implementar o parser de valores numéricos tratando pontos de milhar e vírgulas decimais em strings.
  3. **Configuração do BullMQ e Processador**:
     - Configurar a fila de processamento `proposta` no BullMQ com limite de concorrência.
     - Criar o Worker responsável por processar o arquivo XLSX de propostas, chamar o `C6Mapper` e salvar os registros.
  4. **Implementação de Callbacks no Orquestrador**:
     - Desenvolver a rota `/propostas/upload` para receber a planilha, salvá-la em `/tmp` e injetar a mensagem na fila.
     - Desenvolver a rota `/propostas/confirmar-importacao` para receber a conclusão do robô do CRM e atualizar a tabela PostgreSQL.
  5. **Scheduler de Ciclos**:
     - Criar um serviço NestJS agendador para iniciar a execução do C6 RPA periodicamente, verificar os registros e acionar o robô de importação no CRM.

---

### Sprint 5: Testes de Integração, Hardening e Deploy Local
* **Objetivo da Sprint**: Conectar todos os módulos do monorepo, tratar falhas comuns e executar uma simulação completa de ponta a ponta em ambiente de teste local.
* **Histórias de Usuário & Tarefas**:
  1. **Instrumentação de Logs Comuns**:
     - Padronizar mensagens de logs nas 3 aplicações utilizando JSON e saída padrão (Stdout).
  2. **Lógica de Tratamento de Erros e Retry**:
     - Configurar no BullMQ re-tentativas automáticas de jobs com atraso progressivo (Exponential Backoff).
  3. **Testes de Fluxo Completo (E2E)**:
     - Disparar uma simulação manual através de endpoints HTTP e analisar as transições de status da tabela de propostas no PostgreSQL de `pendente` -> `importado`.
  4. **Documentação e Build Final**:
     - Documentar variáveis de ambiente requeridas para os arquivos `.env` das três aplicações.
     - Validar que o comando `docker compose up --build` constrói e roda os serviços localmente sem erros de importação de bibliotecas no TypeScript.
