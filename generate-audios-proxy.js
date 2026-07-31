/**
 * Gera arquivos MP3 de narração via o proxy interno TecnoCursos
 * (https://texttospeech.escolatecnocursos.cloud), que por sua vez chama a ElevenLabs.
 *
 * Diferente do generate-audios.js (chave direta da ElevenLabs), este script faz
 * login com usuário/senha (AUTH_USERNAME/AUTH_PASSWORD no .env) para obter um
 * token Bearer e então chama POST /api/tts.
 *
 * Uso:
 *   node generate-audios-proxy.js s2b s2b2 s2b3 s2c s2d s2e
 *   node generate-audios-proxy.js --slide=s2b
 */

const fs = require('fs');
const path = require('path');
const { buildManifest, writeManifest, MANIFEST_PATH } = require('./audio-data');

const API_BASE = 'https://texttospeech.escolatecnocursos.cloud';

function loadEnvFile() {
  for (const filename of ['.env', '.env.local']) {
    const envPath = path.join(__dirname, filename);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.AUTH_USERNAME,
      password: process.env.AUTH_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

async function synthesize(text, token) {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`TTS falhou (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  loadEnvFile();

  const ids = process.argv.slice(2).map((a) => a.replace(/^--slide=/, ''));
  if (!ids.length) {
    console.error('Informe ao menos um id de slide. Ex.: node generate-audios-proxy.js s2b s2c');
    process.exit(1);
  }
  if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) {
    console.error('Defina AUTH_USERNAME e AUTH_PASSWORD no .env');
    process.exit(1);
  }

  const manifest = buildManifest();

  console.log('Autenticando no proxy...');
  const token = await login();
  console.log('Login ok.\n');

  for (const id of ids) {
    const slide = manifest.slides.find((s) => s.id === id);
    if (!slide) {
      console.error(`✗ ${id} — não encontrado no manifesto (verifique o id do slide)`);
      continue;
    }

    process.stdout.write(`▶ ${id} (${slide.text.length} chars)... `);
    try {
      const audio = await synthesize(slide.text, token);
      const outputPath = path.join(__dirname, slide.file);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, audio);
      console.log(`ok (${audio.length} bytes) -> ${slide.file}`);
    } catch (error) {
      console.log('falhou');
      console.error(`  ${error.message}`);
    }
  }

  const refreshed = buildManifest();
  writeManifest(refreshed, MANIFEST_PATH);
  console.log('\nManifesto atualizado (manifest.json + audio-manifest.js).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
