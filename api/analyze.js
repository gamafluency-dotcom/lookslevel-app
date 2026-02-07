import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração de Permissões
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    if (!photos) throw new Error("Nenhuma foto recebida.");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Chave API não configurada.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // --- A MUDANÇA ESTÁ AQUI ---
    // Trocamos 'gemini-pro' (que saiu de linha) por 'gemini-1.5-flash' (o atual)
    // Como sua chave agora funciona, este modelo vai voar!
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Atue como um visagista especialista. Analise as fotos.
    Retorne APENAS um JSON válido seguindo estritamente este formato:
    {
      "score": 7.5,
      "potential": 9.4,
      "comment": "Escreva aqui uma análise técnica de 2 frases sobre o rosto."
    }
    Não use Markdown. Não use crases. Apenas o JSON puro.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro Back:", error);
    res.status(500).json({ 
        error: `Erro técnico: ${error.message}` 
    });
  }
}
