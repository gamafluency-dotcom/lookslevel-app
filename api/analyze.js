import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    // Recupera a chave (que agora sabemos que funciona!)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) throw new Error("Chave API não configurada.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // MODELO: Usamos o 'gemini-1.5-flash' que é o padrão atual.
    // Com o package.json atualizado, esse nome VAI ser reconhecido.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Atue como um visagista. Analise as fotos.
    Retorne APENAS um JSON válido neste formato (sem markdown):
    {
      "score": 7.8,
      "potential": 9.4,
      "comment": "Análise técnica breve sobre harmonia facial e pele."
    }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro Backend:", error);
    res.status(500).json({ error: `Erro Técnico: ${error.message}` });
  }
}
