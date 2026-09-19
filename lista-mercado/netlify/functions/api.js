const { getStore } = require('@netlify/blobs');

const CATEGORIAS_PADRAO = [
  'Hortifruti', 'Açougue e Peixaria', 'Padaria', 'Frios e Laticínios',
  'Mercearia', 'Bebidas', 'Congelados', 'Limpeza',
  'Higiene e Farmácia', 'Bebês e Infantil', 'Pet', 'Bazar e Utilidades', 'Outros'
];
const CHAVE_ESTADO = 'estado';

function dataDeHoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function normaliza(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function estadoInicial() {
  return {
    categorias: CATEGORIAS_PADRAO.slice(),
    listaAtualId: dataDeHoje(),
    itens: [],
    catalogo: {}
  };
}

function resposta(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  const store = getStore('lista-mercado');

  let estado = await store.get(CHAVE_ESTADO, { type: 'json' });
  if (!estado) {
    estado = estadoInicial();
    await store.setJSON(CHAVE_ESTADO, estado);
  }

  if (event.httpMethod === 'GET') {
    return resposta(200, estado);
  }

  if (event.httpMethod !== 'POST') {
    return resposta(405, { erro: 'método não suportado' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return resposta(400, { erro: 'corpo inválido' });
  }

  const { action, payload } = body;

  switch (action) {
    case 'add-item': {
      const nome = (payload && payload.nome || '').trim();
      if (!nome) return resposta(400, { erro: 'nome obrigatório' });
      const categoria = (payload && payload.categoria) || estado.categorias[estado.categorias.length - 1];
      const item = {
        id: (Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
        nome,
        categoria,
        comprado: false,
        listaId: estado.listaAtualId,
        criadoPor: (payload && payload.criadoPor) || null,
        criadoEm: Date.now()
      };
      estado.itens.push(item);

      const chave = normaliza(nome);
      const existente = estado.catalogo[chave];
      estado.catalogo[chave] = {
        nome,
        categoria,
        vezes: (existente && existente.vezes || 0) + 1,
        ultimaVez: Date.now()
      };
      break;
    }
    case 'toggle-item': {
      const item = estado.itens.find(i => i.id === (payload && payload.id));
      if (item) item.comprado = !item.comprado;
      break;
    }
    case 'delete-item': {
      estado.itens = estado.itens.filter(i => i.id !== (payload && payload.id));
      break;
    }
    case 'nova-lista': {
      let novoId = dataDeHoje();
      if (novoId === estado.listaAtualId || estado.itens.some(i => i.listaId === novoId)) {
        let n = 2;
        let candidato = dataDeHoje() + '-#' + n;
        while (estado.itens.some(i => i.listaId === candidato)) {
          n++;
          candidato = dataDeHoje() + '-#' + n;
        }
        novoId = candidato;
      }
      estado.listaAtualId = novoId;
      break;
    }
    case 'salvar-categorias': {
      const lista = payload && payload.lista;
      if (Array.isArray(lista) && lista.length) estado.categorias = lista;
      break;
    }
    default:
      return resposta(400, { erro: 'ação desconhecida' });
  }

  await store.setJSON(CHAVE_ESTADO, estado);
  return resposta(200, estado);
};
