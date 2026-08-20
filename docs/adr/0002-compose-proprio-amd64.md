# ADR-0002: Compose próprio (amd64-nativo) em vez do docker-compose.prod.yml upstream

- Status: aceito
- Data: 2026-08-20
- Autor: infraestrutura do harness (revisar/ajustar antes de publicar)

## Contexto

O harness precisa subir a app sob teste de forma idêntica na máquina local (Windows/Docker
Desktop, amd64) e no runner do GitHub Actions (`ubuntu-latest`, amd64). O compose de produção
do upstream funciona localmente, mas duas das suas imagens são **arm64-only**:

```
testsmith/practice-software-testing-web          -> arm64
testsmith/practice-software-testing-cron         -> arm64
testsmith/practice-software-testing-sprint5-api  -> amd64
testsmith/practice-software-testing-sprint5-ui   -> amd64
```

No Docker Desktop isso passa despercebido (roda por emulação). No runner, exigiria QEMU
(`docker/setup-qemu-action`) — mais uma peça móvel, mais lentidão e uma classe de falha
difícil de depurar, para rodar dois serviços triviais.

## Decisão

Escrever um compose próprio, derivado do upstream, com duas substituições:

1. **`web`**: a imagem upstream é `nginx:1.23.3-alpine` + um `vhost.conf` de 20 linhas.
   Trocada pela imagem oficial `nginx:1.23.3-alpine` (multi-arch: amd64, arm64, 386, ppc64le,
   s390x) com o `vhost.conf` vendorizado em `docker/nginx/`.
2. **`cron` → `queue`**: o serviço upstream roda `crond` que dispara `schedule:run` a cada
   minuto, que por sua vez chama `queue:work --stop-when-empty`. Substituído por um worker
   explícito (`php artisan queue:work`) usando a **imagem da API** (amd64).

## Por que a segunda troca é melhor que uma tradução literal

O checkout despacha `UpdateProductInventory` para a queue `database` — o decremento de estoque
**não acontece dentro da resposta HTTP**. Com o `crond` de 1 minuto, um teste que verifique
estoque esperaria até 60s. Com o worker contínuo, a janela cai para segundos.

A assincronia **permanece real** (é o que justifica o padrão de polling na camada de banco);
só o tempo de espera encolhe. Trocar `crond` por `queue:work` não esconde a natureza assíncrona
do sistema — torna o teste dela viável.

## Trade-offs aceitos

- **Divergência do upstream**: o compose não é mais cópia do `docker-compose.prod.yml`. Se o
  upstream mudar o vhost, é preciso re-vendorizar. Custo baixo (20 linhas), risco explícito aqui.
- **O serviço `cron` também rodava `invoice:generate` e `order:update`** (schedule). O worker
  não os executa. Nenhum teste atual depende deles; se algum passar a depender, a decisão é
  adicionar `schedule:work` ao lado do worker — não voltar ao crond arm64.

## Consequências

- A stack roda nativa nos dois ambientes; sem QEMU no CI.
- `docker/nginx/vhost.conf` passa a ser artefato versionado do harness.
- O ciclo limpo medido localmente (imagens já em cache): `up` 30s, readiness 34s
  (a UI domina — `ng serve` compila o Angular no boot). O custo do _pull_ no runner ainda
  não foi medido — é o número que decide se vale cachear imagens no CI.
