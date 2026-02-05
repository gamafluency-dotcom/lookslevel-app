import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
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
      const base64Data = photoStr.split(',')[1];
      return {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };
    });

    const prompt = `Você é um especialista em Visagismo e Looksmaxing. 
    Analise estas fotos e retorne APENAS um código JSON (sem markdown, sem crases) com este formato exato:
    {
      "score": (número decimal de 4.0 a 9.8, ex: 7.4),
      "potential": (número decimal maior que score, ex: 9.1),
      "comment": "Um parágrafo técnico, curto e construtivo sobre simetria, pele e estrutura óssea."
    }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const analysis = JSON.parse(text);
    res.status(200).json(analysis);

  } catch (error) {
    console.error("Erro Gemini:", error);
    res.status(500).json({ error: "Erro ao processar análise com Gemini." });
  }
}
