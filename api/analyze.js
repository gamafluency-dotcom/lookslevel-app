import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    if (!photos) throw new Error('Nenhuma foto recebida.');

    // Inicializa o Google
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // MUDANÇA AQUI: Vamos usar o modelo PRO que é mais estável
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise estas fotos. Retorne APENAS JSON:
    { "score": 7.5, "potential": 9.2, "comment": "Breve análise." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    // Isso vai mostrar se estamos usando o PRO ou o FLASH
    res.status(500).json({ error: `ERRO DE MODELO: ${error.message}` });
  }
}
