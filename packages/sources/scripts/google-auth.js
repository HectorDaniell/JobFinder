#!/usr/bin/env node
/**
 * Helper script to generate a refresh_token for Gmail (read-only)
 *
 * Usage:
 *   node packages/sources/scripts/google-auth.js
 *
 * Requirements:
 *   GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in .env
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { google } = require('googleapis');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.resolve(__dirname, '../../../token.json');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback';

if (!clientId || !clientSecret || clientId.includes('xxxxx')) {
  console.error('\n❌ Error: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados en el .env');
  console.error('Crea tus credenciales de OAuth en Google Cloud Console antes de ejecutar este script.\n');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n======================================================');
console.log('🔗 AUTORIZACIÓN DE GMAIL (SOLO LECTURA) PARA JOBFINDER');
console.log('======================================================\n');
console.log('1. Abre este enlace en tu navegador:\n');
console.log(authUrl);
console.log('\n2. Inicia sesión con la cuenta de Gmail donde recibes tus alertas de empleo.');
console.log('3. Haz clic en "Permitir" / "Continuar".');
console.log('4. Copia el código que aparece o el parámetro "?code=..." de la URL a la que te redirige.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Pega el código de autorización aquí: ', async (code) => {
  rl.close();
  try {
    const cleanCode = decodeURIComponent(code.trim().replace(/^.*code=/, '').split('&')[0]);
    const { tokens } = await oAuth2Client.getToken(cleanCode);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
    console.log(`\n✅ ¡Autorización exitosa! Token guardado en: ${TOKEN_PATH}`);
    console.log('`token.json` está protegido en .gitignore y nunca se subirá a git.\n');
  } catch (err) {
    console.error('\n❌ Error al canjear el código:', err.message);
    process.exit(1);
  }
});
