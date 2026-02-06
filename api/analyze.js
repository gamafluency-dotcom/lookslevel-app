import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Cabeçalhos para evitar erro de conexão (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método incorreto' });

  try {
    const { photos } = req.body;
    if (!photos) return res.status(400).json({ error: 'Nenhuma foto chegou no servidor.' });

    // VERIFICAÇÃO DA CHAVE (O Pulo do Gato)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave API não foi encontrada na Vercel. Verifique o nome 'GEMINI_API_KEY'.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return {
        inlineData: { data: base64Data, mimeType: "image/jpeg" },
      };
    });

    const prompt = `Analise estas fotos como um visagista. Retorne APENAS este JSON sem formatação:
    { "score": 7.5, "potential": 9.2, "comment": "Breve análise técnica." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Limpeza do texto da IA
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
        const analysis = JSON.parse(text);
        return res.status(200).json(analysis);
    } catch (e) {
        throw new Error("A IA respondeu, mas não foi um JSON válido: " + text.substring(0, 50));
    }

  } catch (error) {
    console.error("Erro Real:", error);
    // AQUI ESTÁ A MUDANÇA: Devolvemos a mensagem exata do erro
    return res.status(500).json({ error: error.message });
  }
}
