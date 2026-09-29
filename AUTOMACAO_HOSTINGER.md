# 🚀 Automação de Deploy na Hostinger (mídia.OS)

O sistema de deploy automático foi totalmente otimizado e corrigido para funcionar de forma confiável e em poucos segundos.

---

## ⚡ Como fazer o Deploy com 1 Comando

Para compilar e publicar tudo na Hostinger automaticamente:

```bash
npm run deploy:hostinger
```
*(ou se você usar bun: `bun run deploy:hostinger`)*

### O que esse comando faz:
1. **Compilação**: Compila a aplicação para produção com o preset correto (`node-server`) para o LiteSpeed/Passenger Node.js 22 da Hostinger.
2. **Compactação Instantânea**: Empacota o servidor SSR, assets estáticos, schema do banco e `.env` em um único arquivo `.zip` otimizado (`hostinger_deploy.zip`).
3. **Upload Contínuo via FTP**: Envia o pacote completo em poucos segundos diretamente para o servidor.
4. **Extração Atômica e Reinício**: O servidor descompacta os arquivos nos diretórios corretos (`public_html` e `/hbuilds/current/nodejs/`) e reinicia o processo Passenger Node.js automaticamente.
5. **Verificação no Ar**: Testa a rota pública e confirma o status `HTTP 200 OK`.

---

## ⚡ Deploy Rápido (Se o build já estiver feito)

Se você já rodou o build e quer apenas enviar para a Hostinger sem recompilar:

```bash
node scripts/deploy-hostinger.mjs --skip-build
```
*(Leva menos de 25 segundos!)*

---

## 🗜️ Gerar Apenas o Arquivo ZIP para Envio Manual

Caso prefira fazer o upload manualmente pelo Gerenciador de Arquivos do hPanel:

```bash
npm run pack:hostinger
```

Isso gera o arquivo `hostinger_deploy.zip` na raiz do projeto. Basta arrastar para a pasta `public_html` no Gerenciador de Arquivos da Hostinger e clicar em **Extrair**.

---

## 🔄 Deploy 100% Automático via GitHub (CI/CD)

O fluxo do GitHub Actions está configurado em `.github/workflows/deploy-hostinger.yml`.

### Como ativar:
1. No seu repositório no GitHub, vá em **Settings** > **Secrets and variables** > **Actions**.
2. Adicione os Secrets:
   - `HOSTINGER_FTP_HOST`: IP do FTP (ex: `147.93.38.246`)
   - `HOSTINGER_FTP_USER`: Usuário do FTP (ex: `u233352823.diretoria`)
   - `HOSTINGER_FTP_PASSWORD`: Senha do FTP
3. Toda vez que fizer `git push` na branch `main`, o GitHub compilará e publicará automaticamente na Hostinger.
