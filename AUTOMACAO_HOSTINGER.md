# 🚀 Automação de Deploy na Hostinger

Criamos 3 formas automáticas para você publicar o seu projeto na Hostinger sem esforço manual:

---

## ⚡ OPÇÃO 1: Deploy com 1 Comando pelo Terminal (FTP Automático)

Você pode enviar as alterações diretamente do seu terminal para a Hostinger sem precisar abrir o painel.

### Como usar:
1. Adicione as credenciais de FTP da sua Hostinger no seu arquivo `.env`:
   ```env
   # Use o IP do FTP da Hostinger (ex: 147.93.38.246) ou o host dedicado
   HOSTINGER_FTP_HOST=147.93.38.246
   HOSTINGER_FTP_USER=seu-usuario-ftp
   HOSTINGER_FTP_PASS=sua-senha-ftp
   ```
2. No terminal, execute:
   ```bash
   bun run deploy:hostinger
   ```
   *(ou `npm run deploy:hostinger`)*

O script vai:
- Compilar o projeto automaticamente para produção (`bun run build`).
- Conectar no servidor da Hostinger.
- Fazer o upload de todos os arquivos diretamente para a pasta `/public_html`.

---

## 🗜️ OPÇÃO 2: Arquivo ZIP Pronto para Upload Imediato

Já geramos o arquivo compactado com tudo o que a Hostinger precisa:
📁 `hostinger_deploy.zip` (na raiz do projeto).

Sempre que quiser atualizar o pacote ZIP com um único comando, execute:
```bash
bun run pack:hostinger
```
*(ou `npm run pack:hostinger`)*

### Para enviar:
1. Acesse o **Gerenciador de Arquivos** no hPanel da Hostinger.
2. Entre na pasta `public_html`.
3. Arraste o arquivo `hostinger_deploy.zip` e clique em **Extrair**.

---

## 🔄 OPÇÃO 3: Deploy 100% Automático a cada `git push` (GitHub Actions)

O arquivo de automação do GitHub já está configurado em:
📁 `.github/workflows/deploy-hostinger.yml`

### Como ativar:
1. No seu repositório do GitHub, vá em **Settings** > **Secrets and variables** > **Actions**.
2. Adicione os seguintes segredos (Secrets):
   - `HOSTINGER_FTP_HOST`: Endereço FTP fornecido pela Hostinger.
   - `HOSTINGER_FTP_USER`: Usuário FTP.
   - `HOSTINGER_FTP_PASSWORD`: Senha do FTP.
3. Pronto! A cada `git push` na branch `main`, o GitHub fará a compilação e o upload automático para a Hostinger sem você precisar fazer nada.
