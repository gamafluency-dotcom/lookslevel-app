import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações do Vercel (Limite de tamanho)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. Configurar permissões (CORS) para o site funcionar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Se for apenas um teste de conexão do navegador, responde OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Verificações de Segurança
    if (req.method !== 'POST') throw new Error('Método incorreto. Use POST.');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('A chave API (GEMINI_API_KEY) não está configurada na Vercel.');

    const { photos } = req.body;
    if (!photos || photos.length === 0) throw new Error('Nenhuma foto foi recebida.');

    // 3. Preparar a IA (O Pulo do Gato: Usando a versão exata 001)
    const genAI = new GoogleGenerativeAI(apiKey);
    // Mudamos de "gemini-1.5-flash" para "gemini-1.5-flash-001" para evitar erro 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // 4. Converter as fotos para o formato do Google
    const imageParts = photos.map(photoStr => {
      // Remove o cabeçalho "data:image/jpeg;base64," se existir
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };
    });

    const prompt = `Atue como um especialista em Visagismo. Analise estas fotos.
    Responda APENAS com este JSON exato, sem formatação extra:
    {
      "score": 7.5,
      "potential": 9.2,
      "comment": "Sua análise técnica em uma frase sobre simetria e pele."
    }`;

    // 5. Gerar o Conteúdo
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Limpar a resposta (Tirar crases e markdown)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Devolver para o site
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro API:", error);
    // Mostra o erro na tela para sabermos o que houve
    res.status(500).json({ error: `ERRO FINAL: ${error.message}` });
  }
}
