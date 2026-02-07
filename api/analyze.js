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
    
    // --- O DETETIVE DE CHAVES ---
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) throw new Error("ERRO FATAL: Chave não encontrada.");

    // Pega a última letra da chave para sabermos qual está usando
    const ultimaLetra = apiKey.charAt(apiKey.length - 1);

    // Se for 'I', avisa que é a velha. Se for outra, avisa que atualizou.
    // ----------------------------

    const genAI = new GoogleGenerativeAI(apiKey);
    // Usando o modelo PRO (se der erro, trocamos para o FLASH depois)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise estas fotos. Retorne JSON: { "score": 8.0, "potential": 9.5, "comment": "Ok" }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    const k = process.env.GEMINI_API_KEY || "";
    const final = k.length > 0 ? k.charAt(k.length - 1) : "NULA";
    
    // MUDAMOS A MENSAGEM AQUI PARA SABER SE O CODIGO ATUALIZOU
    res.status(500).json({ 
        error: `TESTE DE FORÇA: O site está usando a chave final '${final}'. O erro técnico foi: ${error.message}` 
    });
  }
}
