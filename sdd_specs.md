# Especificações Técnicas (SDD)

Este documento contém a especificação técnica detalhada para o desenvolvimento das três aplicações que compõem o monorepo da **CORBAN**. As especificações aqui documentadas foram criadas no modelo **Spec-Driven Development (SDD)**, com clareza matemática e contratos rigorosos, prontas para serem interpretadas e codificadas por agentes de inteligência artificial (programadores autônomos).

---

## 1. Módulo: `rpa-imp-c6` (Extração C6 Bank)

### 1.1 Contrato da API REST
A aplicação deve ser desenvolvida em **NestJS** e expor um controlador HTTP na porta `3001` com os seguintes endpoints:

#### A. Iniciar Processamento RPA
* **Método**: `POST`
* **Rota**: `/rpa/start`
* **Payload JSON (Request)**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "usuario": { "type": "string", "description": "Usuário/CPF de acesso ao portal do C6" },
    "senha": { "type": "string", "description": "Senha de acesso ao portal" },
    "loja": { "type": "string", "description": "Identificador da loja física" },
    "headless": { "type": "boolean", "default": true },
    "dataInicio": { "type": "string", "format": "date", "description": "Data inicial para filtragem no formato YYYY-MM-DD" },
    "statusImportacao": { 
      "type": "array", 
      "items": { "type": "string" },
      "description": "Lista de status textuais para filtrar na esteira do banco"
    },
    "callbackUrl": { "type": "string", "format": "uri", "description": "URL que receberá o upload da planilha ao final" }
  },
  "required": ["usuario", "senha", "loja", "callbackUrl"]
}
```
* **Resposta (Response)**: `202 Accepted`
```json
{
  "status": "running",
  "message": "C6 RPA pipeline started successfully in background"
}
```

#### B. Parar Execução Ativa
* **Método**: `POST`
* **Rota**: `/rpa/stop`
* **Resposta (Response)**: `200 OK`
```json
{
  "status": "stopped",
  "message": "C6 RPA processing was aborted by request"
}
```

---

### 1.2 Fluxo de Automação do Playwright (Banco C6)

O RPA deve executar os seguintes passos no navegador **Firefox** (com o plugin `puppeteer-extra-plugin-stealth` ativado):

1. **Acesso Inicial**: Navegar para `https://www.c6consig.com.br/`.
2. **Login**:
   - Preencher o CPF/Usuário no input `#EUsuario_CAMPO`.
   - Preencher a senha no input `#ESenha_CAMPO`.
   - Clicar no botão entrar `#lnkEntrar`.
   - *Error Handling*: Se aparecer o texto `"Nova Senha"`, abortar imediatamente e retornar erro de senha expirada.
3. **Extração de Token de Sessão**:
   - Capturar o parâmetro de query `FISession` da URL atual da página.
   - Navegar diretamente para a URL de consulta concatenando o token obtido:
     `https://www.c6consig.com.br/WebAutorizador/MenuWeb/Esteira/AprovacaoConsulta/UI.AprovacaoConsultaAnd.aspx?FISession={SESSION_TOKEN}`
4. **Filtros e Consulta**:
   - Preencher o intervalo de datas (definido pelo parâmetro `dataInicio` até a data atual).
   - Aplicar filtros para os status configurados no parâmetro `statusImportacao`.
   - Disparar a consulta.
5. **Varredura e Paginação (Scraping)**:
   - Aguardar o carregamento do spinner de carregamento `//*[@id='ctl00_UpdPrs']` até que o estilo de exibição CSS seja alterado de `"block"` para `"none"`.
   - Ler a tabela HTML usando o seletor `table#ctl00_Cph_AprCons_grdConsulta` (ou XPath `/html/body/form/div[3]/table/tbody/tr/td/table/tbody/tr[2]/td/div/table/tbody/tr[3]/td/table/tbody/tr/td/div/div/div/table`).
   - Mapear as colunas da tabela e armazenar em um array de objetos.
   - Tratar a paginação: Se o link de próxima página `//*[@id="ctl00_Cph_AprCons_lkbProximo"]` estiver ativo e contiver `javascript:__doPostBack`, clicar nele, aguardar o spinner sumir e repetir a leitura da tabela até o final das páginas.
6. **Compilação do Arquivo**:
   - Utilizar a biblioteca `xlsx` para converter o array de objetos mapeados em uma planilha Excel na memória (Buffer).
7. **Disparo do Callback**:
   - Realizar uma requisição HTTP POST Multipart/form-data para o `callbackUrl` enviado, anexando o arquivo gerado sob o nome de campo `arquivo`, com os metadados `banco = 'c6'` e `loja = '{loja}'`.
   - Fechar o browser.

---

## 2. Módulo: `proposta-queue` (Orquestração & Worker)

Esta aplicação atua como o **cérebro** do monorepo, gerenciando o banco de dados PostgreSQL, a fila no Redis e agendando as chamadas. Escuta na porta `3000`.

### 2.1 Banco de Dados - Schema TypeORM
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proposta')
export class Proposta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'banco', type: 'varchar', length: 50 })
  banco: string;

  @Column({ name: 'valor', type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'cliente', type: 'varchar', length: 255 })
  cliente: string;

  @Column({ name: 'produto', type: 'varchar', length: 100 })
  produto: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'pendente' })
  status: 'pendente' | 'processando' | 'importado' | 'erro';

  @Column({ name: 'loja', type: 'varchar', length: 50, nullable: true })
  loja: string;

  @Column({ name: 'dados_originais', type: 'jsonb', nullable: true })
  dadosOriginais: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

### 2.2 Estrutura da Fila e Jobs (BullMQ)

A fila é chamada de `proposta`.

#### Esquema de Mensagem para Processamento de Arquivo
Quando o endpoint de upload recebe um arquivo, ele enfileira o seguinte job:
```typescript
interface FileProcessingJob {
  caminho: string;       // Caminho absoluto temporário no sistema de arquivos local do container
  nomeOriginal: string;  // Ex: "C6_BANK_000015_06.06.26.xlsx"
  banco: 'c6';           // Identificador do banco para mapeamento
  loja: string;          // Ex: "000015"
}
```

---

### 2.3 Mapeamento de Campos (`C6Mapper`)

O worker de processamento da planilha lê as linhas brutas extraídas e aplica a interface `PropostaMapper` abaixo:

```typescript
export interface PropostaMapper {
  mapRow(row: Record<string, unknown>): Partial<Proposta>;
}
```

A classe `C6Mapper` deve traduzir as colunas da tabela do C6 para os campos normalizados da base:
1. **Cliente**: Mapeado a partir de `row['Cliente']` ou `row['Nome']` ou `row['Nome do Cliente']`.
2. **Valor**: Mapeado a partir de `row['Valor']` ou `row['Vl. Operação']` ou `row['Vl. Contrato']`. Se for string, deve remover os pontos de milhar e converter a vírgula decimal em ponto decimal antes do parsing (`parseFloat`).
3. **Produto**: Mapeado de `row['Operação']` ou `row['Produto']`. Caso nulo, assume o valor padrão `"Consignado"`.
4. **Status**: Define por padrão como `'pendente'`.
5. **Dados Originais**: Salva o objeto `row` completo sem alterações no campo `dadosOriginais` do banco.

---

### 2.4 Endpoints de Callback e Orquestração

#### A. Receber Planilha Raspada (RPA Callback)
* **Método**: `POST`
* **Rota**: `/propostas/upload`
* **Formato**: `multipart/form-data`
* **Campos**:
  - `arquivo`: Arquivo Excel binário.
  - `banco`: String (`"c6"`).
  - `loja`: String (`"000015"`).
* **Lógica**: Salva o arquivo localmente em uma pasta temporária `/tmp/uploads`, cria um job com a estrutura `FileProcessingJob` e empurra na fila do BullMQ.

#### B. Receber Confirmação de Importação no CRM (CRM Callback)
* **Método**: `POST`
* **Rota**: `/propostas/confirmar-importacao`
* **Payload JSON**:
```json
{
  "banco": "C6 Bank",
  "loja": "000015",
  "status": "success",
  "message": "Imported successfully"
}
```
* **Lógica**: Executa uma query SQL update no banco definindo `status = 'importado'` para todos os registros que atendam aos critérios `{ banco, loja, status: 'pendente' }`.

---

## 3. Módulo: `rpa-imp-workbank` (Importação CRM)

### 3.1 Contrato da API REST
Escuta na porta `3002`.

#### A. Iniciar Fluxo de Importação no CRM
* **Método**: `POST`
* **Rota**: `/rpa/start`
* **Payload JSON (Request)**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "usuario": { "type": "string" },
    "senha": { "type": "string" },
    "loja": { "type": "string" },
    "headless": { "type": "boolean", "default": true },
    "fileBase64": { "type": "string", "description": "String codificada em Base64 contendo os bytes da planilha formatada" },
    "fileName": { "type": "string", "description": "Nome sugerido para o arquivo temporário" },
    "esteira": { "type": "string", "description": "Lote/Esteira de destino para filtro no CRM. Ex: 'C6 BANK'" },
    "callbackUrl": { "type": "string", "format": "uri" }
  },
  "required": ["usuario", "senha", "fileBase64", "fileName", "esteira", "callbackUrl"]
}
```
* **Resposta (Response)**: `202 Accepted`

---

### 3.2 Fluxo de Automação do Playwright (CRM Workbank)

O RPA deve executar os seguintes passos no navegador **Chromium**:

1. **Decodificação do Arquivo**: Converter a string `fileBase64` de volta em um arquivo físico no diretório `/tmp/{fileName}`.
2. **Login com Resolução de Captcha**:
   - Navegar para `https://alcifmais.workbankvirtual.com.br/login.aspx?pdc=true`.
   - Preencher o input `#usuario` com o valor de `usuario`.
   - **Verificar Google reCAPTCHA**: Detectar o contêiner do reCAPTCHA usando seletor `#divRecaptcha`.
   - **Resolução Externa**:
     - Usar a biblioteca `@antiadmin/anticaptchaofficial` passando a chave de API de captcha de ambiente (`APIKEY_ANTICAPTCHA`).
     - Resolver o captcha com os seguintes parâmetros fixos:
       - Website URL: `https://alcifmais.workbankvirtual.com.br/login.aspx`
       - Website Key: `6Lc-mtgUAAAAAN2LwQ52i6Cec8vPlcjNFFWlwmFx`
     - Injetar o token retornado nos inputs ocultos `[name='g-recaptcha-response']` e `#captchaId`.
     - Executar a função callback global do site via console JavaScript: `setResponse(token)`.
     - Disparar o evento do tipo `change` nas caixas de texto modificadas.
   - **Primeiro Clique**: Localizar o botão `.login-btn` e clicar.
   - **Aguardar Campo de Senha**: Esperar até que o campo `#senha` perca a propriedade css `hidden`.
   - Preencher o input `#senha` com `senha`.
   - **Segundo Clique**: Clicar novamente no botão `.login-btn`.
   - Aguardar redirecionamento até a URL interna que contenha `ImportacaoBackOffice.aspx` ou `Default.aspx`.
3. **Navegação de Menus**:
   - Clicar no link de menu `"CADASTROS"` usando o seletor `__page.getByRole("link", { name: "CADASTROS" })`.
   - Clicar no link `"Importação de Arquivos"` usando `__page.getByRole("link", { name: "Importação de Arquivos" })`.
   - Clicar no link `"Mapeamento de Arquivos"` usando `__page.getByRole("link", { name: "Mapeamento de Arquivos" })`.
4. **Upload na Iframe**:
   - Localizar a Iframe `#reactFrame`.
   - Dentro da iframe, localizar o input de busca `getByPlaceholder("Filtrar por nome")` e escrever o valor contido em `esteira` (Ex: `"C6 BANK"`).
   - Localizar o elemento de rótulo `getByLabel("Arquivo")` dentro da iframe e clicar nele para abrir o gerenciador de arquivos do Playwright (`filechooser`).
   - Injetar o caminho do arquivo físico decodificado `/tmp/{fileName}` no gerenciador.
   - Aguardar 1 segundo para estabilização da UI.
   - Clicar no botão `"Enviar Arquivo"` localizado dentro da iframe usando o seletor `getByRole("button", { name: "Enviar Arquivo" })`.
5. **Callback Final**:
   - Enviar uma requisição HTTP POST para o `callbackUrl` configurado enviando o payload `{ "banco": "C6", "loja": loja, "status": "success" }`.
   - Fechar o browser.
