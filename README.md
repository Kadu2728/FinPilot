# ✈ FinPilot

> **Plataforma SaaS de gestão financeira para pequenas empresas, autônomos e MEIs.**

![FinPilot](https://img.shields.io/badge/FinPilot-1.0.0-4F6EF7?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql)

---

## Sobre o Projeto

O **FinPilot** é uma aplicação web full-stack que oferece controle financeiro completo:

- Gerenciamento de receitas e despesas com categorização
- Dashboard com KPIs e gráficos interativos (Chart.js)
- Metas financeiras mensais com barra de progresso
- Fluxo de caixa em tempo real
- Autenticação segura com JWT + bcrypt
- Interface dark premium responsiva

---

## Stack

| Camada     | Tecnologia                            |
|------------|---------------------------------------|
| Frontend   | HTML5, CSS3, JavaScript (Vanilla)     |
| Backend    | Python 3.13+, FastAPI, SQLAlchemy     |
| Banco      | MySQL 8+                              |
| Auth       | JWT (python-jose) + bcrypt (passlib)  |
| Gráficos   | Chart.js 4                            |
| Versão     | Git + GitHub                          |

---

## Estrutura de Pastas

```
finpilot/
├── html/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── receitas.html
│   ├── despesas.html
│   └── perfil.html
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── receitas.js
│   ├── despesas.js
│   └── perfil.js
├── python/
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   └── routes.py
├── sql/
│   └── finpilot.sql
|
├── requirements.txt
└── README.md
```

---

## Instalação e Execução

### Pré-requisitos

- Python 3.13+
- MySQL 8.0+
- VS Code (recomendado)
- Git

---

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/finpilot.git
cd finpilot
```

---

### 2. Configure o MySQL

Abra o MySQL Workbench ou terminal MySQL e execute:

```sql
-- Criar banco e tabelas
SOURCE sql/finpilot.sql;
```

Ou manualmente:

```bash
mysql -u root -p < sql/finpilot.sql
```

---

### 3. Configure o ambiente Python

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Ativar (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

---

### 4. Configure o .env

Edite o arquivo `.env` na raiz do projeto:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=finpilot
SECRET_KEY=gere-uma-chave-forte-aqui
TOKEN_EXPIRE_MINUTES=1440
```

Para gerar uma SECRET_KEY segura:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 5. Execute o backend (FastAPI)

```bash
# Na raiz do projeto (pasta finpilot/)
uvicorn python.main:app --reload --port 8000
```

O servidor estará disponível em:
- API: `http://localhost:8000`
- Documentação Swagger: `http://localhost:8000/docs`
- Documentação Redoc: `http://localhost:8000/redoc`

---

### 6. Execute o frontend

Abra `html/login.html` diretamente no navegador, **ou** use a extensão **Live Server** do VS Code:

1. Abra a pasta `finpilot/` no VS Code
2. Clique com botão direito em `html/login.html`
3. Selecione **"Open with Live Server"**

> O frontend já está configurado para apontar para `http://localhost:8000`.

---

## Endpoints da API

| Método | Endpoint              | Descrição                  | Auth |
|--------|-----------------------|----------------------------|------|
| POST   | /auth/register        | Cadastrar usuário          | ❌   |
| POST   | /auth/login           | Login + token JWT          | ❌   |
| GET    | /auth/me              | Dados do usuário atual     | ✅   |
| PUT    | /auth/me              | Atualizar nome             | ✅   |
| PUT    | /auth/password        | Alterar senha              | ✅   |
| GET    | /receitas             | Listar receitas            | ✅   |
| POST   | /receitas             | Criar receita              | ✅   |
| PUT    | /receitas/{id}        | Editar receita             | ✅   |
| DELETE | /receitas/{id}        | Excluir receita            | ✅   |
| GET    | /despesas             | Listar despesas            | ✅   |
| POST   | /despesas             | Criar despesa              | ✅   |
| PUT    | /despesas/{id}        | Editar despesa             | ✅   |
| DELETE | /despesas/{id}        | Excluir despesa            | ✅   |
| GET    | /metas                | Listar metas               | ✅   |
| POST   | /metas                | Criar meta                 | ✅   |
| PUT    | /metas/{id}           | Editar meta                | ✅   |
| DELETE | /metas/{id}           | Excluir meta               | ✅   |
| GET    | /dashboard            | Resumo financeiro          | ✅   |

---

## Testando a API

### Via Swagger UI (recomendado)

Acesse `http://localhost:8000/docs` e teste diretamente pelo browser.

### Via curl

```bash
# Registrar
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"João","email":"joao@email.com","password":"minhasenha"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"minhasenha"}'

# Listar receitas (com token)
curl http://localhost:8000/receitas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Deploy

### Backend (Railway / Render)

1. Crie um serviço web apontando para o repositório
2. Configure as variáveis de ambiente (as mesmas do `.env`)
3. Start command: `uvicorn python.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel / Netlify)

1. Faça upload da pasta `html/`, `css/`, `js/`
2. Atualize `BASE_URL` em `js/api.js` para a URL do seu backend em produção

### Banco (PlanetScale / Railway MySQL)

1. Crie o banco e execute o `sql/finpilot.sql`
2. Atualize as variáveis `DB_*` no `.env` de produção

---

## Segurança

- Senhas com hash bcrypt (cost factor 12)
- JWT com expiração configurável
- CORS configurado (restringir em produção)
- Proteção contra SQL Injection via ORM (SQLAlchemy)
- Validação de entrada com Pydantic v2
- Rotas protegidas com Bearer token

---

## Licença

MIT — use, modifique e distribua livremente.

---

Desenvolvido com foco em qualidade de produto SaaS real.
