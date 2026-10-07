'use strict';
/* Painel do admin: gerencia lanches, bebidas e combos. A proteção real está na API (JWT + papel Admin). */

const ABAS = {
    lanche: { rotulo: 'Lanches', singular: 'lanche', icone: 'burger' },
    bebida: { rotulo: 'Bebidas', singular: 'bebida', icone: 'cup' },
    combo: { rotulo: 'Combos', singular: 'combo', icone: 'box' }
};

let produtos = [];
let aba = 'lanche';
let editandoId = null;

/** Qualquer 401 da API significa sessão inválida/expirada: volta para o login. */
async function chamar(caminho, opcoes = {}) {
    try {
        return await api(caminho, { ...opcoes, auth: true });
    } catch (erro) {
        if (erro.status === 401 || erro.status === 403) {
            Auth.sair();
            location.replace('Admin.html?expirou=1');
        }
        throw erro;
    }
}

function desenharAbas() {
    $('#abas').innerHTML = Object.entries(ABAS).map(([chave, a]) => {
        const n = produtos.filter((p) => p.categoria === chave).length;
        return `<button type="button" class="aba" role="tab" data-aba="${chave}" aria-selected="${chave === aba}">
                    ${icone(a.icone)}${a.rotulo}<span class="chip">${n}</span></button>`;
    }).join('');
    $('#novo-texto').textContent = `Novo ${ABAS[aba].singular}`;
}

function desenharLista() {
    const termo = $('#busca').value.trim().toLowerCase();
    const lista = produtos.filter((p) => p.categoria === aba && (!termo || p.nome.toLowerCase().includes(termo)));

    if (!lista.length) {
        $('#lista').innerHTML = `<div class="vazio"><h3>${termo ? 'Nada encontrado' : `Nenhum ${ABAS[aba].singular} cadastrado`}</h3>
            <p>${termo ? 'Tente outro nome.' : 'Clique em "Novo" para adicionar o primeiro.'}</p></div>`;
        return;
    }

    $('#lista').innerHTML = lista.map((p) => `
        <div class="linha${p.ativo ? '' : ' off'}" data-id="${p.id}">
            <img src="${esc(imgSrc(p.imagemUrl))}" alt="" loading="lazy">
            <div>
                <h3>${esc(p.nome)}
                    ${p.selo ? `<span class="chip chip-brasa">${esc(p.selo)}</span>` : ''}
                    ${p.naHome ? '<span class="chip">Na home</span>' : ''}
                    ${p.ativo ? '' : '<span class="chip chip-erro">Fora do ar</span>'}
                </h3>
                <p class="nota">${esc(p.descricao.split('\n').join(' · ')) || 'Sem descrição'}</p>
            </div>
            <span class="preco">${moeda(p.preco)}</span>
            <button type="button" class="chave" role="switch" data-alternar aria-checked="${p.ativo}"
                    aria-label="${p.ativo ? 'Tirar' : 'Colocar'} ${esc(p.nome)} ${p.ativo ? 'do' : 'no'} cardápio"></button>
            <div class="linha-acoes">
                <button type="button" class="btn btn-ghost btn-sm" data-editar>${icone('edit')}Editar</button>
                <button type="button" class="btn btn-perigo btn-sm" data-excluir aria-label="Excluir ${esc(p.nome)}">${icone('trash')}</button>
            </div>
        </div>`).join('');
}

function redesenhar() { desenharAbas(); desenharLista(); }

async function carregar() {
    try {
        produtos = await chamar('/Produtos/admin');
        redesenhar();
    } catch (erro) {
        $('#lista').innerHTML = `<div class="vazio"><h3>Não foi possível carregar</h3><p>${esc(erro.message)}</p>
            <button type="button" class="btn btn-ghost" id="recarregar">Tentar de novo</button></div>`;
        $('#recarregar').addEventListener('click', carregar);
    }
}

const paraDto = (p) => ({
    nome: p.nome, preco: p.preco, categoria: p.categoria, descricao: p.descricao,
    imagemUrl: p.imagemUrl, selo: p.selo, naHome: p.naHome, ativo: p.ativo
});

async function alternarAtivo(id) {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    try {
        const atualizado = await chamar(`/Produtos/${id}`, { method: 'PUT', body: { ...paraDto(p), ativo: !p.ativo } });
        produtos = produtos.map((x) => (x.id === id ? atualizado : x));
        redesenhar();
        toast(atualizado.ativo ? `${p.nome} voltou ao cardápio` : `${p.nome} saiu do cardápio`);
    } catch (erro) { toast(erro.message, 'erro'); }
}

async function excluir(id) {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    const sim = await confirmar({
        titulo: `Excluir "${p.nome}"?`,
        texto: 'O produto sai do cardápio. Se ele já foi vendido, é arquivado para manter o histórico dos pedidos.',
        botao: 'Excluir', perigo: true
    });
    if (!sim) return;
    try {
        const r = await chamar(`/Produtos/${id}`, { method: 'DELETE' });
        if (r.arquivado) produtos = produtos.map((x) => (x.id === id ? { ...x, ativo: false } : x));
        else produtos = produtos.filter((x) => x.id !== id);
        redesenhar();
        toast(r.message);
    } catch (erro) { toast(erro.message, 'erro'); }
}

/* ---------- formulário ---------- */
const dlg = () => $('#dlg-produto');
let imagemAtual = '';

function mostrarPreview(url) {
    imagemAtual = url;
    $('#preview').src = imgSrc(url);
    $('#remover-img').hidden = !url;
}

function abrirForm(produto) {
    editandoId = produto ? produto.id : null;
    $('#form-titulo').textContent = produto ? 'Editar produto' : `Novo ${ABAS[aba].singular}`;
    $('#f-nome').value = produto ? produto.nome : '';
    $('#f-preco').value = produto ? String(produto.preco).replace('.', ',') : '';
    $('#f-categoria').value = produto ? produto.categoria : aba;
    $('#f-selo').value = produto ? produto.selo : '';
    $('#f-descricao').value = produto ? produto.descricao : '';
    $('#f-home').checked = produto ? produto.naHome : false;
    $('#f-ativo').checked = produto ? produto.ativo : true;
    $('#f-arquivo').value = '';
    $('#erro-form').hidden = true;
    mostrarPreview(produto ? produto.imagemUrl : '');
    dlg().showModal();
    $('#f-nome').focus();
}

async function salvar(e) {
    e.preventDefault();
    const erroEl = $('#erro-form');
    erroEl.hidden = true;

    const bruto = $('#f-preco').value.trim();
    const preco = Number(bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto);
    if (!Number.isFinite(preco) || preco <= 0) {
        erroEl.textContent = 'Digite um preço válido, como 12,50.';
        erroEl.hidden = false;
        return;
    }

    const botao = $('#salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
        let imagemUrl = imagemAtual;
        const arquivo = $('#f-arquivo').files[0];
        if (arquivo) {
            const dados = new FormData();
            dados.append('arquivo', arquivo);
            imagemUrl = (await chamar('/Produtos/imagem', { method: 'POST', body: dados, formData: true })).url;
        }

        const corpo = {
            nome: $('#f-nome').value.trim(),
            preco,
            categoria: $('#f-categoria').value,
            descricao: $('#f-descricao').value,
            imagemUrl,
            selo: $('#f-selo').value.trim(),
            naHome: $('#f-home').checked,
            ativo: $('#f-ativo').checked
        };

        const salvo = editandoId
            ? await chamar(`/Produtos/${editandoId}`, { method: 'PUT', body: corpo })
            : await chamar('/Produtos', { method: 'POST', body: corpo });

        produtos = editandoId ? produtos.map((p) => (p.id === salvo.id ? salvo : p)) : [...produtos, salvo];
        aba = salvo.categoria;
        redesenhar();
        dlg().close();
        toast(editandoId ? 'Produto atualizado' : 'Produto adicionado');
    } catch (erro) {
        erroEl.textContent = erro.message;
        erroEl.hidden = false;
    } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.valido()) { Auth.sair(); location.replace('Admin.html'); return; }

    $('#usuario-logado').textContent = Auth.dados().name || 'Admin';
    $('#f-categoria').innerHTML = Object.entries(ABAS).map(([k, a]) => `<option value="${k}">${a.rotulo}</option>`).join('');

    $('#sair').addEventListener('click', () => { Auth.sair(); location.replace('Admin.html'); });
    $('#abas').addEventListener('click', (e) => {
        const b = e.target.closest('[data-aba]');
        if (b) { aba = b.dataset.aba; redesenhar(); }
    });
    $('#busca').addEventListener('input', desenharLista);
    $('#novo').addEventListener('click', () => abrirForm(null));

    $('#lista').addEventListener('click', (e) => {
        const linha = e.target.closest('.linha');
        const botao = e.target.closest('button');
        if (!linha || !botao) return;
        const id = Number(linha.dataset.id);
        if (botao.hasAttribute('data-editar')) abrirForm(produtos.find((p) => p.id === id));
        else if (botao.hasAttribute('data-excluir')) excluir(id);
        else if (botao.hasAttribute('data-alternar')) alternarAtivo(id);
    });

    $('#form-produto').addEventListener('submit', salvar);
    $('#cancelar').addEventListener('click', () => dlg().close());
    $('#fechar-form').addEventListener('click', () => dlg().close());
    $('#remover-img').addEventListener('click', () => { $('#f-arquivo').value = ''; mostrarPreview(''); });
    $('#f-arquivo').addEventListener('change', (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;
        if (arquivo.size > 3 * 1024 * 1024) {
            toast('A imagem deve ter no máximo 3 MB.', 'erro');
            e.target.value = '';
            return;
        }
        $('#preview').src = URL.createObjectURL(arquivo);
        $('#remover-img').hidden = false;
    });

    carregar();
});
