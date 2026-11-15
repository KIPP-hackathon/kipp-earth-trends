# Publicação alternativa Cloudflare

Solicitada pelo usuário para manter duas opções de publicação, com domínio
`kipp-nasa.space`. Implementação assistida por OpenAI Codex.

- [x] Conferir Vite, proxies Vercel e autenticação IAM do Cloud Run.
- [x] Integrar ajustes recentes do time, preservando mudanças locais.
- [x] Reutilizar os handlers HTTP nas duas plataformas, preservando rotas,
  limites, validação, unidades e quota do assistente.
- [x] Publicar Vite + Worker servidor na Cloudflare. Identidade dedicada com
  somente run.invoker neste serviço; chave em secret da Cloudflare, nunca em
  VITE_*, assets, Git ou logs. Vercel mantém OIDC, sem mudança de identidade.
- [x] Conectar GitHub somente ao monorepo KIPP, produção main, raiz frontend.
  GitHub Actions publicado e verificado com sucesso em 2b975d3.
- [ ] Ativar domínio após conferir DNS e certificado sem remover registros
  existentes de e-mail ou validação.
- [x] Validar testes existentes, builds, rotas reais, rejeição de origem do
  assistente e acesso direto anônimo negado no Cloud Run.

Workers Static Assets evita depender do runtime da Vercel. Uma simples cópia
estática deixaria /api sem servidor; proxy via Vercel manteria dependência dela.
Sem upgrade pago, migração de dados ou alteração dos cálculos. Salvos continuam
locais por origem: não migram automaticamente entre Vercel e Cloudflare, mas
links compartilhados transportam a configuração da investigação.
