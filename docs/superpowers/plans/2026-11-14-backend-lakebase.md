# Ativação Lakebase — Implementation Plan

> Executar inline usando superpowers:executing-plans.

**Goal:** API remota lendo as quatro tabelas disponíveis no Lakebase.
**Architecture:** Adaptador PostgreSQL existente, OAuth com SA Google, CI/CD mantém configuração e acesso privado via Vercel.
**Tech Stack:** Node 24, pg, Cloud Run, Lakebase.

- [x] Conferir status de sync, schemas, contagens e cobertura das quatro tabelas.
- [x] Registrar SA no workspace e criar papel OAuth sem administração.
- [x] Conceder CONNECT/USAGE/SELECT restritos às quatro tabelas e verificar.
- [x] Validar DataService com banco real: catálogo, frame e série para cada variável.
- [x] Atualizar deploy-image.sh para modo Lakebase por padrão e SQL explícito para rollback; smoke exige provider configurado e quatro coberturas.
- [x] Compilar backend, rodar testes backend/frontend e build frontend; validar shell/actionlint.
- [ ] Integrar branch à main preservando alterações concorrentes; acompanhar deploy com SA real.
- [ ] Confirmar provider, meses, frames e séries remotos; registrar revisão e execução.
