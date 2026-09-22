const { getStore } = require('@netlify/blobs');

const CATEGORIAS_PADRAO = [
  'Hortifruti', 'Açougue e Peixaria', 'Padaria', 'Frios e Laticínios',
  'Mercearia', 'Bebidas', 'Congelados', 'Limpeza',
  'Higiene e Farmácia', 'Bebês e Infantil', 'Pet', 'Bazar e Utilidades', 'Outros'
];
const CHAVE_ESTADO = 'estado';

const SEMENTE_ID = '2026-09-18';
const SEMENTE_ITENS = [
  ['Grão de bico', 'Mercearia'],
  ['Tahine', 'Mercearia'],
  ['Biscoitos Juju', 'Pet'],
  ['Palmito', 'Mercearia'],
  ['Queijo mussarela', 'Frios e Laticínios'],
  ['Mussarela búfala', 'Frios e Laticínios'],
  ['Requeijão', 'Frios e Laticínios'],
  ['Tapioca', 'Mercearia'],
  ['Iogurte', 'Frios e Laticínios'],
  ['Cottage', 'Frios e Laticínios'],
  ['Ovos', 'Frios e Laticínios'],
  ['Bolachinhas FIT', 'Mercearia'],
  ['Barrinha de castanha', 'Mercearia'],
  ['Formula aptanutri 1 a 3 anos', 'Bebês e Infantil'],
  ['Magic toast', 'Padaria'],
  ['Água com gás', 'Bebidas'],
  ['Água de coco', 'Bebidas']
];

function dataDeHoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function normaliza(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function proximoIdLivre(estado) {
  let novoId = dataDeHoje();
  if (estado.itens.some(i => i.listaId === novoId) || estado.listas[novoId]) {
    let n = 2;
    let candidato = dataDeHoje() + '-#' + n;
    while (estado.itens.some(i => i.listaId === candidato) || estado.listas[candidato]) {
      n++;
      candidato = dataDeHoje() + '-#' + n;
    }
    novoId = candidato;
  }
  return novoId;
}

function estadoInicial() {
  const id = dataDeHoje();
  return {
    categorias: CATEGORIAS_PADRAO.slice(),
    listaAtualId: id,
    listas: { [id]: { criadaEm: Date.now(), status: 'aberta', fechadaEm: null, completa: null } },
    itens: [],
    catalogo: {},
    historicoImportado: false
  };
}

function normalizarEstado(estado) {
  if (!estado.listas) estado.listas = {};
  if (!estado.listas[estado.listaAtualId]) {
    estado.listas[estado.listaAtualId] = { criadaEm: Date.now(), status: 'aberta', fechadaEm: null, completa: null };
  }
  if (typeof estado.historicoImportado !== 'boolean') estado.historicoImportado = false;
  return estado;
}

function resposta(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  try {
    return await processar(event);
  } catch (e) {
    return resposta(500, { erro: 'Falha no servidor: ' + (e && e.message ? e.message : String(e)) });
  }
};

async function processar(event) {
  const store = getStore('lista-mercado');

  let estado = await store.get(CHAVE_ESTADO, { type: 'json' });
  if (!estado) {
    estado = estadoInicial();
    await store.setJSON(CHAVE_ESTADO, estado);
  }
  estado = normalizarEstado(estado);

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
    case 'fechar-lista': {
      const idAtual = estado.listaAtualId;
      const completa = !!(payload && payload.completa);
      estado.listas[idAtual] = {
        ...estado.listas[idAtual],
        status: 'fechada',
        fechadaEm: Date.now(),
        completa
      };
      const novoId = proximoIdLivre(estado);
      if (!completa) {
        estado.itens.forEach(i => {
          if (i.listaId === idAtual && !i.comprado) i.listaId = novoId;
        });
      }
      estado.listaAtualId = novoId;
      estado.listas[novoId] = { criadaEm: Date.now(), status: 'aberta', fechadaEm: null, completa: null };
      break;
    }
    case 'reabrir-lista': {
      const id = payload && payload.id;
      if (!id || !estado.listas[id]) return resposta(400, { erro: 'lista não encontrada' });
      estado.listas[id] = { ...estado.listas[id], status: 'aberta', fechadaEm: null, completa: null };
      estado.listaAtualId = id;
      break;
    }
    case 'salvar-categorias': {
      const lista = payload && payload.lista;
      if (Array.isArray(lista) && lista.length) estado.categorias = lista;
      break;
    }
    case 'importar-historico-semente': {
      if (estado.historicoImportado) break;
      const base = Date.parse(SEMENTE_ID + 'T12:00:00') || Date.now();
      SEMENTE_ITENS.forEach(([nome, categoria], idx) => {
        estado.itens.push({
          id: SEMENTE_ID + '-seed-' + idx,
          nome,
          categoria,
          comprado: true,
          listaId: SEMENTE_ID,
          criadoPor: 'Gabriela',
          criadoEm: base + idx
        });
        const chave = normaliza(nome);
        const existente = estado.catalogo[chave];
        estado.catalogo[chave] = {
          nome,
          categoria,
          vezes: (existente && existente.vezes || 0) + 1,
          ultimaVez: base + idx
        };
      });
      estado.listas[SEMENTE_ID] = { criadaEm: base, status: 'fechada', fechadaEm: base, completa: true };
      estado.historicoImportado = true;
      break;
    }
    default:
      return resposta(400, { erro: 'ação desconhecida' });
  }

  await store.setJSON(CHAVE_ESTADO, estado);
  return resposta(200, estado);
}
