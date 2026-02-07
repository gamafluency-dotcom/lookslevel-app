import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. Configuração de Permissões (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a testes de conexão
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Validação Básica
    if (req.method !== 'POST') {
        throw new Error("Método inválido. Use POST.");
    }

    const { photos } = req.body;
    if (!photos || photos.length === 0) {
        throw new Error("Nenhuma foto foi recebida pelo servidor.");
    }

    // 3. Recuperar a Chave (Sem mostrar no erro)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Erro de Configuração: Chave API não encontrada no servidor.");
    }

    // 4. Conectar na IA
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // USANDO 'gemini-pro' (O mais estável, evita erro 404 de modelo)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 5. Preparar Imagens
    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };
    });

    // 6. O Pedido (Prompt)
    const prompt = `Atue como um visagista especialista. Analise as fotos.
    Retorne APENAS um JSON válido seguindo estritamente este formato:
    {
      "score": 7.5,
      "potential": 9.4,
      "comment": "Escreva aqui uma análise técnica de 2 frases sobre o rosto."
    }
    Não use Markdown. Não use crases. Apenas o JSON puro.`;

    // 7. Executar
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Limpeza de segurança para garantir JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Devolver ao site
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro no Backend:", error);
    // Erro genérico para o usuário, erro técnico no console
    res.status(500).json({ 
        error: `Erro ao processar análise. Detalhe técnico: ${error.message}` 
    });
  }
}
