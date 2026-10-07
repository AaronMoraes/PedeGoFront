'use strict';
/* Tela de login do admin. */

document.addEventListener('DOMContentLoaded', () => {
    try { localStorage.removeItem('adminToken'); } catch { /* versão antiga guardava aqui */ }

    if (Auth.valido()) { location.replace('PainelAdmin.html'); return; }

    const form = $('#form-login');
    const erro = $('#erro-login');
    const botao = $('#entrar');
    const senha = $('#senha');

    if (new URLSearchParams(location.search).get('expirou')) {
        erro.textContent = 'Sua sessão expirou. Entre novamente.';
        erro.hidden = false;
    }

    $('#ver-senha').addEventListener('click', (e) => {
        const mostrar = senha.type === 'password';
        senha.type = mostrar ? 'text' : 'password';
        e.currentTarget.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        erro.hidden = true;
        botao.disabled = true;
        botao.textContent = 'Entrando...';

        try {
            const dados = await api('/Admin/login', {
                method: 'POST',
                body: { usuario: $('#usuario').value.trim(), senha: senha.value }
            });
            Auth.salvar(dados.token);
            location.replace('PainelAdmin.html');
        } catch (e2) {
            erro.textContent = e2.message;
            erro.hidden = false;
            senha.value = '';
            senha.focus();
            botao.disabled = false;
            botao.textContent = 'Entrar';
        }
    });
});
