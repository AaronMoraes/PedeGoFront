# PedeGo, Front-end

Site de pedidos (HTML, CSS e JS puros, sem build). O cardápio vem da API.

## Rodar na sua máquina

1. Suba a API (veja o README da API). Ela fica em http://localhost:5000.
2. Nesta pasta: `python -m http.server 5500` (ou a extensão Live Server do VS Code).
3. Abra http://localhost:5500/Podrao.html . Não abra o arquivo com duplo clique (file://).

O `config.js` usa a API local automaticamente quando o endereço é localhost.

## Páginas

| Arquivo | Para quê |
|---|---|
| `Podrao.html` | Home |
| `Lanches.html`, `Combos.html`, `Bebidas.html` | Cardápio |
| `Carrinho.html` | Carrinho e finalização |
| `Admin.html` | Login do administrador (não há link no menu público) |
| `PainelAdmin.html` | Painel: cadastrar, editar e excluir produtos |

## Publicar (produção)

1. Em `config.js`, troque `API_PRODUCAO` pelo endereço real da API (terminando em `/api`) e ajuste os dados da `LOJA`.
2. Hospede a pasta em qualquer servidor de arquivos estáticos (Netlify, Cloudflare Pages, Nginx...).
3. Na API, defina `ALLOWED_ORIGINS` com o endereço do site (https://seusite.com.br).
4. Se usar o Nginx deste projeto: `docker build -t pedego-web .` e
   `docker run -p 80:80 -e API_ORIGIN=https://api.seudominio.com.br pedego-web`.
   Ele já envia os cabeçalhos de segurança e a política CSP. Se usar outra hospedagem, configure
   uma CSP equivalente (veja `nginx/default.conf.template`). O site não tem scripts nem estilos embutidos.
5. Use sempre HTTPS.

## Observações de segurança

- O botão do painel só esconde a tela. Quem protege os dados é a API (token JWT + papel Admin).
- O token do admin fica em `sessionStorage` e some ao fechar a aba.
