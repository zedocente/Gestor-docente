# Gestor Docente

Aplicativo instalável (Progressive Web App, PWA) para gerir a carreira docente: atividades por eixo, comprovantes, orientandos, projetos, produção bibliográfica, metas e dossiê de progressão.

- Funciona sem internet: os dados ficam salvos no aparelho.
- Com o Google Drive conectado, os dados ficam também na pasta **Gestor Docente** do seu Drive e sincronizam entre celular e computador.
- Os comprovantes vão para subpastas por eixo (01 Ensino, 02 Pesquisa etc.).
- O dossiê gera um Google Docs na pasta **08 Dossiê de progressão**, ou uma planilha CSV.

O app usa a permissão `drive.file` do Google: ele só enxerga os arquivos e pastas que ele mesmo criou. O restante do seu Drive fica inacessível para ele.

---

## Parte 1. Publicar o app no GitHub Pages (cerca de 10 minutos)

1. Crie uma conta gratuita em `github.com`, se ainda não tiver.
2. Clique em **New repository**. Nome: `gestor-docente`. Marque **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste **todo o conteúdo** desta pasta (não a pasta em si): `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md` e a pasta `icons`. Clique em **Commit changes**.
5. Vá em **Settings**, depois **Pages**. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
6. Aguarde de 1 a 2 minutos. O endereço do app aparece no topo da página: `https://SEU-USUARIO.github.io/gestor-docente/`.

O código fica público, mas os seus dados não: eles ficam no seu aparelho e no seu Google Drive.

## Parte 2. Ativar o Google Drive (cerca de 10 minutos, uma vez só)

Faça no computador, com a mesma conta Google que você usa no Drive.

1. Abra `console.cloud.google.com` e crie um projeto chamado `Gestor Docente`.
2. Menu **APIs e serviços**, depois **Biblioteca**. Procure **Google Drive API** e clique em **Ativar**.
3. Menu **Tela de permissão OAuth** (em algumas contas aparece como **Google Auth Platform**):
   - Tipo de usuário: **Externo**.
   - Nome do app: `Gestor Docente`. E-mail de suporte e de contato: o seu.
   - Em **Público** (ou **Usuários de teste**), adicione o seu próprio e-mail.
   - Deixe o app em modo **Teste**. Não é preciso enviar para verificação.
4. Menu **Credenciais**, depois **Criar credenciais**, depois **ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em **Origens JavaScript autorizadas**, adicione: `https://SEU-USUARIO.github.io` (sem barra no final e sem `/gestor-docente`).
   - Clique em **Criar** e copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).
5. Abra o app, vá em **Mais**, depois **Configurações**. Cole o ID, toque em **Salvar ID** e depois em **Entrar com Google e sincronizar**.
6. O Google vai mostrar o aviso "O Google não verificou este app". É o esperado para um app pessoal em modo de teste. Toque em **Continuar** e autorize.

## Parte 3. Instalar no celular

- **Android (Chrome):** abra o endereço do app, toque no menu de três pontos e depois em **Instalar app** ou **Adicionar à tela inicial**.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

Cada aparelho precisa colar o ID do cliente uma vez, em Configurações. Depois disso, a sincronização traz os dados do Drive.

## Uso no dia a dia

- **+ (botão verde):** registra uma atividade. Escolha o eixo e a categoria sugerida aparece.
- **Anexar comprovante:** tire uma foto ou escolha um PDF. O arquivo vai para a pasta do eixo no Drive e a atividade passa para "Arquivado".
- **Painel:** mostra comprovantes pendentes, itens fora do Lattes, prazos de orientandos e metas, e o andamento do interstício.
- **Dossiê:** escolha o período e gere o documento no Drive ou baixe a planilha.
- **Sincronização:** o botão no topo mostra o estado. "Sincronizar" indica alterações só neste aparelho. A sessão do Google dura cerca de uma hora; depois disso, toque no botão para entrar de novo.

## Limitações conhecidas

- No iPhone, com o app instalado na tela de início, a janela de login do Google pode não voltar ao app. Se acontecer, abra o endereço no Safari para sincronizar; os dados aparecem também no app instalado depois da próxima sincronização dele.
- A duração do interstício vem pré-configurada em 24 meses a partir de agosto de 2025. Confira na resolução de progressão da UFRPE e ajuste em Configurações.
- O código é público e não contém dados pessoais. Os dados entram pela sincronização com o Drive ou por "Restaurar backup" (Mais, Configurações).

## Atualizar o app

Substitua os arquivos no repositório pelo upload da nova versão e aumente o número da linha `const CACHE = 'gestor-docente-v1';` no `sw.js` (v2, v3...). O celular pega a versão nova na segunda abertura do app.
