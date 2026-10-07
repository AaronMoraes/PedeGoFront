'use strict';
/* Página do carrinho: confere preços com a API, escolhe pagamento e finaliza o pedido. */

let formaPagamento = null;
let produtosApi = null;

const listaEl = () => $('#itens-carrinho');

function desenhar() {
    const itens = Carrinho.itens();
    const total = Carrinho.total();

    const n = Carrinho.contagem();
    $('#qtd-itens').textContent = `${n} ${n === 1 ? 'item' : 'itens'}`;
    $('#subtotal').textContent = moeda(total);
    $('#total').textContent = moeda(total);
    $('#finalizar').disabled = itens.length === 0;

    if (!itens.length) {
        listaEl().innerHTML = `
            <div class="vazio sem-borda">
                <h3>Seu carrinho está vazio</h3>
                <p>Escolha algo gostoso no cardápio para começar.</p>
                <a class="btn btn-primary" href="Lanches.html">Ver lanches</a>
            </div>`;
        return;
    }

    listaEl().innerHTML = itens.map((i) => `
        <div class="item-carrinho" data-id="${i.id}">
            <img src="${esc(imgSrc(i.imagem))}" alt="" loading="lazy">
            <div>
                <h3>${esc(i.nome)}</h3>
                <span class="un">${moeda(i.preco)} cada</span>
            </div>
            <div class="item-lado">
                <div class="stepper" role="group" aria-label="Quantidade de ${esc(i.nome)}">
                    <button type="button" data-menos aria-label="Diminuir">${icone('minus')}</button>
                    <output>${i.qtd}</output>
                    <button type="button" data-mais aria-label="Aumentar">${icone('plus')}</button>
                </div>
                <button type="button" class="link-remover" data-remover>${icone('trash')}Remover</button>
                <span class="preco">${moeda(i.preco * i.qtd)}</span>
            </div>
        </div>`).join('');
}

function mostrarAviso(id, texto) {
    const el = $(id);
    if (texto) el.textContent = texto;
    el.hidden = false;
}

async function sincronizar() {
    try {
        produtosApi = await api('/Produtos');
        const removidos = Carrinho.sincronizar(produtosApi);
        if (removidos) mostrarAviso('#aviso-sync', removidos === 1
            ? '1 item não está mais disponível e foi removido do seu pedido.'
            : `${removidos} itens não estão mais disponíveis e foram removidos do seu pedido.`);
    } catch {
        // Sem conexão agora: segue com os dados guardados. O servidor confere os preços de qualquer jeito.
    }
    desenhar();
}

async function finalizar() {
    const botao = $('#finalizar');
    $('#aviso-pagamento').hidden = true;
    $('#aviso-erro').hidden = true;

    if (!formaPagamento) { mostrarAviso('#aviso-pagamento'); return; }

    const itens = Carrinho.itens();
    if (!itens.length) return;

    botao.disabled = true;
    botao.textContent = 'Enviando pedido...';

    try {
        const pedido = await api('/Pedidos', {
            method: 'POST',
            body: {
                status: 'Pendente',
                formaPagamento,
                itens: itens.map((i) => ({ produtoId: i.id, quantidade: i.qtd }))
            }
        });
        Carrinho.limpar();
        desenhar();
        mostrarConfirmacao(pedido);
    } catch (erro) {
        mostrarAviso('#aviso-erro', erro.message);
        if (erro.status === 400) await sincronizar();
    } finally {
        botao.textContent = 'Finalizar pedido';
        botao.disabled = Carrinho.itens().length === 0;
    }
}

function mostrarConfirmacao(pedido) {
    const itens = pedido.itens || [];
    const total = itens.reduce((t, i) => t + i.preco * i.quantidade, 0);

    $('#confirmacao-detalhes').innerHTML = `
        <div class="recibo">
            <h3>${esc(LOJA.nome)}</h3>
            <p class="sub">Pedido nº ${esc(pedido.id)}</p>
            <hr>
            ${itens.map((i) => `
                <div class="recibo-linha"><span>${esc(i.quantidade)}x ${esc(i.produto?.nome ?? 'Item')}</span><strong>${moeda(i.preco * i.quantidade)}</strong></div>`).join('')}
            <hr>
            <div class="recibo-linha"><span>Pagamento</span><strong>${pedido.formaPagamento === 'pix' ? 'PIX' : 'Cartão'}</strong></div>
            <div class="recibo-linha recibo-total"><span>Total</span><strong>${moeda(total)}</strong></div>
        </div>`;
    $('#dlg-confirmacao').showModal();
}

document.addEventListener('DOMContentLoaded', () => {
    desenhar();
    sincronizar();

    listaEl().addEventListener('click', (e) => {
        const botao = e.target.closest('button');
        const linha = e.target.closest('.item-carrinho');
        if (!botao || !linha) return;
        const id = Number(linha.dataset.id);
        const atual = Carrinho.itens().find((i) => i.id === id);
        if (!atual) return;

        if (botao.hasAttribute('data-menos')) Carrinho.definirQtd(id, atual.qtd - 1);
        else if (botao.hasAttribute('data-mais')) Carrinho.definirQtd(id, atual.qtd + 1);
        else if (botao.hasAttribute('data-remover')) Carrinho.remover(id);
        desenhar();
    });

    $$('.pagamento').forEach((opcao) => opcao.addEventListener('click', () => {
        formaPagamento = opcao.dataset.metodo;
        $$('.pagamento').forEach((o) => o.setAttribute('aria-checked', String(o === opcao)));
        $('#aviso-pagamento').hidden = true;
    }));

    $('#finalizar').addEventListener('click', finalizar);
    $('#fechar-confirmacao').addEventListener('click', () => {
        $('#dlg-confirmacao').close();
        desenhar();
    });
});
