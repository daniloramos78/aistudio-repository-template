# Planilha de Testes UFV

Aplicativo para preencher, no computador, a planilha de testes de campo de usina fotovoltaica (mesas, strings, Voc, polaridade, flutuação e isolação). Os dados ficam **neste PC**: você salva um arquivo, gera PDF ou imprime, e abre outro teste quando quiser.

O modelo segue a planilha `Planilha de Testes.ods` (abas `INVERSOR_01` … `INVERSOR_04`, UFV, data, umidade e temperatura).

## No Windows

Há um executável **portátil** (`Planilha de Testes UFV 1.1.0.exe`): copie para o PC (pasta, pen drive ou área de trabalho) e abra com dois cliques. Não precisa instalar nada.

Para gerar o **instalador** com atalho no menu Iniciar e na área de trabalho, no próprio Windows:

```bash
npm install
npm run dist:win
```

Os arquivos saem na pasta `release/`:

- `Planilha de Testes UFV Setup 1.1.0.exe` — instalador
- `Planilha de Testes UFV 1.1.0.exe` — portátil

Depois de abrir o app:

1. Preencha data, umidade, temperatura e o nome da UFV.
2. Em **Configuração**, ligue ou desligue colunas (mesa, string, MPPT, testes). O padrão é todos os campos; usina pequena pode ficar sem mesa.
3. Em cada aba de inversor, use **Adicionar mesa** (abre um diálogo; as linhas entram vazias) ou **Adicionar string**.
4. Clique na célula para preencher. Clique em **Salvar**. O arquivo `.ufv.json` fica na pasta que você escolher.
5. **Salvar PDF** ou **Imprimir** gera o relatório.
6. **Novo** começa outro teste. **Abrir** recupera um teste antigo.

Atalhos: `Ctrl+S` salvar, `Ctrl+Shift+S` salvar como, `Ctrl+O` abrir, `Ctrl+N` novo, `Ctrl+P` imprimir.

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
