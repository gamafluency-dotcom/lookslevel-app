import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Permitir CORS para que o seu site consiga falar com a API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a pre-flight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { photos } = req.body;

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto recebida' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      // Pequena proteção para garantir que o formato base64 esteja limpo
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };
    });

    const prompt = `Você é um especialista em Visagismo e Looksmaxing. 
    Analise as fotos e retorne APENAS um JSON válido.
    Formato obrigatório:
    {
      "score": 7.5,
      "potential": 9.2,
      "comment": "Texto curto sobre simetria e pele."
    }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Limpeza extra para garantir JSON válido
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const analysis = JSON.parse(text);
    res.status(200).json(analysis);

  } catch (error) {
    console.error("Erro Gemini:", error);
    res.status(500).json({ error: "Erro interno na análise." });
  }
}
