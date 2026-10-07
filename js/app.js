'use strict';
/* PedeGo — núcleo compartilhado: utilidades, API, login do admin, carrinho e layout. */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Escapa texto antes de colocar em innerHTML. Use SEMPRE para dados vindos da API ou do usuário. */
const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const moeda = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#1D212C"/>' +
    '<g fill="none" stroke="#3A4152" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M240 200a80 56 0 0 1 160 0z"/><path d="M228 226h184"/><path d="M240 248l8 26h144l8-26"/></g></svg>');

/** Converte o caminho salvo no banco em uma URL de imagem utilizável. */
function imgSrc(url) {
    if (typeof url !== 'string' || !url) return PLACEHOLDER;
    if (url.startsWith('/uploads/')) return API_ORIGIN + url;
    if (url.startsWith('imagens/')) return encodeURI(url);
    return PLACEHOLDER;
}

/* ---------- ícones ---------- */
const ICONES = {
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6"/>',
    burger: '<path d="M4 11a8 6 0 0 1 16 0z"/><path d="M3 15h18"/><path d="M5 18.5h14"/>',
    cup: '<path d="M6 3h12l-1.4 16.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z"/><path d="M6.6 9h10.8"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    pix: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v6h-6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.5v.01"/>'
};
const icone = (nome) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

/* ---------- API ---------- */
class ApiError extends Error {
    constructor(mensagem, status) { super(mensagem); this.status = status; }
}

async function api(caminho, { method = 'GET', body, auth = false, formData = false } = {}) {
    const headers = {};
    if (auth) headers.Authorization = 'Bearer ' + (Auth.token() || '');
    if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';

    let resposta;
    try {
        resposta = await fetch(API_URL + caminho, {
            method,
            headers,
            body: body === undefined ? undefined : (formData ? body : JSON.stringify(body))
        });
    } catch {
        throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.', 0);
    }

    let dados = null;
    const texto = await resposta.text();
    if (texto) { try { dados = JSON.parse(texto); } catch { /* resposta não-JSON */ } }

    if (!resposta.ok) {
        const padrao = resposta.status === 429
            ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
            : 'Algo deu errado. Tente novamente.';
        throw new ApiError((dados && dados.message) || padrao, resposta.status);
    }
    return dados;
}

/* ---------- login do admin (token só vive enquanto a aba estiver aberta) ---------- */
const Auth = {
    chave: 'adminToken',
    token() { try { return sessionStorage.getItem(this.chave); } catch { return null; } },
    salvar(token) { sessionStorage.setItem(this.chave, token); },
    sair() { try { sessionStorage.removeItem(this.chave); } catch { /* ignora */ } },
    dados() {
        const token = this.token();
        if (!token) return null;
        try {
            const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch { return null; }
    },
    /** Apenas conveniência de interface. Quem realmente protege é a API (401 sem token válido). */
    valido() {
        const d = this.dados();
        return !!d && d.role === 'Admin' && d.exp * 1000 > Date.now();
    }
};

/* ---------- carrinho ---------- */
const Carrinho = {
    chave: 'cart',
    maxPorItem: 99,

    itens() {
        let bruto = [];
        try { bruto = JSON.parse(localStorage.getItem(this.chave)) || []; } catch { /* carrinho corrompido */ }
        if (!Array.isArray(bruto)) return [];
        return bruto
            .map((i) => ({
                id: Number(i.id),
                nome: String(i.nome ?? i.name ?? ''),
                preco: Number(i.preco ?? i.price),
                imagem: String(i.imagem ?? ''),
                qtd: parseInt(i.qtd ?? i.quantity, 10)
            }))
            .filter((i) => Number.isInteger(i.id) && i.id > 0 && Number.isFinite(i.preco) && i.qtd > 0)
            .map((i) => ({ ...i, qtd: Math.min(i.qtd, this.maxPorItem) }));
    },
    salvar(itens) {
        try { localStorage.setItem(this.chave, JSON.stringify(itens)); } catch { /* sem espaço/privado */ }
        Layout.atualizarBarra();
        document.dispatchEvent(new CustomEvent('carrinho:mudou'));
    },
    adicionar(produto, qtd) {
        const itens = this.itens();
        const existente = itens.find((i) => i.id === produto.id);
        if (existente) existente.qtd = Math.min(existente.qtd + qtd, this.maxPorItem);
        else itens.push({ id: produto.id, nome: produto.nome, preco: produto.preco, imagem: produto.imagemUrl || '', qtd });
        this.salvar(itens);
    },
    definirQtd(id, qtd) {
        const itens = this.itens()
            .map((i) => (i.id === id ? { ...i, qtd: Math.min(qtd, this.maxPorItem) } : i))
            .filter((i) => i.qtd > 0);
        this.salvar(itens);
    },
    remover(id) { this.salvar(this.itens().filter((i) => i.id !== id)); },
    limpar() { this.salvar([]); },
    contagem() { return this.itens().reduce((t, i) => t + i.qtd, 0); },
    total() { return this.itens().reduce((t, i) => t + i.preco * i.qtd, 0); },

    /** Atualiza preços/nomes pelo que está no servidor e remove itens que saíram do cardápio. */
    sincronizar(produtos) {
        const porId = new Map(produtos.map((p) => [p.id, p]));
        let removidos = 0;
        const itens = [];
        for (const i of this.itens()) {
            const p = porId.get(i.id);
            if (!p) { removidos++; continue; }
            itens.push({ ...i, nome: p.nome, preco: p.preco, imagem: p.imagemUrl || '' });
        }
        this.salvar(itens);
        return removidos;
    }
};

/* ---------- avisos e confirmação ---------- */
function toast(mensagem, tipo = 'ok') {
    let area = $('#toasts');
    if (!area) {
        area = document.createElement('div');
        area.id = 'toasts';
        area.setAttribute('aria-live', 'polite');
        document.body.appendChild(area);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
    el.innerHTML = icone(tipo === 'erro' ? 'alert' : 'check') + `<span>${esc(mensagem)}</span>`;
    area.appendChild(el);
    setTimeout(() => el.remove(), tipo === 'erro' ? 6000 : 3200);
}

function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
    return new Promise((resolver) => {
        const dlg = document.createElement('dialog');
        dlg.innerHTML = `
            <div class="dlg-corpo">
                <h2>${esc(titulo)}</h2>
                <p class="nota">${esc(texto)}</p>
                <div class="dlg-acoes">
                    <button type="button" class="btn btn-ghost" data-nao>Cancelar</button>
                    <button type="button" class="btn ${perigo ? 'btn-perigo' : 'btn-primary'}" data-sim>${esc(botao)}</button>
                </div>
            </div>`;
        document.body.appendChild(dlg);
        const fim = (valor) => { dlg.close(); dlg.remove(); resolver(valor); };
        $('[data-sim]', dlg).addEventListener('click', () => fim(true));
        $('[data-nao]', dlg).addEventListener('click', () => fim(false));
        dlg.addEventListener('cancel', (e) => { e.preventDefault(); fim(false); });
        dlg.showModal();
        $('[data-nao]', dlg).focus();
    });
}

/* ---------- layout (topo, rodapé e barra do pedido) ---------- */
const Layout = {
    montar() {
        const pagina = document.body.dataset.pagina || '';
        document.title = document.title.replace('PedeGo', LOJA.nome);
        $$('[data-loja-nome]').forEach((el) => { el.textContent = LOJA.nome; });
        $$('[data-icone]').forEach((el) => el.insertAdjacentHTML('afterbegin', icone(el.dataset.icone)));
        if (document.body.hasAttribute('data-sem-layout')) return;

        const links = [
            ['home', 'Podrao.html', 'Início'],
            ['lanches', 'Lanches.html', 'Lanches'],
            ['combos', 'Combos.html', 'Combos'],
            ['bebidas', 'Bebidas.html', 'Bebidas']
        ].map(([id, href, texto]) =>
            `<a href="${href}"${id === pagina ? ' aria-current="page"' : ''}>${texto}</a>`).join('');

        const topo = $('#topo');
        if (topo) {
            topo.className = 'topo';
            topo.innerHTML = `
                <div class="wrap topo-in">
                    <a class="marca" href="Podrao.html"><span class="marca-logo">${icone('burger')}</span>${esc(LOJA.nome)}</a>
                    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu">${icone('menu')}</button>
                    <nav class="menu" id="menu" aria-label="Principal">${links}</nav>
                    <a class="carrinho-link" href="Carrinho.html" aria-label="Abrir carrinho">${icone('cart')}<span class="contador" data-contador>0</span></a>
                </div>`;
            const botao = $('.nav-toggle', topo);
            botao.addEventListener('click', () => {
                const aberto = topo.classList.toggle('aberto');
                botao.setAttribute('aria-expanded', String(aberto));
            });
        }

        const rodape = $('#rodape');
        if (rodape) {
            const item = (ic, texto) => texto ? `<li>${icone(ic)}<span>${esc(texto)}</span></li>` : '';
            rodape.className = 'rodape';
            rodape.innerHTML = `
                <div class="wrap">
                    <div class="rodape-grade">
                        <div>
                            <a class="marca" href="Podrao.html"><span class="marca-logo">${icone('burger')}</span>${esc(LOJA.nome)}</a>
                            <p class="desc">${esc(LOJA.slogan)}</p>
                        </div>
                        <div>
                            <h4>Funcionamento</h4>
                            <ul>${(LOJA.horarios || []).map((h) => item('clock', h)).join('')}</ul>
                        </div>
                        <div>
                            <h4>Contato</h4>
                            <ul>${item('phone', LOJA.telefone)}${item('pin', LOJA.endereco)}${item('mail', LOJA.email)}</ul>
                        </div>
                    </div>
                    <div class="rodape-fim"><span>&copy; ${new Date().getFullYear()} ${esc(LOJA.nome)}. Todos os direitos reservados.</span></div>
                </div>`;
        }

        if (document.body.dataset.barra !== 'off') {
            const barra = document.createElement('a');
            barra.href = 'Carrinho.html';
            barra.className = 'barra-pedido';
            barra.id = 'barra-pedido';
            barra.hidden = true;
            barra.innerHTML = `
                <span class="ic">${icone('cart')}<span class="contador" data-contador>0</span></span>
                <span><small>Seu pedido</small><strong data-total>R$ 0,00</strong></span>
                <span class="ir">Ver pedido</span>`;
            document.body.appendChild(barra);
        }
        this.atualizarBarra();
    },

    atualizarBarra(pulsar = false) {
        const qtd = Carrinho.contagem();
        $$('[data-contador]').forEach((el) => { el.textContent = qtd; });
        $$('.carrinho-link').forEach((el) => el.setAttribute('aria-label', `Abrir carrinho, ${qtd} ${qtd === 1 ? 'item' : 'itens'}`));
        const barra = $('#barra-pedido');
        if (!barra) return;
        barra.hidden = qtd === 0;
        $('[data-total]', barra).textContent = moeda(Carrinho.total());
        if (pulsar) {
            barra.classList.remove('pulso');
            void barra.offsetWidth;
            barra.classList.add('pulso');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Layout.montar());
