# Backend Cloud Run — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Publicar a API de dados reais KIPP no Cloud Run us-east4.
**Architecture:** Fastify + TypeScript; adaptadores Databricks SQL e PostgreSQL;
cache limitado, formatos binários e consultas espaciais/temporais parametrizadas.
**Tech Stack:** Node.js 24, Fastify, pg, Cloud Run, Secret Manager.
**Spec:** docs/superpowers/specs/2026-11-14-backend-cloud-run-design.md

## Global Constraints

- Conta pessoal do hackathon; CLOUDSDK_CONFIG isolado do ambiente corporativo.
- Databricks como fonte; não ler GCS ou kipp/serving.
- Nenhum segredo em Git, respostas, logs ou frontend.
- Não executar suítes de testes, conforme instrução do usuário; compilar e fazer smoke real.

## Review Focus

- Parâmetros não podem virar SQL, identificadores ou URLs arbitrários.
- Nodata deve continuar ausente; não apresentar zeros inventados.
- Número de células, tamanho do cache e consultas concorrentes limitados.
- Segredos e exceções do banco não podem vazar na API pública.
- Paginação da Statement API não pode perder células silenciosamente.

### Task 1: Diagnóstico e identidade

- [x] Inspecionar schema e consultar inventário real via SQL.
- [x] Identificar projeto, conta pessoal e criar runtime service account.
- [x] Configurar identidade Databricks para consultas e Secret Manager.

### Task 2: API

- [x] Criar backend/ com Fastify, adaptadores e cache.
- [x] Implementar catálogo, disponibilidade, frames JSON/Float32 e série por bbox.
- [x] Documentar contrato e migração para Lakebase.

### Task 3: Publicação

- [x] Compilar e enviar imagem ao Artifact Registry us-east4.
- [x] Publicar revisão pronta: acesso ao segredo concedido; API pública com no-invoker-iam-check.
- [x] Conferir localmente saúde, consultas reais, cache, formato binário e parâmetros inválidos.
- [x] Repetir smoke na URL pública: catálogo, recorte, saúde, prontidão e binário global.
- [x] Revisar, registrar URL e versionar a implementação com identidade pessoal KIPP.

Publicado: https://kipp-earth-api-583662795760.us-east4.run.app
Revisão: kipp-earth-api-00003-kxz. Login GCP ativo: admin@kipptrend.space.
Git mantém Lucas Henrique / Luckstai. Frontend ainda não integrado à API.
