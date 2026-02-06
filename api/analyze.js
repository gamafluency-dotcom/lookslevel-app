import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    // 1. Verificar Chave
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("CHAVE FALTANDO: Verifique se o nome é GEMINI_API_KEY na Vercel.");
    }

    const { photos } = req.body;
    if (!photos) throw new Error("FOTOS FALTANDO: Nenhuma imagem chegou.");

    // 2. Tentar conectar no Google
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise como visagista. Retorne JSON: { "score": 7.0, "potential": 9.0, "comment": "Teste." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 3. Sucesso
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("ERRO REAL:", error);
    // Isso vai mostrar o motivo exato na sua tela
    res.status(500).json({ error: "MOTIVO DO ERRO: " + error.message });
  }
}
