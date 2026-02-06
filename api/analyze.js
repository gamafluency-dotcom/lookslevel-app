import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração CORS (Permissões de acesso)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    if (!photos) throw new Error('Nenhuma foto recebida.');

    // Inicializa o Google
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // MUDANÇA FINAL: Usando o modelo clássico "gemini-pro" que nunca falha
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise estas fotos como um visagista. 
    Retorne APENAS um JSON válido neste formato, sem markdown:
    { "score": 7.5, "potential": 9.2, "comment": "Breve análise técnica sobre o rosto." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: `ERRO NA ANÁLISE: ${error.message}` });
  }
}
