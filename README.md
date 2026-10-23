# Radar do Acervo

Painel estático para a primeira fase do **Projeto Radar do Acervo — 2ª Vara Cível de Aracati**. Ele lê dados do PED no navegador, gera filas de trabalho orientadas por regras e exporta os resultados em CSV.

## O que esta versão faz

- importa CSV (UTF-8, UTF-16 ou Windows-1252), Excel (`.xls`, `.xlsx`, `.xlsm`) e PDF com texto selecionável;
- calcula dias corridos desde a última movimentação; a referência visual de 100 dias é provisória e precisa ser validada pela unidade, nunca é prazo legal;
- destaca menções textuais a urgência/risco, criança/adolescente, temas que podem exigir validação de prioridade e audiências;
- separa sinais de busca de conclusões: não confirma pedidos pendentes, prioridade legal, situação de audiência ou inconsistência de competência;
- mostra evidência disponível, limitações da análise, confiança baixa quando só há metadados e encaminhamento para revisão humana;
- organiza filas gerenciais P2/P3 sem classificar automaticamente processos em P0/P1, e exporta todos os avisos junto aos dados.
- mantém uma lista independente de menções a ato infracional, adoção, medida de proteção e medida socioeducativa (esta última como vínculo a confirmar), com exportação própria e indicação do campo/termo localizado.

Nenhum dado é enviado ao PJe ou a uma API, e nenhuma movimentação é executada. Arquivos e bibliotecas de leitura são tratados no navegador do usuário. A fonte é somente o relatório PED importado: o app não consulta PJe, autos, petições, decisões, documentos, filas, normas locais ou TPU. Portanto, P0/P1, prioridade legal, pendências, atualidade de risco, audiências e compatibilidade de classe/assunto/competência exigem revisão humana. Ausência de sinal no relatório não significa ausência nos autos. PDF digitalizado como imagem precisa passar por OCR antes. Confira os dados e encaminhamentos extraídos antes de usá-los.

A lista especial é exclusivamente textual: considera classe, assunto e último movimento disponíveis no arquivo. Uma menção não confirma o tipo, conteúdo, fase, sigilo ou situação atual do processo. A exportação própria inclui apenas os processos com termos localizados e registra categoria, termo e campo de origem.

## Formato CSV

Use `amostra-ped.csv` como referência. O app reconhece os relatórios PED mesmo quando há linhas de título antes do cabeçalho, incluindo CSV em Windows-1252 separado por vírgulas. São reconhecidas as colunas **Processo**, **Descrição da Movimentação** e **Data da Última movimentação**, além de variações de número CNJ, movimento, classe, assunto e data. Em arquivos Excel (`.xls`, `.xlsx` e `.xlsm`), a aba com essas colunas será importada. A cópia local do SheetJS Community Edition 0.20.3 está em `vendor/`.

O PDF precisa ter texto selecionável. A leitura do relatório PED considera cabeçalhos e números de processo quebrados entre linhas e extrai os campos pela posição das colunas. PDFs digitalizados como imagem ainda precisam de OCR antes da importação. O parser PDF.js 6.3.289 também é incluído localmente em `vendor/`.

## Rodar localmente

Sirva a pasta com qualquer servidor estático e abra a página em um navegador moderno. Os leitores de Excel e PDF são incluídos em `vendor/`, sem baixar dependências durante a importação. O app é estático e não precisa de servidor de aplicação.

## Verificações automatizadas

Com Node.js 24 ou superior instalado, execute `node --check app.js` e `node tests/test-app.mjs`. O mesmo teste roda automaticamente em pull requests e em atualizações da branch `main` no GitHub Actions; usa arquivos de exemplo criados em memória e não depende dos arquivos do usuário.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos.
2. Em **Settings → Pages**, em *Build and deployment*, escolha **GitHub Actions**.
3. Faça push para a branch `main`. O workflow em `.github/workflows/deploy-pages.yml` publica a aplicação.
4. Em **Actions**, aguarde a conclusão de “Deploy static content to Pages”; o GitHub mostrará o endereço público.

## Antes do uso institucional

- valide a tabela de regras e os modelos com o juiz responsável;
- não carregue documentos sob sigilo em computadores ou navegadores não autorizados;
- confirme a aderência às regras do TJCE e à Resolução CNJ nº 615/2025;
- mantenha a decisão e a movimentação sempre sob revisão humana.

## Próximas fases

1. Ajustar a tabela de regras aos códigos e à portaria da vara.
2. Adicionar a comparação semanal entre dois CSVs.
3. Avaliar o agente Triador em ambiente autorizado, com revisão humana e controles adequados para autos sigilosos.
