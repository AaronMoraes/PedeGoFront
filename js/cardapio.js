'use strict';
/* Páginas do cliente que listam produtos: Lanches, Combos, Bebidas e a Home. */

const MAX_POR_VEZ = 10;

/** Linhas curtas viram "+ item"; linhas longas viram um parágrafo. */
function descricaoHTML(texto) {
    const linhas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!linhas.length) return '';
    const curtas = linhas.filter((l) => l.length <= 46);
    const longas = linhas.filter((l) => l.length > 46);
    return (curtas.length ? `<ul class="itens">${curtas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '') +
           longas.map((l) => `<p class="nota">${esc(l)}</p>`).join('');
}

function cardHTML(p) {
    return `
        <article class="card" data-id="${p.id}">
            <div class="card-img">
                <img src="${esc(imgSrc(p.imagemUrl))}" alt="${esc(p.nome)}" loading="lazy" width="640" height="400">
                ${p.selo ? `<span class="chip chip-brasa">${esc(p.selo)}</span>` : ''}
            </div>
            <div class="tear" aria-hidden="true"></div>
            <div class="card-corpo">
                <h3 class="card-titulo">${esc(p.nome)}</h3>
                ${descricaoHTML(p.descricao)}
                <div class="card-rodape">
                    <span class="preco">${moeda(p.preco)}</span>
                    <div class="acao">
                        <div class="stepper" role="group" aria-label="Quantidade de ${esc(p.nome)}">
                            <button type="button" data-menos aria-label="Diminuir">${icone('minus')}</button>
                            <output data-qtd>1</output>
                            <button type="button" data-mais aria-label="Aumentar">${icone('plus')}</button>
                        </div>
                        <button type="button" class="btn btn-primary" data-add>Adicionar</button>
                    </div>
                </div>
            </div>
        </article>`;
}

function ligarCards(grade, produtos) {
    const porId = new Map(produtos.map((p) => [p.id, p]));
    if (grade.dataset.ligada) return;
    grade.dataset.ligada = '1';

    grade.addEventListener('click', (e) => {
        const botao = e.target.closest('button');
        const card = e.target.closest('.card');
        if (!botao || !card) return;

        const saida = $('[data-qtd]', card);
        let qtd = parseInt(saida.textContent, 10) || 1;

        if (botao.hasAttribute('data-menos')) saida.textContent = Math.max(1, qtd - 1);
        else if (botao.hasAttribute('data-mais')) saida.textContent = Math.min(MAX_POR_VEZ, qtd + 1);
        else if (botao.hasAttribute('data-add')) {
            const produto = porId.get(Number(card.dataset.id));
            if (!produto) return;
            Carrinho.adicionar(produto, qtd);
            Layout.atualizarBarra(true);
            toast(`${qtd}x ${produto.nome} no pedido`);
            saida.textContent = '1';
        }
    });
}

function estadoErro(mensagem) {
    return `<div class="vazio"><h3>Não conseguimos carregar o cardápio</h3><p>${esc(mensagem)}</p>
            <button type="button" class="btn btn-ghost" data-tentar>Tentar de novo</button></div>`;
}

async function paginaCategoria() {
    const { categoria } = document.body.dataset;
    const grade = $('#grade');
    const busca = $('#busca');
    const contagem = $('#contagem');

    async function carregar() {
        grade.setAttribute('aria-busy', 'true');
        grade.innerHTML = '<div class="card esqueleto"></div>'.repeat(6);
        try {
            const produtos = await api('/Produtos?categoria=' + encodeURIComponent(categoria));
            grade.removeAttribute('aria-busy');
            ligarCards(grade, produtos);
            desenhar(produtos);
            busca.oninput = () => desenhar(produtos);
            busca.disabled = false;
        } catch (erro) {
            grade.removeAttribute('aria-busy');
            grade.innerHTML = estadoErro(erro.message);
            $('[data-tentar]', grade).addEventListener('click', carregar);
        }
    }

    function desenhar(produtos) {
        const termo = busca.value.trim().toLowerCase();
        const lista = produtos.filter((p) => !termo || `${p.nome} ${p.descricao}`.toLowerCase().includes(termo));
        contagem.textContent = `${lista.length} ${lista.length === 1 ? 'opção' : 'opções'}`;
        if (!lista.length) {
            grade.innerHTML = termo
                ? `<div class="vazio"><h3>Nada encontrado para "${esc(busca.value.trim())}"</h3><p>Tente outro nome.</p></div>`
                : '<div class="vazio"><h3>Nenhum item disponível agora</h3><p>Volte em instantes, estamos atualizando o cardápio.</p></div>';
            return;
        }
        grade.innerHTML = lista.map(cardHTML).join('');
    }

    busca.disabled = true;
    carregar();
}

async function paginaHome() {
    const grade = $('#grade');
    const contagens = { lanche: 0, bebida: 0, combo: 0 };

    grade.innerHTML = '<div class="card esqueleto"></div>'.repeat(3);
    try {
        const produtos = await api('/Produtos');
        produtos.forEach((p) => { if (p.categoria in contagens) contagens[p.categoria]++; });
        $$('[data-conta]').forEach((el) => {
            const n = contagens[el.dataset.conta] || 0;
            el.textContent = n ? `${n} ${n === 1 ? 'opção' : 'opções'}` : 'Em breve';
        });

        const destaques = produtos.filter((p) => p.naHome).slice(0, 6);
        if (!destaques.length) { $('#secao-destaques').hidden = true; return; }
        ligarCards(grade, destaques);
        grade.innerHTML = destaques.map(cardHTML).join('');
    } catch (erro) {
        grade.innerHTML = estadoErro(erro.message);
        $('[data-tentar]', grade).addEventListener('click', paginaHome);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.pagina === 'home') paginaHome();
    else paginaCategoria();
});
