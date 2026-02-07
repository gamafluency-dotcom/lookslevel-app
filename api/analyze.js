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
    
    // --- O ESPIÃO DE CHAVE ---
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 1. Se estiver vazia
    if (!apiKey) {
        throw new Error("A variável GEMINI_API_KEY está VAZIA/NULL.");
    }

    // 2. Análise forense da chave (sem mostrar a chave inteira por segurança)
    const tamanho = apiKey.length;
    const primeiraLetra = apiKey.charAt(0);
    const ultimaLetra = apiKey.charAt(tamanho - 1);
    const temAspas = apiKey.includes('"') || apiKey.includes("'");
    const temEspaco = apiKey.includes(' ');

    // Se tiver aspas ou espaço, o erro vai avisar
    if (temAspas) throw new Error(`ERRO DE FORMATACAO: A chave tem aspas (")! Apague e cole apenas o código.`);
    if (temEspaco) throw new Error(`ERRO DE FORMATACAO: A chave tem espaços em branco! Verifique o final dela.`);
    
    // --- Fim do Espião ---

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise estas fotos como um visagista. Retorne APENAS um JSON: { "score": 7.5, "potential": 9.2, "comment": "Análise feita." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    // Se o erro for do Google, mostramos o diagnóstico do Espião
    const apiKey = process.env.GEMINI_API_KEY || "";
    res.status(500).json({ 
        error: `DIAGNÓSTICO: A chave lida tem ${apiKey.length} caracteres. Começa com '${apiKey.charAt(0)}' e termina com '${apiKey.charAt(apiKey.length - 1)}'. Mensagem original: ${error.message}` 
    });
  }
}
