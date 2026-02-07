import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req, res) {
  // Configuração de Segurança e Permissões
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    
    // --- VERIFICAÇÃO DE IDENTIDADE DA CHAVE ---
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("ERRO: Nenhuma chave encontrada. A variável sumiu.");
    }

    // O código olha a última letra da senha
    const ultimaLetra = apiKey.charAt(apiKey.length - 1);

    // Se a última letra for 'I', ele SABE que é a chave velha
    if (ultimaLetra === 'I') {
        throw new Error("ERRO DE CACHE: O Vercel ainda está usando a chave ANTIGA (final 'I'). Vá em Settings > Environment Variables, Edite a chave, MARQUE a caixinha 'Production' e Salve.");
    }
    // -------------------------------------------

    const genAI = new GoogleGenerativeAI(apiKey);
    // Usando o modelo mais estável para garantir
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const imageParts = photos.map(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      return { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
    });

    const prompt = `Analise estas fotos como um visagista profissional. 
    Retorne APENAS um JSON válido (sem markdown) neste formato exato:
    { "score": 7.4, "potential": 9.2, "comment": "Comentário técnico breve sobre o rosto." }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    const k = process.env.GEMINI_API_KEY || "";
    const final = k.length > 0 ? k.charAt(k.length - 1) : "VAZIO";
    
    // Mostra na tela qual chave está sendo usada
    res.status(500).json({ 
        error: `STATUS ATUAL: O site está lendo uma chave que termina com '${final}'. Erro técnico: ${error.message}` 
    });
  }
}
