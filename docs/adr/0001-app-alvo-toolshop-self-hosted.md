# ADR-0001: Toolshop self-hosted como aplicação sob teste

- Status: aceito
- Data: 2026-08-26

## Contexto

Durante a Semana 1, a API do Toolshop retornou HTTP 200 com produtos que não existiam no banco.
Nem um teste de UI nem um de API detectariam isso: os dois tiram a resposta da mesma aplicação
que estava errada, e ela respondeu com status 200 e dados plausíveis. Faltava uma fonte de
verdade independente da própria aplicação.

Ter essa fonte exige alcançar o banco durante o teste — e não dá para alcançar o banco de um
servidor que não é seu. Por isso a instância pública de practicesoftwaretesting.com está
descartada como alvo.

## Decisão

Subir a stack inteira do Toolshop (sprint5) — UI Angular, API Laravel, MariaDB e worker da fila —
local e no CI via `docker compose`, com o banco acessível na porta 3306 e seed determinístico a
cada rodada. Os testes conversam com as três camadas: UI, API e banco.

A app escreve parte do estado de forma assíncrona: o checkout despacha um job para a fila e o
estoque só é decrementado depois. Medido nesta stack: `POST /invoices` responde **201 em ~390 ms**
com o estoque ainda em 25; segundos depois o banco mostra 23.

Isso torna a app um alvo melhor, não pior. Um alvo totalmente síncrono não me obrigaria a lidar
com consistência eventual — e é o que acontece no ERP em que trabalho, onde a nota é emitida e o
estoque baixa depois. Testar esta app exige distinguir "a aplicação respondeu" de "o dado está
consolidado", que é a distinção que importa em produção.

## Alternativas consideradas

**EverShop** — Postgres exposto, compose de apenas dois containers e saturação praticamente zero
em portfólios. Descartado porque o Toolshop tem o schema de invoice que eu conheço do ERP:
`invoices → invoice_items → payments`. Conhecer o domínio é o que permite escrever invariantes que
valem alguma coisa: qualquer um assere que a linha existe no banco; saber que o total da invoice
tem que bater com a soma dos itens e com o pagamento — e onde arredondamento de DECIMAL costuma
quebrar isso — vem de ter vivido o domínio.

**Construir uma aplicação própria** — daria controle total e unicidade máxima. Descartado porque o
foco é automação, não construir a aplicação do zero. Com 8–10 h por semana, o que precisa existir
no repositório ao fim da fase é código de teste.

## Trade-offs aceitos

**A app é batida.** O Toolshop aparece em centenas de tutoriais, cursos e repositórios. Isso
facilita a avaliação em vez de atrapalhar: como quem avalia já conhece a aplicação, não gasta
tempo entendendo o domínio e vê de imediato o que foi feito além do padrão. A diferenciação não
está no alvo, está na camada — praticamente ninguém fecha o ciclo UI → API → banco sobre ele.

**A licença proíbe hospedar a aplicação publicamente.** Não existe link "clique e veja a loja
rodando". A prova do trabalho muda de forma: os runs do CI são públicos, o relatório HTML do
Playwright é artefato próprio (e pode ser publicado), e qualquer pessoa sobe a stack local com um
comando. É por isso que pipeline visível e relatório publicado importam tanto neste repositório.

**Dependência de imagens de terceiros.** Se o autor publicar uma imagem quebrada, o CI quebra
junto — hoje o compose consome as imagens sem tag fixa. Risco aceito conscientemente; mitigação
conhecida é fixar as imagens por versão ou digest.

## Consequências

**Obriga a** subir a stack completa em toda rodada — local e no CI —, seedar o banco de forma
determinística antes de cada execução e limpar o cache da aplicação junto (sem isso o teste roda
contra dado fantasma), manter uma conexão de teste direta ao MariaDB e tratar consistência
eventual com espera por critério, nunca com sleep fixo.

**Destrava** asserções que validam de forma independente o que a aplicação inseriu: total da
invoice contra a soma dos itens e contra o pagamento, integridade referencial, decremento de
estoque. E destrava a prova de detecção — rodar a mesma suíte contra a variante
`sprint5-with-bugs` e mostrar os invariantes ficando vermelhos.
