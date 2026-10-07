/* ===== Configuração do site: é só aqui que você mexe para cada cliente ===== */

// Endereço da API em PRODUÇÃO (deve terminar em /api). TROQUE antes de publicar.
const API_PRODUCAO = 'https://api.seudominio.com.br/api';

// Endereço da API rodando na sua máquina (dotnet run).
const API_LOCAL = 'http://localhost:5000/api';

// Em localhost usa a API local; em qualquer outro endereço usa a de produção.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? API_LOCAL : API_PRODUCAO;

// Dados da loja (aparecem no rodapé). Deixe '' para esconder o item.
const LOJA = {
    nome: 'PedeGo',
    slogan: 'Seu pedido, do seu jeito. Escolha seus favoritos e aproveite.',
    telefone: '(11) 98765-4321',
    endereco: 'Rua do Podrão, 123 - Centro',
    email: 'contato@pedego.com.br',
    horarios: [
        'Segunda a Sexta: 18h - 23h',
        'Sábado: 17h - 00h',
        'Domingo: 17h - 00h'
    ]
};
