/**
 * Extrai o manifesto de narração a partir do index.html.
 *
 * Uso:
 *   node audio-data.js              → gera audios/manifest.json
 *   const { buildManifest } = require('./audio-data');
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const OUTPUT_DIR = path.join(ROOT, 'audios');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

/** Textos customizados para slides com pouco conteúdo textual ou conteúdo dinâmico. */
const NARRATION_OVERRIDES = {
  s1:
    'Módulo de Treinamento. Segurança do Trabalho. NR11 - OPERADOR DE TRANSPALETEIRA. Capacitação em movimentação, armazenagem e manuseio de materiais com transpaleteira conforme NR-11.',
  s2:
    'Apresentação. Bem-vindo ao Treinamento. NR11 - OPERADOR DE TRANSPALETEIRA. Assista ao vídeo de introdução e avance quando concluir.',
  s6:
    'Sumário. Conteúdo Programático. Módulo 1: Fundamentos, Legislação e Requisitos. Módulo 2: Conhecendo o Equipamento. Módulo 3: Procedimentos Operacionais e Operação Segura. Módulo 4: Movimentação, Cargas e Armazenamento. Módulo 5: Manutenção e Segurança com Baterias. Módulo 6: Gestão de Riscos, Emergências e EPIs.',
  's-mod1':
    'Início do Módulo 1. Fundamentos, Legislação e Requisitos.',
  s2b:
    'Vídeo. A Norma NR 11 e os Equipamentos Motorizados. Fundamentos, Legislação e Requisitos. Assista ao vídeo e conheça as exigências legais e a importância do treinamento de segurança na operação de transpaleteiras e outros equipamentos motorizados de movimentação de materiais. Avance quando concluir.',
  s2b2:
    'Vídeo. Habilitação e o Cartão de Identificação. Fundamentos, Legislação e Requisitos. Assista ao vídeo sobre habilitação e o porte obrigatório do cartão de identificação na operação de transpaleteiras. Avance quando concluir.',
  s2b3:
    'Legislação. O Cartão de Identificação. Conforme o item 11.1.6 da NR-11, os operadores de equipamentos de transporte motorizado deverão ser habilitados e só poderão dirigir se durante o horário de trabalho portarem um cartão de identificação, com o nome e fotografia, em lugar visível. Veja a simulação do cartão de identificação à direita, com os dados do operador, fotografia, número de chapa e o respectivo setor de trabalho. Avance quando concluir.',
  s2c:
    'Vídeo. Validade do Cartão e Responsabilidade do Operador. Fundamentos, Legislação e Requisitos. Assista ao vídeo sobre a validade do cartão de identificação e a responsabilidade do operador. Avance quando concluir.',
  s2d: null,
  s2e: null, // montado a partir do deck do jogo Módulo 1
  's-mod2':
    'Início do Módulo 2. Conhecendo o Equipamento.',
  's-mod2-video':
    'Vídeo. Conhecendo a Transpaleteira. Conhecendo o Equipamento. Assista ao vídeo sobre os componentes principais e o funcionamento da transpaleteira. Avance quando concluir.',
  's-mod2-video2':
    'Vídeo. Transpaleteiras Elétricas e Tripuladas. Conhecendo o Equipamento. Assista ao vídeo sobre as transpaleteiras elétricas e tripuladas. Avance quando concluir.',
  's-mod2-video3':
    'Vídeo. Componentes Principais da Transpaleteira. Conhecendo o Equipamento. Assista ao vídeo sobre os componentes principais da transpaleteira. Avance quando concluir.',
  's-mod2-video4':
    'Vídeo. O Painel de Controle e a Chave de Contato. Conhecendo o Equipamento. Assista ao vídeo sobre o painel de controle e a chave de contato. Avance quando concluir.',
};

function cleanText(text) {
  return (text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSlideText(slide) {
  const clone = slide.cloneNode(true);
  clone
    .querySelectorAll('script, iframe, svg, .wave, button, style, .nav-btn, .zoom-btn, [id$="-mobile-section"]')
    .forEach((el) => el.remove());

  const custom = slide.getAttribute('data-audio-text');
  if (custom) return cleanText(custom);

  let text = cleanText(clone.textContent || '');

  if (text.length < 40) {
    const iframeTitle = slide.querySelector('iframe[title]')?.getAttribute('title');
    const imgAlt = slide.querySelector('img[alt]')?.getAttribute('alt');
    const title = slide.querySelector('.slide-title')?.textContent;
    const parts = [title, iframeTitle, imgAlt].map(cleanText).filter(Boolean);
    if (parts.length) text = parts.join('. ');
  }

  return text;
}

function parseQuizQuestions(html) {
  const match = html.match(/const\s+q1_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseQ5Questions(html) {
  const match = html.match(/const\s+q5_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseMod1GameDeck(html) {
  const match = html.match(/const\s+mod1GameDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseQm2Questions(html) {
  const match = html.match(/const\s+qm2_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildMod1Narration(deck) {
  if (!deck.length) {
    return 'Quiz NR-11 — Módulo 1. Legislação e Requisitos. Responda a três perguntas rápidas sobre os conceitos legais do módulo e valide seu aprendizado.';
  }

  const parts = [
    'Quiz NR-11 — Módulo 1. Legislação e Requisitos. Responda a três perguntas rápidas sobre os conceitos legais do módulo e valide seu aprendizado.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.text)}`);
    (item.options || []).forEach((opt) => {
      parts.push(`Alternativa ${opt.key}: ${cleanText(opt.text)}`);
    });
    parts.push(`Resposta correta: alternativa ${item.correct}. ${cleanText(item.tip)}`);
  });

  return parts.join(' ');
}

function parseMod2tfDeck(html) {
  const match = html.match(/const\s+mod2tfDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildMod2tfNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 2 — Verdadeiro ou Falso. Responda seis afirmações sobre o equipamento e valide o que você aprendeu no módulo.';
  }

  const parts = [
    'Desafio Módulo 2 — Verdadeiro ou Falso. Responda seis afirmações sobre o equipamento e valide o que você aprendeu no módulo.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Afirmação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Resposta correta: ${item.answer ? 'Verdadeiro' : 'Falso'}. ${cleanText(item.tip)}`);
  });

  return parts.join(' ');
}

function buildMod2Narration(questions) {
  if (!questions.length) {
    return 'Quiz — Módulo 2. Conhecendo o Equipamento. Responda cinco perguntas sobre o equipamento. Acerte pelo menos três questões para concluir o módulo.';
  }

  const parts = [
    'Quiz. Conhecendo o Equipamento. Quiz — Módulo 2. Responda cinco perguntas sobre tipos de transpaleteiras, capacidade de carga, componentes principais, painel de controle e funcionamento do timão. Acerte pelo menos três questões para concluir o módulo.',
  ];

  questions.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    item.opts.forEach((opt, optIndex) => {
      const marker = optIndex === item.correct ? 'Resposta correta' : `Alternativa ${optIndex + 1}`;
      parts.push(`${marker}: ${cleanText(opt)}`);
    });
    if (item.feedback_ok) {
      parts.push(cleanText(item.feedback_ok));
    }
  });

  return parts.join(' ');
}

function parseMod3BinaryDeck(html) {
  const match = html.match(/const\s+mod3BinaryDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseM3gDeck(html) {
  const match = html.match(/var\s+m3gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM3gNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 3 — Missão do Operador. Leia cinco situações reais de operação e escolha a atitude correta.';
  }

  const letters = ['A', 'B', 'C'];
  const parts = [
    'Desafio Módulo 3 — Missão do Operador. Leia cinco situações reais de operação e escolha a atitude correta.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.sit)}`);
    item.opts.forEach((opt, optIndex) => {
      parts.push(`Alternativa ${letters[optIndex] || optIndex + 1}: ${cleanText(opt)}`);
    });
    parts.push(`Resposta correta: alternativa ${letters[item.ans] || item.ans + 1}. ${cleanText(item.fb)}`);
  });

  return parts.join(' ');
}

function parseM4gDeck(html) {
  const match = html.match(/var\s+m4gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM4gNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 4 — Turno Relâmpago. Responda Certo ou Errado para cinco afirmações sobre estabilidade de carga, paletes, tipos de carga e armazenamento.';
  }

  const parts = [
    'Desafio Módulo 4 — Turno Relâmpago. Responda Certo ou Errado para cinco afirmações sobre estabilidade de carga, paletes, tipos de carga e armazenamento.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Afirmação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Resposta correta: ${item.ans ? 'Certo' : 'Errado'}. ${cleanText(item.tip)}`);
  });

  return parts.join(' ');
}

function parseM5gDeck(html) {
  const match = html.match(/var\s+m5gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM5gNarration(deck) {
  const zoneLabels = {
    manutencao: 'Manutenção',
    bateria: 'Troca de Bateria',
    restricao: 'Restrição de Segurança',
  };

  if (!deck.length) {
    return 'Desafio Módulo 5 — Central de Manutenção. Classifique cinco situações sobre manutenção, troca de bateria e restrições de segurança.';
  }

  const parts = [
    'Desafio Módulo 5 — Central de Manutenção. Classifique cinco situações sobre manutenção, troca de bateria e restrições de segurança.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Setor correto: ${zoneLabels[item.zone] || item.zone}. ${cleanText(item.tip)}`);
  });

  return parts.join(' ');
}

function parseM6gRounds(html) {
  const match = html.match(/var\s+m6gRounds\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM6gNarration(rounds) {
  if (!rounds.length) {
    return 'Desafio Final — Ordem Certa. Toque nos itens na ordem correta em cada rodada.';
  }

  const parts = [
    'Desafio Final — Ordem Certa. Duas rodadas: toque nos itens na ordem correta.',
  ];

  rounds.forEach((round, index) => {
    parts.push(`Rodada ${index + 1}: ${cleanText(round.title)}. ${cleanText(round.instr)}`);
    const order = round.items.map((item) => cleanText(item.label)).join(', depois ');
    parts.push(`Ordem correta: ${order}.`);
  });

  return parts.join(' ');
}

function parseQm4Questions(html) {
  const match = html.match(/const\s+qm4_data\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function('"use strict"; return (' + match[1] + ');')();
  } catch {
    return [];
  }
}

function parseQm6Questions(html) {
  const match = html.match(/const\s+qm6_data\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function('"use strict"; return (' + match[1] + ');')();
  } catch {
    return [];
  }
}

function buildMod3Narration(deck) {
  if (!deck.length) {
    return 'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de procedimento operacional ou condução de transpaleteira pode ou não ser realizada. Conclua o jogo para validar o módulo.';
  }

  const parts = [
    'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de procedimento operacional ou condução de transpaleteira pode ou não ser realizada. Cinco situações sobre inspeção, trânsito interno, postura e estacionamento seguro.',
  ];

  deck.forEach((item, index) => {
    const answer = item.allowed ? 'Permitido' : 'Proibido';
    parts.push(`Situação ${index + 1}: ${cleanText(item.text)} Resposta correta: ${answer}. ${cleanText(item.tip)}`);
  });

  parts.push('Conclua o jogo para validar o módulo.');
  return parts.join(' ');
}

function buildQuizNarration(questions, moduleNum = 1) {
  if (!questions.length) {
    return `Quiz do Módulo ${moduleNum}. Responda às perguntas sobre os conceitos apresentados no módulo.`;
  }

  const parts = [
    `Quiz do Módulo ${moduleNum}. Responda às ${questions.length} perguntas sobre os conceitos do módulo.`,
  ];

  questions.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    item.opts.forEach((opt, optIndex) => {
      parts.push(`Alternativa ${optIndex + 1}: ${cleanText(opt)}`);
    });
  });

  return parts.join(' ');
}

function slideTitle(slide) {
  const titleEl = slide.querySelector('.slide-title, .mod-intro-title, h1');
  return cleanText(titleEl?.textContent || slide.id);
}

function buildManifest(htmlPath = HTML_PATH) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const quizQuestions = parseQuizQuestions(html);
  const q5Questions = parseQ5Questions(html);
  const mod3Deck = parseMod3BinaryDeck(html);
    const mod1Deck = parseMod1GameDeck(html);
  const qm2Questions = parseQm2Questions(html);

  const slides = [...doc.querySelectorAll('#slides .slide')].map((slide, index) => {
    const id = slide.id || `slide-${index + 1}`;
    let text = NARRATION_OVERRIDES[id];

    if (text === null && id === 's7d') {
      text = buildQuizNarration(quizQuestions, 1);
    } else if (text === null && id === 's31') {
      text = buildQuizNarration(q5Questions, 5);
    } else if (text === null && id === 's26') {
      text = buildMod3Narration(mod3Deck);
    } else if (text === null && id === 's4f') {
      text = buildQuizNarration(parseQm4Questions(html), 4);
    } else if (text === null && id === 's6f') {
      text = buildQuizNarration(parseQm6Questions(html), 6);
    } else if (text === null && id === 's2e') {
      text = buildMod1Narration(mod1Deck);
    } else if (text === null && id === 's3f') {
      text = buildMod2Narration(qm2Questions);
    } else if ((text === undefined || text === null) && id === 's-mod2-game') {
      text = buildMod2tfNarration(parseMod2tfDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod3-game') {
      text = buildM3gNarration(parseM3gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod4-game') {
      text = buildM4gNarration(parseM4gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod5-game') {
      text = buildM5gNarration(parseM5gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod6-game') {
      text = buildM6gNarration(parseM6gRounds(html));
    } else if (text === undefined || text === null) {
      text = extractSlideText(slide);
    }

    if (!text) {
      text = `Slide ${index + 1}. ${slideTitle(slide)}`;
    }

    return {
      index,
      id,
      title: slideTitle(slide),
      file: `audios/${id}.mp3`,
      text,
      audioReady: fs.existsSync(path.join(ROOT, 'audios', `${id}.mp3`)),
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: path.basename(htmlPath),
    audioDir: 'audios',
    slides,
  };
}

function writeManifest(manifest, outputPath = MANIFEST_PATH) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  const jsPath = path.join(path.dirname(outputPath), 'audio-manifest.js');
  fs.writeFileSync(
    jsPath,
    `window.__AUDIO_NARRATION__ = ${JSON.stringify(manifest)};\n`,
    'utf8',
  );

  return outputPath;
}

if (require.main === module) {
  const manifest = buildManifest();
  const out = writeManifest(manifest);
  console.log(`Manifesto gerado: ${out}`);
  console.log(`${manifest.slides.length} slides encontrados.`);
  manifest.slides.forEach((slide) => {
    console.log(`  [${String(slide.index + 1).padStart(2, '0')}] ${slide.id} (${slide.text.length} chars)`);
  });
}

module.exports = {
  HTML_PATH,
  MANIFEST_PATH,
  OUTPUT_DIR,
  NARRATION_OVERRIDES,
  buildManifest,
  writeManifest,
  extractSlideText,
  cleanText,
  buildMod1Narration,
  parseMod1GameDeck,
  buildMod2Narration,
  parseQm2Questions,
};
