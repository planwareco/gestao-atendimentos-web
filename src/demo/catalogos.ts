import type { CamposExtras, CamposPersonalizados, Segmento } from '@/api/types';

/** Tudo o que muda de um segmento para outro na empresa de exemplo. */
export interface SegmentoDemo {
  empresa: string;
  nome: string;
  icone: string;
  resumo: string;
  camposPersonalizados: CamposPersonalizados;
  servicos: { nome: string; categoria: string; valorCentavos: number; duracaoMinutos: number; descricao?: string }[];
  profissionais: { nome: string; cor: string; comissaoBps: number; servicos?: number[] }[];
  /** Gera os campos extras do cliente (ex.: nome do pet). */
  extrasCliente?: (i: number) => CamposExtras;
  observacoes: string[];
}

const PETS = ['Thor', 'Mel', 'Luna', 'Bob', 'Pipoca', 'Nina', 'Max', 'Amora', 'Fred', 'Belinha', 'Tobias', 'Cacau', 'Simba', 'Lola', 'Bento', 'Maya'];
const RACAS = ['Shih-tzu', 'SRD', 'Poodle', 'Lhasa Apso', 'Golden', 'Yorkshire', 'Spitz', 'Persa', 'Siamês', 'Maltês'];

export const CATALOGOS: Record<Segmento, SegmentoDemo> = {
  SALAO_BELEZA: {
    empresa: 'Studio Bella Rosa',
    nome: 'Salão de beleza',
    icone: 'bx-spa',
    resumo: 'Corte, escova, coloração e unhas',
    camposPersonalizados: {
      rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Atendimento' },
      cliente: [{ chave: 'tipoCabelo', rotulo: 'Tipo de cabelo', tipo: 'selecao', obrigatorio: false, opcoes: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'] }],
    },
    servicos: [
      { nome: 'Corte feminino', categoria: 'Cabelo', valorCentavos: 8000, duracaoMinutos: 60 },
      { nome: 'Escova modelada', categoria: 'Cabelo', valorCentavos: 6000, duracaoMinutos: 45 },
      { nome: 'Coloração completa', categoria: 'Cabelo', valorCentavos: 18000, duracaoMinutos: 120 },
      { nome: 'Hidratação profunda', categoria: 'Tratamento', valorCentavos: 9000, duracaoMinutos: 45 },
      { nome: 'Progressiva', categoria: 'Tratamento', valorCentavos: 25000, duracaoMinutos: 150 },
      { nome: 'Manicure', categoria: 'Unhas', valorCentavos: 3500, duracaoMinutos: 40 },
      { nome: 'Pedicure', categoria: 'Unhas', valorCentavos: 4000, duracaoMinutos: 45 },
      { nome: 'Design de sobrancelha', categoria: 'Sobrancelha', valorCentavos: 4500, duracaoMinutos: 30 },
    ],
    profissionais: [
      { nome: 'Juliana Prado', cor: '#2F6BFF', comissaoBps: 4000, servicos: [0, 1, 2, 3, 4] },
      { nome: 'Camila Rocha', cor: '#E0457B', comissaoBps: 3500, servicos: [0, 1, 3, 7] },
      { nome: 'Patrícia Lima', cor: '#12805C', comissaoBps: 3000, servicos: [5, 6, 7] },
    ],
    extrasCliente: (i) => ({ tipoCabelo: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'][i % 4] }),
    observacoes: ['Prefere água morna.', 'Alergia a amônia.', 'Gosta de café sem açúcar.'],
  },
  BARBEARIA: {
    empresa: 'Barbearia Navalha de Ouro',
    nome: 'Barbearia',
    icone: 'bx-cut',
    resumo: 'Corte, barba e combo',
    camposPersonalizados: { rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Atendimento' } },
    servicos: [
      { nome: 'Corte masculino', categoria: 'Cabelo', valorCentavos: 4500, duracaoMinutos: 40 },
      { nome: 'Barba completa', categoria: 'Barba', valorCentavos: 3500, duracaoMinutos: 30 },
      { nome: 'Corte + barba', categoria: 'Combo', valorCentavos: 7000, duracaoMinutos: 60 },
      { nome: 'Pezinho', categoria: 'Cabelo', valorCentavos: 1500, duracaoMinutos: 15 },
      { nome: 'Sobrancelha na navalha', categoria: 'Barba', valorCentavos: 1500, duracaoMinutos: 15 },
      { nome: 'Pigmentação de barba', categoria: 'Barba', valorCentavos: 5000, duracaoMinutos: 45 },
      { nome: 'Corte infantil', categoria: 'Cabelo', valorCentavos: 3500, duracaoMinutos: 30 },
    ],
    profissionais: [
      { nome: 'Rafael Souza', cor: '#2F6BFF', comissaoBps: 5000 },
      { nome: 'Diego Martins', cor: '#D97706', comissaoBps: 4500 },
      { nome: 'Lucas Almeida', cor: '#12805C', comissaoBps: 4000 },
    ],
    observacoes: ['Degradê baixo, máquina 1.', 'Não gosta de navalha no pescoço.', 'Cliente desde a inauguração.'],
  },
  ESTETICA: {
    empresa: 'Clínica Pele Leve',
    nome: 'Estética',
    icone: 'bx-face',
    resumo: 'Limpeza de pele, depilação e massagem',
    camposPersonalizados: {
      rotulos: { cliente: 'Cliente', servico: 'Procedimento', atendimento: 'Sessão' },
      cliente: [{ chave: 'tipoPele', rotulo: 'Tipo de pele', tipo: 'selecao', obrigatorio: false, opcoes: ['Seca', 'Normal', 'Mista', 'Oleosa'] }],
    },
    servicos: [
      { nome: 'Limpeza de pele', categoria: 'Facial', valorCentavos: 15000, duracaoMinutos: 75 },
      { nome: 'Peeling de diamante', categoria: 'Facial', valorCentavos: 18000, duracaoMinutos: 60 },
      { nome: 'Drenagem linfática', categoria: 'Corporal', valorCentavos: 12000, duracaoMinutos: 60 },
      { nome: 'Massagem relaxante', categoria: 'Corporal', valorCentavos: 13000, duracaoMinutos: 60 },
      { nome: 'Depilação a laser (axila)', categoria: 'Depilação', valorCentavos: 9000, duracaoMinutos: 20 },
      { nome: 'Depilação a laser (pernas)', categoria: 'Depilação', valorCentavos: 22000, duracaoMinutos: 45 },
      { nome: 'Radiofrequência', categoria: 'Corporal', valorCentavos: 16000, duracaoMinutos: 50 },
    ],
    profissionais: [
      { nome: 'Dra. Fernanda Reis', cor: '#7C3AED', comissaoBps: 3500 },
      { nome: 'Aline Castro', cor: '#E0457B', comissaoBps: 3000 },
      { nome: 'Bruna Teles', cor: '#0E9F9A', comissaoBps: 3000 },
    ],
    extrasCliente: (i) => ({ tipoPele: ['Seca', 'Normal', 'Mista', 'Oleosa'][i % 4] }),
    observacoes: ['Pele sensível, evitar ácidos.', 'Pacote de 10 sessões.', 'Prefere horários no fim da tarde.'],
  },
  PETSHOP: {
    empresa: 'Pet Feliz Banho & Tosa',
    nome: 'Pet shop',
    icone: 'bxs-dog',
    resumo: 'Banho, tosa e consultas',
    camposPersonalizados: {
      rotulos: { cliente: 'Tutor', servico: 'Serviço', atendimento: 'Atendimento' },
      cliente: [
        { chave: 'nomePet', rotulo: 'Nome do pet', tipo: 'texto', obrigatorio: true },
        { chave: 'especie', rotulo: 'Espécie', tipo: 'selecao', obrigatorio: false, opcoes: ['Cão', 'Gato'] },
        { chave: 'raca', rotulo: 'Raça', tipo: 'texto', obrigatorio: false },
      ],
      atendimento: [{ chave: 'porte', rotulo: 'Porte', tipo: 'selecao', obrigatorio: false, opcoes: ['Pequeno', 'Médio', 'Grande'] }],
    },
    servicos: [
      { nome: 'Banho (pequeno porte)', categoria: 'Banho', valorCentavos: 5000, duracaoMinutos: 60 },
      { nome: 'Banho (grande porte)', categoria: 'Banho', valorCentavos: 8500, duracaoMinutos: 90 },
      { nome: 'Banho e tosa higiênica', categoria: 'Tosa', valorCentavos: 7000, duracaoMinutos: 75 },
      { nome: 'Tosa completa', categoria: 'Tosa', valorCentavos: 9500, duracaoMinutos: 90 },
      { nome: 'Hidratação de pelos', categoria: 'Banho', valorCentavos: 3000, duracaoMinutos: 20 },
      { nome: 'Corte de unhas', categoria: 'Cuidados', valorCentavos: 2000, duracaoMinutos: 15 },
      { nome: 'Consulta veterinária', categoria: 'Veterinário', valorCentavos: 15000, duracaoMinutos: 30 },
    ],
    profissionais: [
      { nome: 'Marcos Vieira', cor: '#2F6BFF', comissaoBps: 3000, servicos: [0, 1, 2, 3, 4, 5] },
      { nome: 'Tainá Barros', cor: '#D97706', comissaoBps: 3000, servicos: [0, 1, 2, 3, 4, 5] },
      { nome: 'Dr. Paulo Nunes', cor: '#12805C', comissaoBps: 4000, servicos: [6] },
    ],
    extrasCliente: (i) => ({ nomePet: PETS[i % PETS.length], especie: i % 5 === 3 ? 'Gato' : 'Cão', raca: RACAS[i % RACAS.length] }),
    observacoes: ['Pet ansioso, usar secador baixo.', 'Alergia a shampoo perfumado.', 'Leva e traz (táxi dog).'],
  },
  FISIOTERAPIA: {
    empresa: 'Movimento Fisioterapia',
    nome: 'Fisioterapia',
    icone: 'bx-body',
    resumo: 'Sessões, avaliações e pilates',
    camposPersonalizados: {
      rotulos: { cliente: 'Paciente', servico: 'Procedimento', atendimento: 'Sessão' },
      cliente: [{ chave: 'convenio', rotulo: 'Convênio', tipo: 'selecao', obrigatorio: false, opcoes: ['Particular', 'Unimed', 'Bradesco Saúde', 'SulAmérica'] }],
    },
    servicos: [
      { nome: 'Avaliação fisioterapêutica', categoria: 'Avaliação', valorCentavos: 15000, duracaoMinutos: 60 },
      { nome: 'Sessão de fisioterapia ortopédica', categoria: 'Ortopedia', valorCentavos: 12000, duracaoMinutos: 50 },
      { nome: 'RPG', categoria: 'Postural', valorCentavos: 13000, duracaoMinutos: 50 },
      { nome: 'Pilates clínico', categoria: 'Pilates', valorCentavos: 9000, duracaoMinutos: 50 },
      { nome: 'Liberação miofascial', categoria: 'Ortopedia', valorCentavos: 11000, duracaoMinutos: 40 },
      { nome: 'Fisioterapia respiratória', categoria: 'Respiratória', valorCentavos: 12000, duracaoMinutos: 45 },
    ],
    profissionais: [
      { nome: 'Dr. André Lopes', cor: '#2F6BFF', comissaoBps: 5000 },
      { nome: 'Dra. Renata Melo', cor: '#7C3AED', comissaoBps: 5000 },
      { nome: 'Dr. Felipe Ramos', cor: '#12805C', comissaoBps: 4500 },
    ],
    extrasCliente: (i) => ({ convenio: ['Particular', 'Unimed', 'Particular', 'Bradesco Saúde', 'SulAmérica'][i % 5] }),
    observacoes: ['Pós-operatório de joelho.', 'Lombalgia crônica.', 'Hérnia de disco L5-S1.'],
  },
  CONSULTORIA: {
    empresa: 'Rumo Consultoria Empresarial',
    nome: 'Consultoria',
    icone: 'bx-briefcase-alt-2',
    resumo: 'Reuniões, diagnósticos e mentorias',
    camposPersonalizados: {
      rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Reunião' },
      cliente: [{ chave: 'empresa', rotulo: 'Empresa', tipo: 'texto', obrigatorio: false }],
    },
    servicos: [
      { nome: 'Diagnóstico empresarial', categoria: 'Diagnóstico', valorCentavos: 90000, duracaoMinutos: 120 },
      { nome: 'Mentoria individual', categoria: 'Mentoria', valorCentavos: 35000, duracaoMinutos: 60 },
      { nome: 'Planejamento financeiro', categoria: 'Finanças', valorCentavos: 60000, duracaoMinutos: 90 },
      { nome: 'Reunião de acompanhamento', categoria: 'Acompanhamento', valorCentavos: 25000, duracaoMinutos: 60 },
      { nome: 'Workshop de vendas', categoria: 'Treinamento', valorCentavos: 150000, duracaoMinutos: 180 },
    ],
    profissionais: [
      { nome: 'Ricardo Menezes', cor: '#0F2557', comissaoBps: 3000 },
      { nome: 'Sofia Duarte', cor: '#2F6BFF', comissaoBps: 3000 },
      { nome: 'Gustavo Pires', cor: '#12805C', comissaoBps: 2500 },
    ],
    extrasCliente: (i) => ({ empresa: ['Padaria Pão Quente', 'Auto Peças Silva', 'Mercadinho Bom Preço', 'Loja Estilo', 'Doce Sabor', 'Construtora Alicerce'][i % 6] }),
    observacoes: ['Foco em fluxo de caixa.', 'Quer abrir a segunda unidade.', 'Reuniões online pelo Meet.'],
  },
  OUTRO: {
    empresa: 'Atendimentos Exemplo',
    nome: 'Outro',
    icone: 'bx-category',
    resumo: 'Agenda geral',
    camposPersonalizados: { rotulos: { cliente: 'Cliente', servico: 'Serviço', atendimento: 'Atendimento' } },
    servicos: [
      { nome: 'Atendimento padrão', categoria: 'Geral', valorCentavos: 10000, duracaoMinutos: 60 },
      { nome: 'Atendimento rápido', categoria: 'Geral', valorCentavos: 5000, duracaoMinutos: 30 },
    ],
    profissionais: [
      { nome: 'Ana Ferreira', cor: '#2F6BFF', comissaoBps: 3000 },
      { nome: 'Bruno Costa', cor: '#12805C', comissaoBps: 3000 },
    ],
    observacoes: ['Cliente frequente.'],
  },
};

export const NOMES_CLIENTES = [
  'Ana Beatriz Souza', 'Carla Mendes', 'Fernanda Oliveira', 'Gabriela Santos', 'Helena Costa', 'Isabela Ferreira',
  'Joana Ribeiro', 'Larissa Gomes', 'Mariana Alves', 'Natália Pereira', 'Priscila Barbosa', 'Renata Carvalho',
  'Sabrina Araújo', 'Tatiane Melo', 'Vanessa Cardoso', 'Bruno Teixeira', 'Carlos Eduardo Lima', 'Daniel Moreira',
  'Eduardo Pinto', 'Felipe Batista', 'Gustavo Rocha', 'Henrique Dias', 'Igor Nascimento', 'João Pedro Castro',
  'Leonardo Freitas', 'Marcelo Duarte', 'Otávio Ramos', 'Paulo Henrique Viana', 'Rodrigo Campos', 'Thiago Monteiro',
  'Aline Correia', 'Bianca Fernandes', 'Cecília Martins', 'Débora Nogueira', 'Elaine Farias', 'Flávia Lopes',
];

const PRIMEIROS = ['Adriana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fabiana', 'Giovana', 'Heloísa', 'Ingrid', 'Juliana', 'Kátia', 'Letícia', 'Mônica', 'Nathalia', 'Olívia', 'Paula', 'Raquel', 'Simone', 'Talita', 'Viviane', 'André', 'Caio', 'Diogo', 'Fábio', 'Heitor', 'Júlio', 'Márcio', 'Renan', 'Sérgio', 'Vinícius'];
const SOBRENOMES = ['Andrade', 'Bezerra', 'Cavalcanti', 'Diniz', 'Espíndola', 'Fonseca', 'Guimarães', 'Holanda', 'Leite', 'Macedo', 'Nunes', 'Pacheco', 'Queiroz', 'Rezende', 'Siqueira', 'Tavares', 'Uchôa', 'Valença', 'Xavier', 'Zanini'];

/** 80 clientes: os nomes fixos e mais combinações, para a frequência de retorno ficar realista. */
export const TODOS_CLIENTES = [...NOMES_CLIENTES, ...PRIMEIROS.flatMap((p, i) => [`${p} ${SOBRENOMES[i % SOBRENOMES.length]}`, `${p} ${SOBRENOMES[(i * 7 + 3) % SOBRENOMES.length]}`])].slice(0, 80);

export const BAIRROS = ['Centro', 'Boa Vista', 'Graças', 'Casa Amarela', 'Boa Viagem', 'Espinheiro', 'Torre', 'Madalena'];
