# ADR-0001: Toolshop self-hosted como aplicação sob teste

- Status: rascunho (escrever com as próprias palavras — exercício da Semana 1)
- Data: 2026-08-__

## Contexto

<!-- TODO(Erick): 3-5 frases SUAS. Perguntas-guia:
     Que problema este repo resolve? Por que a app sob teste precisa de banco acessível?
     Por que não testar a instância pública de practicesoftwaretesting.com? -->

## Decisão

<!-- TODO(Erick): a decisão em 2-3 frases (self-host via compose, sprint5, MariaDB exposto).
     Inclua o detalhe que descobrimos no reconhecimento: o decremento de estoque é
     assíncrono (job na queue "database", processado pelo serviço cron) — por que isso
     torna a app um alvo MELHOR para validação de banco, não pior? -->

## Alternativas consideradas

<!-- TODO(Erick): EverShop (por que não?), construir app própria (por que não?).
     Uma frase honesta para cada. -->

## Trade-offs aceitos

<!-- TODO(Erick): saturação da app em tutoriais (e por que vira vantagem);
     licença (não hospedar publicamente); dependência de imagens de terceiros. -->

## Consequências

<!-- TODO(Erick): o que essa decisão obriga (compose no CI, seed determinístico,
     conexão mysql2 na porta 3306) e o que ela permite (invariantes invoice/itens/payment,
     prova de detecção com sprint5-with-bugs). -->
