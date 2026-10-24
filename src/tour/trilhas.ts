import type { Modulo, Permissao } from '@/api/types';

export type Lado = 'baixo' | 'cima' | 'direita' | 'esquerda';

export interface Passo {
  /** Valor do atributo data-tour do elemento destacado. Sem alvo, o passo aparece no centro. */
  alvo?: string;
  /** Tela onde o passo acontece (o tour navega sozinho até ela). */
  rota?: string;
  titulo: string;
  texto: string;
  /** Linha curta extra: dica prática. */
  dica?: string;
  lado?: Lado;
  /** O alvo fica no menu lateral (no celular, o tour abre o menu). */
  menu?: boolean;
}

export interface Trilha {
  id: string;
  titulo: string;
  resumo: string;
  /** Classe do Boxicons (ex.: "bx-calendar"). */
  icone: string;
  rota: string;
  duracao: string;
  permissao?: Permissao;
  modulo?: Modulo;
  passos: Passo[];
}

/**
 * Trilhas do tour, escritas para quem nunca usou um sistema:
 * frases curtas, na segunda pessoa, dizendo o que fazer e por que importa.
 * {cliente}, {atendimento} e {servico} (e os plurais) viram os nomes que a empresa usa:
 * "tutor" no pet shop, "paciente" na fisioterapia, "sessão" na estética.
 */
export const TRILHAS: Trilha[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Conhecer o sistema',
    resumo: 'As partes principais em 1 minuto.',
    icone: 'bx-rocket',
    rota: '/app',
    duracao: '1 min',
    permissao: 'dashboard:ver',
    passos: [
      { titulo: 'Que bom ter você aqui', texto: 'Em 1 minuto você conhece as partes principais do Simbora Gerir. Avance pelos botões ou pelas setas do teclado.' },
      { alvo: 'menu', menu: true, lado: 'direita', titulo: 'O menu', texto: 'Tudo fica aqui: agenda, {clientes}, {servicos}, orçamentos e o financeiro. Cada pessoa da equipe vê só o que pode usar.' },
      { alvo: 'novo-atendimento', lado: 'baixo', titulo: 'Marcar rapidinho', texto: 'Este botão marca {um_atendimento} de qualquer tela. É o que você mais vai usar no dia a dia.' },
      { alvo: 'kpis', lado: 'baixo', titulo: 'Como está o mês', texto: 'Quanto entrou, quanto saiu, quantos {atendimentos} foram feitos e o valor médio de cada um.' },
      { alvo: 'periodo', lado: 'baixo', titulo: 'Trocar o período', texto: 'Escolha o mês ou o ano inteiro para comparar. Os números e os gráficos mudam na hora.' },
      { alvo: 'hoje', lado: 'cima', titulo: 'A agenda de hoje', texto: 'Quem vem hoje, em que horário e com quem. Toque em um nome para ver os detalhes.' },
      { alvo: 'reativar', lado: 'cima', titulo: '{Clientes} para chamar de volta', texto: 'Quem não aparece há mais de 60 dias aparece aqui, com o WhatsApp a um toque. É venda que estava parada.' },
      { alvo: 'ajuda', lado: 'baixo', titulo: 'Ajuda sempre à mão', texto: 'Ficou com dúvida em alguma tela? Toque aqui para ver o passo a passo daquela parte e as perguntas mais comuns.' },
    ],
  },
  {
    id: 'agenda',
    titulo: 'Usar a agenda',
    resumo: 'Marcar, remarcar arrastando e ver por profissional.',
    icone: 'bx-calendar',
    rota: '/app/agenda',
    duracao: '1 min',
    permissao: 'agenda:ler',
    passos: [
      { alvo: 'agenda-calendario', lado: 'cima', titulo: 'Sua agenda', texto: 'Cada bloco é {um_atendimento}. Toque num horário vazio para marcar e toque num bloco para confirmar, concluir ou cancelar.', dica: 'Arraste um bloco para outro horário para remarcar.' },
      { alvo: 'agenda-visao', lado: 'baixo', titulo: 'Dia, semana, mês ou lista', texto: 'Escolha como prefere ver. No celular, a lista mostra tudo em ordem, fácil de rolar.' },
      { alvo: 'agenda-navegar', lado: 'baixo', titulo: 'Andar pelos dias', texto: 'Use as setas para ir e voltar e o botão Hoje para voltar ao dia atual. Dá para filtrar por profissional e mostrar os cancelados.' },
      { alvo: 'agenda-cores', lado: 'baixo', titulo: 'Uma cor para cada profissional', texto: 'Assim você vê de longe quem atende cada horário. A cor é escolhida no cadastro do profissional.' },
      { alvo: 'novo-atendimento', lado: 'baixo', titulo: 'Marcar sem conflito', texto: 'Ao marcar, o sistema mostra os horários livres. Se bater com outro horário, ele avisa e você pode marcar como encaixe.' },
    ],
  },
  {
    id: 'atendimentos',
    titulo: 'Acompanhar {os_atendimentos}',
    resumo: 'Filtrar por período, situação e profissional.',
    icone: 'bx-list-check',
    rota: '/app/atendimentos',
    duracao: '40 s',
    permissao: 'atendimentos:ler',
    passos: [
      { alvo: 'atendimentos-filtros', lado: 'baixo', titulo: 'Encontre qualquer horário', texto: 'Escolha o período, a situação (agendado, confirmado, realizado ou cancelado), {o_cliente} e o profissional.' },
      { alvo: 'atendimentos-lista', lado: 'cima', titulo: 'Tudo em lista', texto: 'Toque em uma linha para ver os detalhes. É aqui que você marca como realizado e informa como {o_cliente} pagou.', dica: 'Só {atendimentos} realizados contam no faturamento.' },
      { alvo: 'atendimento-novo', lado: 'baixo', titulo: 'Lançar um que já aconteceu', texto: 'Esqueceu de marcar? Crie {um_atendimento} com a data de hoje e a situação Realizado.' },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Cadastrar e achar {clientes}',
    resumo: 'Ficha com histórico, retorno e WhatsApp.',
    icone: 'bx-user',
    rota: '/app/clientes',
    duracao: '40 s',
    permissao: 'clientes:ler',
    passos: [
      { alvo: 'cliente-novo', lado: 'baixo', titulo: 'Cadastrar', texto: 'Só o nome é obrigatório. Com o WhatsApp, você chama {o_cliente} com um toque e manda lembrete de horário.' },
      { alvo: 'clientes-busca', lado: 'baixo', titulo: 'Achar rápido', texto: 'Busque por nome, telefone ou e-mail. Os filtros mostram ativos, inativos e os cadastrados por último.' },
      { alvo: 'clientes-lista', lado: 'cima', titulo: 'A ficha completa', texto: 'Toque em um nome para ver tudo: quanto já gastou, de quanto em quanto tempo volta e o histórico de {atendimentos}.', dica: 'O sistema avisa quando {o_cliente} está atrasado para voltar.' },
    ],
  },
  {
    id: 'servicos',
    titulo: 'Montar a lista de {servicos}',
    resumo: 'Preço e duração que alimentam a agenda.',
    icone: 'bx-purchase-tag-alt',
    rota: '/app/servicos',
    duracao: '30 s',
    permissao: 'servicos:ler',
    passos: [
      { alvo: 'servico-novo', lado: 'baixo', titulo: 'Cadastrar {um_servico}', texto: 'Informe o nome, o preço e quanto tempo leva. A duração faz a agenda reservar o tempo certo.' },
      { alvo: 'servicos-filtros', lado: 'baixo', titulo: 'Organizar por categoria', texto: 'Separe por categoria (cabelo, unhas, banho...) para achar tudo rápido na hora de marcar.' },
    ],
  },
  {
    id: 'orcamentos',
    titulo: 'Fazer um orçamento',
    resumo: 'PDF com a sua marca que vira agendamento.',
    icone: 'bx-file',
    rota: '/app/orcamentos',
    duracao: '40 s',
    permissao: 'orcamentos:ler',
    modulo: 'ORCAMENTOS',
    passos: [
      { alvo: 'orcamento-novo', lado: 'baixo', titulo: 'Novo orçamento', texto: 'Escolha {o_cliente}, adicione os {servicos} e a quantidade. Dá para dar desconto e definir a validade.' },
      { alvo: 'orcamentos-filtros', lado: 'baixo', titulo: 'Acompanhar a resposta', texto: 'Filtre por situação: rascunho, enviado, aprovado, recusado ou vencido.' },
      { alvo: 'orcamentos-lista', lado: 'cima', titulo: 'Do orçamento ao horário', texto: 'Abra um orçamento para baixar o PDF, mandar pelo WhatsApp e, quando {o_cliente} aprovar, transformar em {atendimento} com um toque.' },
    ],
  },
  {
    id: 'despesas',
    titulo: 'Lançar despesas',
    resumo: 'Contas pagas e a pagar do mês.',
    icone: 'bx-receipt',
    rota: '/app/despesas',
    duracao: '40 s',
    permissao: 'despesas:ler',
    modulo: 'FINANCEIRO',
    passos: [
      { alvo: 'despesa-nova', lado: 'baixo', titulo: 'Lançar uma conta', texto: 'Aluguel, produtos, energia: informe o valor, a data e a categoria. Pode lançar como paga ou a pagar.' },
      { alvo: 'despesas-mes', lado: 'baixo', titulo: 'Mês a mês', texto: 'Use as setas para ver outros meses. A busca e os filtros ajudam a achar uma conta específica.' },
      { alvo: 'despesas-lista', lado: 'cima', titulo: 'O que falta pagar', texto: 'As contas a pagar aparecem marcadas. Quando pagar, marque como paga e ela entra no resultado.' },
      { alvo: 'despesas-abas', lado: 'baixo', titulo: 'Suas categorias', texto: 'Crie as categorias do seu jeito. Elas aparecem no gráfico de para onde vai o dinheiro.' },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Ver o resultado do negócio',
    resumo: 'Quanto entrou, saiu e sobrou.',
    icone: 'bx-line-chart',
    rota: '/app/financeiro',
    duracao: '30 s',
    permissao: 'financeiro:ver',
    modulo: 'FINANCEIRO',
    passos: [
      { alvo: 'financeiro-periodo', lado: 'baixo', titulo: 'Escolha o período', texto: 'Este mês, o passado, o trimestre, o ano ou as datas que você quiser.' },
      { alvo: 'financeiro-resultado', lado: 'direita', titulo: 'Quanto sobrou', texto: 'Faturamento menos despesas pagas e comissões. É o lucro do período, sem planilha.' },
      { alvo: 'financeiro-abas', lado: 'baixo', titulo: 'Comissões da equipe', texto: 'Na aba Comissões você vê quanto pagar para cada profissional, calculado sobre o que foi realizado.' },
    ],
  },
  {
    id: 'profissionais',
    titulo: 'Cadastrar profissionais',
    resumo: 'Cor, comissão e horário de cada um.',
    icone: 'bx-id-card',
    rota: '/app/profissionais',
    duracao: '30 s',
    permissao: 'profissionais:ler',
    modulo: 'MULTI_PROFISSIONAL',
    passos: [
      { alvo: 'profissional-novo', lado: 'baixo', titulo: 'Quem atende', texto: 'Cadastre cada profissional com a cor dele na agenda, a comissão e os {servicos} que faz.' },
      { alvo: 'profissionais-lista', lado: 'cima', titulo: 'Horário de trabalho', texto: 'Defina os dias e horários de cada um. A agenda só oferece horários dentro do expediente.' },
    ],
  },
  {
    id: 'equipe',
    titulo: 'Dar acesso à equipe',
    resumo: 'Cada pessoa com o seu login.',
    icone: 'bx-group',
    rota: '/app/equipe',
    duracao: '30 s',
    permissao: 'usuarios:gerenciar',
    modulo: 'MULTI_PROFISSIONAL',
    passos: [
      { alvo: 'equipe-papeis', lado: 'baixo', titulo: 'Quem vê o quê', texto: 'A recepção cuida da agenda de todos. O profissional vê só a própria agenda. O financeiro fica só com você.' },
      { alvo: 'equipe-convidar', lado: 'baixo', titulo: 'Convidar alguém', texto: 'Informe nome, e-mail e uma senha inicial. Se for profissional, ligue ao cadastro dele para ver a própria agenda.' },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Deixar com a cara da empresa',
    resumo: 'Cores, logo e os nomes que vocês usam.',
    icone: 'bx-cog',
    rota: '/app/configuracoes',
    duracao: '30 s',
    permissao: 'configuracoes:gerenciar',
    passos: [
      { alvo: 'config-abas', lado: 'baixo', titulo: 'Tudo em um lugar', texto: 'Dados da empresa, cores e logo, os campos do seu tipo de negócio e o seu plano.' },
      { rota: '/app/configuracoes?aba=aparencia', alvo: 'config-aparencia', lado: 'cima', titulo: 'A cara da sua empresa', texto: 'Troque as cores, envie o logo e escolha tema claro ou escuro. A equipe toda passa a ver o sistema com a sua marca.' },
      { rota: '/app/configuracoes?aba=campos', alvo: 'config-rotulos', lado: 'cima', titulo: 'Do jeito que vocês falam', texto: 'Chame {o_cliente} de tutor, paciente ou aluno, e {o_atendimento} de sessão ou reunião. Dá para criar campos extras, como o nome do pet.' },
    ],
  },
];

/** A trilha principal de quem não vê a visão geral (recepção e profissional) é a da agenda. */
export const trilhaPorId = (id: string) => TRILHAS.find((t) => t.id === id) ?? null;

/** Trilha que explica a tela atual (para o botão "Como usar"). */
export function trilhaDaRota(pathname: string): Trilha | null {
  return TRILHAS.find((t) => t.rota === pathname) ?? null;
}

export interface Pergunta {
  pergunta: string;
  resposta: string;
  trilha?: string;
}

/** Dúvidas que mais chegariam no suporte, respondidas em linguagem do dia a dia. */
export const PERGUNTAS: Pergunta[] = [
  { pergunta: 'Como marco um horário?', resposta: 'Toque em {Novo_atendimento} no topo, escolha {o_cliente}, {o_servico} e um dos horários livres. Ou toque num espaço vazio da agenda.', trilha: 'agenda' },
  { pergunta: 'Como remarco?', resposta: 'Na agenda, arraste o bloco para o novo horário. Se bater com outro, o sistema pergunta se é um encaixe.', trilha: 'agenda' },
  { pergunta: '{O_cliente} faltou. O que faço?', resposta: 'Abra {o_atendimento} e toque em Cancelar. Dá para escrever o motivo, que fica no histórico.' },
  { pergunta: 'Como registro que {o_cliente} pagou?', resposta: 'Abra {o_atendimento}, toque em Marcar como realizado e escolha a forma de pagamento. Só assim ele entra no faturamento.', trilha: 'atendimentos' },
  { pergunta: 'Como mando o orçamento pelo WhatsApp?', resposta: 'Abra o orçamento, baixe o PDF e envie. Quando {o_cliente} aprovar, toque em Agendar para virar {atendimento}.', trilha: 'orcamentos' },
  { pergunta: 'Onde vejo quanto sobrou no mês?', resposta: 'No Financeiro: faturamento menos despesas pagas e comissões. Na Visão geral você compara os meses no gráfico.', trilha: 'financeiro' },
  { pergunta: 'Como calculo a comissão de cada um?', resposta: 'A comissão sai sozinha: defina o percentual no cadastro do profissional e veja o total na aba Comissões do Financeiro.', trilha: 'financeiro' },
  { pergunta: 'A recepcionista pode ver o financeiro?', resposta: 'Não. Em Equipe, cada papel tem o seu acesso: a recepção cuida da agenda e o financeiro fica só com o proprietário.', trilha: 'equipe' },
];
