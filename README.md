# Planilha de Testes UFV

Aplicativo para preencher, no computador, a planilha de testes de campo de usina fotovoltaica (mesas, strings, Voc, polaridade, flutuação e isolação). Os dados ficam **neste PC**: você salva um arquivo, gera PDF ou imprime, e abre outro teste quando quiser.

O modelo segue a planilha `Planilha de Testes.ods` (abas `INVERSOR_01` … `INVERSOR_04`, UFV, data, umidade e temperatura).

## No Windows

Há um executável **portátil** (`Planilha de Testes UFV 1.3.5.exe`): copie para o PC (pasta, pen drive ou área de trabalho) e abra com dois cliques. Não precisa instalar nada.

Para gerar o **instalador** com atalho no menu Iniciar e na área de trabalho, no próprio Windows:

```bash
npm install
npm run dist:win
```

Os arquivos saem na pasta `release/`:

- `Planilha de Testes UFV Setup 1.3.5.exe` — instalador (atualiza a versão anterior sem desinstalar)
- `Planilha de Testes UFV 1.3.5.exe` — portátil

Depois de abrir o app:

1. Preencha data, UFV, **endereço**, Voc esperada da string, erro ± %, tensão do módulo e o critério de isolação.
2. Em **Instrumentos**, identifique o multímetro/alicate (Voc, polaridade e flutuação) e o megômetro (isolação). Se o teste não estiver ligado, o cadastro do aparelho some.
3. Em **Configuração**, ligue ou desligue colunas, escolha planilha colorida ou cinza, e se a impressão/PDF sai colorida ou em preto e branco. **Usina pequena** vem com String, MPPT, Voc, polaridade e flutuação. Edite e use **Salvar como usina pequena/grande** para guardar o seu modelo neste PC.
4. Use **Adicionar inversor**, **Adicionar mesa** ou **Adicionar string**. Tensão aplicada e Tempo copiam da linha anterior, como a mesa.
5. Clique na célula e digite. A bolinha no fim da linha mostra **Aprovado** (check verde) ou **Reprovado** (X). Clique em **Salvar**.
6. **Salvar PDF** ou **Imprimir** gera o relatório, com os instrumentos.
7. **Novo** começa outro teste. **Abrir** recupera um teste antigo.

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
