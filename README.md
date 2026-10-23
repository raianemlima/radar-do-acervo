# Radar do Acervo

Painel estático para a primeira fase do **Projeto Radar do Acervo — 2ª Vara Cível de Aracati**. Ele lê dados do PED no navegador, gera filas de trabalho orientadas por regras e exporta os resultados em CSV.

## O que esta versão faz

- importa CSV do PED e oferece leitura assistida de PDF;
- calcula o semáforo por dias parados: verde (até 30), amarelo (31–100) e vermelho (mais de 100);
- identifica prioridades a partir de palavras-chave: curatela, guarda, alimentos, ECA e saúde;
- encaminha casos por uma pequena tabela de regras visível no código;
- cria lotes por próximo ato e exporta a lista filtrada ou completa.

Nenhum dado é enviado ao PJe, nem qualquer movimentação é executada. Arquivos são tratados no navegador do usuário. A leitura de PDF é experimental: confira todos os textos extraídos antes de usá-los.

## Formato CSV

Use `amostra-ped.csv` como referência. As colunas obrigatórias são **Processo** e **Último movimento**. O app reconhece também `Classe`, `Assunto` e uma coluna cujo nome contenha `Data`.

## Rodar localmente

Abra `index.html` em um navegador moderno ou sirva a pasta com qualquer servidor estático. Não há dependências de compilação.

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
