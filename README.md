# Planilha de Testes UFV

Aplicativo para preencher, no computador, a planilha de testes de campo de usina fotovoltaica (mesas, strings, Voc, polaridade, flutuação e isolação). Os dados ficam **neste PC**: você salva um arquivo, gera PDF ou imprime, e abre outro teste quando quiser.

O modelo segue a planilha `Planilha de Testes.ods` (abas `INVERSOR_01` … `INVERSOR_04`, UFV, data, umidade e temperatura).

## No Windows

Há um executável **portátil** (`Planilha de Testes UFV 1.3.8.exe`): copie para o PC (pasta, pen drive ou área de trabalho) e abra com dois cliques. Não precisa instalar nada.

Para gerar o **instalador** com atalho no menu Iniciar e na área de trabalho, no próprio Windows:

```bash
npm install
npm run dist:win
```

Os arquivos saem na pasta `release/`:

- `Planilha de Testes UFV Setup 1.3.8.exe` — instalador (atualiza a versão anterior sem desinstalar)
- `Planilha de Testes UFV 1.3.8.exe` — portátil

O instalador cria a pasta **Documentos\Planilha de Testes UFV**. O programa grava ali um `rascunho-automatico.ufv.json` enquanto você trabalha. Se fechar sem querer, abra o app e escolha recuperar, ou use **Abrir** nessa pasta.

Depois de abrir o app:

1. Preencha data, UFV, **endereço**, Voc esperada da string, erro ± %, tensão do módulo e o critério de isolação.
2. Em **Instrumentos**, identifique o multímetro/alicate (Voc, polaridade e flutuação) e o megômetro (isolação). Se o teste não estiver ligado, o cadastro do aparelho some.
3. Em **Configuração**, ligue ou desligue colunas (incluindo **Seção mm²** e **Mesa**), escolha planilha colorida ou cinza, e se a impressão/PDF sai colorida ou em preto e branco. **Usina pequena** vem com String, MPPT, Voc, polaridade e flutuação. Edite e use **Salvar como usina pequena/grande** para guardar o seu modelo neste PC.
4. Use **Adicionar inversor** ou **Adicionar string**. Tensão aplicada, Tempo, mesa e seção do condutor copiam da linha anterior.
5. Com teste de isolação ligado, a coluna **Corr. 20°C** aplica o fator de correção com a temperatura e a umidade do cabeçalho. Sem isolação, o cálculo não aparece.
6. Clique na célula e digite. A bolinha no fim da linha mostra **Aprovado** (check verde) ou **Reprovado** (X). Clique em **Salvar**.
7. **Salvar PDF** ou **Imprimir** gera o relatório, com os instrumentos.
8. **Novo** começa outro teste. **Abrir** recupera um teste antigo.

Atalhos: `Ctrl+S` salvar, `Ctrl+Shift+S` salvar como, `Ctrl+O` abrir, `Ctrl+N` novo, `Ctrl+P` imprimir, `Ctrl+Z` desfazer, `Ctrl+Y` refazer. Na grade: `Enter` / `Shift+Enter` sobe/desce, `Tab` avança, setas movem.

Não precisa de internet. Nada é enviado para servidor.

## Gerar o instalador (neste repositório)

```bash
npm install
npm test
npm run dist:win
```

O instalador e a versão portátil (sem instalação) saem em `release/`.

## Página de teste no navegador

Abra `teste.html` (ou `index.html?demo=1`). A planilha já vem preenchida com o exemplo Manga G. 05.

```bash
npm install
npm run dev
```

Depois acesse `http://127.0.0.1:5173/teste.html`. **Salvar** baixa o `.ufv.json`; **Salvar PDF** baixa o PDF.

## Arquivo de dados

Cada teste é um JSON (`.ufv.json`) com cabeçalho da UFV e as linhas de todos os inversores. Pode copiar o arquivo para outro computador e abrir no mesmo aplicativo.
