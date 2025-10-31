// test-gemini.js
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

console.log('🔑 Clé API:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NON TROUVÉE');

async function testGemini() {
  if (!apiKey) {
    console.log('❌ ERREUR: GEMINI_API_KEY non trouvée. Assurez-vous qu\'elle est dans votre fichier .env.local');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Utilisation du modèle 'gemini-pro' qui est le plus stable et largement disponible.
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('🔄 Test de connexion à Gemini avec le modèle "gemini-pro"...');
    const result = await model.generateContent('Dis bonjour en français');
    const response = await result.response;
    
    console.log('✅ SUCCÈS! Réponse:', response.text());
  } catch (error) {
    console.log('❌ ERREUR API:', error.message);
  }
}

testGemini();
