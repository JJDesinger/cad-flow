# Especificação do Sistema — Gerenciamento de Fluxo de Atividades CAD

**Versão:** 1.0  
**Data:** 2026-05-01  
**Status:** Especificação inicial — base para desenvolvimento

---

## 1. Visão Geral

Sistema web para centralizar e controlar o fluxo de atividades do time de CAD (projetos mecânicos e elétricos), do início ao fim do processo: criação, verificação, revisão e liberação de documentos técnicos para os engenheiros.

- **Usuários:** ~100 pessoas
- **Plataforma:** Web — desktop/notebook (prioritário); mobile como fase futura
- **Natureza:** Projeto de aprendizado e desenvolvimento técnico pessoal

---

## 2. Perfis de Usuário e Permissões

### 2.1 Admin (Super Usuário)
- Acesso completo ao sistema
- Gerencia banco de dados, configurações do sistema, cadastros, permissões
- Acesso a todos os relatórios e dados operacionais

### 2.2 Gestor
- Acesso a relatórios e dashboards gerenciais
- Gerencia cadastros e permissões de usuários
- Visualiza dados de todos os usuários e atividades

### 2.3 Projetista / Verificador
- Acesso operacional individualizado (vê apenas atividades sob sua responsabilidade)
- Acesso a relatórios de suas próprias atividades
- **Obs.:** Um mesmo usuário pode acumular os dois papéis
- Usuário com papel de **Verificador** tem permissão para aprovar ou liberar documentos

---

## 3. Fluxo de Atividades

```
┌────────────┐    ┌───────────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐
│ Solicitado │ -> │ Em Andamento  │ -> │ Verificação │ -> │ Aprovado │ -> │Concluído │
└────────────┘    └───────────────┘    └─────────────┘    └──────────┘    └──────────┘
                         ↕                    ↕                 ↕
                      [ HOLD ]             [ HOLD ]          [ HOLD ]
```

### Regras do fluxo
- O **Planejador** é o responsável por criar e inserir atividades no sistema
- Em qualquer fase, uma atividade pode ser colocada em **HOLD** (suspensa temporariamente)
- Na fase de **Verificação**, pode haver múltiplas iterações entre Executor e Verificador antes da aprovação
- Cada mudança de status é registrada com responsável e timestamp

---

## 4. Dados de uma Atividade

### 4.1 Campos de Identificação

| Campo | Tipo | Regra |
|---|---|---|
| ID único | Auto | Gerado automaticamente |
| Número do documento | Texto | Opcional na criação; **obrigatório** ao enviar para verificação |
| Linha de produto | Seleção | Flow Control / Well Control |
| Projeto | Texto/Seleção | — |
| Equipamento | Texto/Seleção | — |
| Componente | Texto/Seleção | — |
| Tipo de documento | Seleção | Ex: Desenho 3D, Detalhamento, etc. |
| Codificação do documento | Texto | Padrão definido pelo usuário; sistema apenas armazena |

### 4.2 Responsáveis

| Campo | Descrição |
|---|---|
| Executor | Projetista responsável pela execução |
| Verificador | Responsável pela verificação técnica |
| Aprovador | Responsável pela aprovação final |

### 4.3 Datas — Planejadas e Efetivas

| Evento | Data Planejada | Data Efetiva |
|---|---|---|
| Criação da atividade | — | Automática (timestamp) |
| Início da execução | Sim | Sim |
| Envio para verificação | Sim | Sim |
| Finalização/conclusão | Sim | Sim |

### 4.4 Armazenamento de Arquivos
- O sistema armazena **links** para os arquivos (não os arquivos em si)
- Os arquivos residem no **Teamcenter Siemens**
- O usuário insere o link manualmente; o sistema abre o arquivo no Teamcenter ao clicar
- Ponto pode ser reavaliado para armazenamento direto em versão futura

---

## 5. Histórico e Rastreabilidade

### 5.1 Log de Processamento
- Registro completo de cada mudança de status (quem fez, quando, de qual para qual status)
- Especial atenção à fase de Verificação: cada iteração (reprovação e reenvio) é registrada individualmente

### 5.2 Classificação de Erros na Verificação
Quando uma verificação é reprovada, o verificador deve classificar o tipo de erro:

| Código | Tipo de Erro |
|---|---|
| E01 | Falta de atenção |
| E02 | Conhecimento de métodos e processos |
| E03 | Falta de informação de processo |
| E04 | Alteração de escopo |
| E99 | Outros (campo aberto) |

*Lista pode ser expandida conforme necessidade.*

---

## 6. Dashboard e Relatórios

### 6.1 KPIs Principais

| KPI | Descrição |
|---|---|
| OTD (On Time Delivery) | % de atividades concluídas dentro do prazo planejado |
| Taxa de Qualidade | % de documentos aprovados na primeira verificação |
| Volume de Execução | Quantidade de atividades por período |
| Horas de Execução | Total de horas registradas por período |
| Classificação de Erros | Frequência por tipo de erro nas verificações reprovadas |
| Carga por Pessoa | Quantidade de atividades abertas por usuário (visão do planejador) |

### 6.2 Filtros Disponíveis
- Projeto
- Equipamento
- Linha de produto (Flow Control / Well Control)
- Status da atividade
- Responsável (executor / verificador)
- Período (intervalo de datas)

### 6.3 Visão por Perfil

| Perfil | Dashboard |
|---|---|
| Admin / Gestor | Visão global — todos os projetos, todas as atividades, KPIs consolidados |
| Planejador | Carga por pessoa, atividades sem responsável, atividades atrasadas |
| Projetista | Apenas suas atividades — status, prazos, fila pessoal |
| Verificador | Fila de documentos aguardando verificação, histórico de verificações |

---

## 7. Integrações

| Sistema | Tipo de Integração |
|---|---|
| E-mail corporativo | Notificações automáticas por SMTP |
| Teamcenter Siemens | Links para arquivos (abertura externa) |

### 7.1 Eventos que disparam notificação por e-mail
- Atividade atribuída a um usuário
- Documento enviado para verificação
- Verificação reprovada (retorno ao executor)
- Documento aprovado
- Atividade colocada em HOLD
- Prazo se aproximando (alerta preventivo)

---

## 8. Arquitetura Recomendada

### 8.1 Stack Sugerida

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React + Tailwind CSS | Componentização, grande ecossistema, responsivo |
| Backend | Node.js + Express | Leve, rápido, bom suporte a REST API |
| Banco de dados | PostgreSQL | Relacional, robusto, open source |
| Autenticação | JWT + RBAC | Seguro, padrão de mercado para controle de perfis |
| E-mail | Nodemailer (SMTP) | Integração direta com e-mail corporativo |
| Hospedagem | Docker local → Cloud (fase futura) | Começa simples, escala quando necessário |

### 8.2 Modelo de Dados — Entidades Principais

```
Usuario
  id, nome, email, senha_hash, perfil, ativo

Atividade
  id, numero_documento, linha_produto, projeto, equipamento, componente,
  tipo_documento, codificacao, status, executor_id, verificador_id,
  aprovador_id, link_arquivo, criado_em, atualizado_em

Datas_Atividade
  atividade_id, data_inicio_planejada, data_inicio_efetiva,
  data_verificacao_planejada, data_verificacao_efetiva,
  data_conclusao_planejada, data_conclusao_efetiva

Historico_Status
  id, atividade_id, status_anterior, status_novo, usuario_id, timestamp, observacao

Verificacao
  id, atividade_id, verificador_id, iteracao, resultado,
  tipo_erro, observacao, timestamp

Notificacao
  id, usuario_id, atividade_id, tipo, enviado_em, status
```

---

## 9. Escopo do MVP

### Incluído no MVP
- Cadastro e autenticação de usuários com controle de perfis
- CRUD de atividades com todos os campos definidos
- Fluxo de status completo com HOLD
- Registro de datas planejadas e efetivas
- Histórico de processamento com log de status
- Classificação de erros na verificação
- Dashboard com KPIs básicos (OTD, qualidade, volume)
- Filtros principais (projeto, status, responsável, período)
- Notificações por e-mail para eventos principais
- Links para arquivos no Teamcenter

### Fora do MVP (fases futuras)
- Operação mobile completa
- Relatórios exportáveis (PDF/Excel)
- Integração avançada com Teamcenter (API)
- Armazenamento de arquivos direto no sistema
- Gantt / linha do tempo de atividades
- Expansão da lista de tipos de erro

---

## 10. Próximos Passos Sugeridos

1. Validar esta especificação e ajustar o que for necessário
2. Definir stack tecnológica final
3. Modelar o banco de dados detalhado
4. Criar wireframes das telas principais
5. Configurar o ambiente de desenvolvimento
6. Desenvolver o MVP por módulos:
   - Módulo 1: Autenticação e gestão de usuários
   - Módulo 2: CRUD de atividades e fluxo de status
   - Módulo 3: Dashboard e KPIs
   - Módulo 4: Notificações por e-mail
