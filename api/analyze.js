export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos || photos.length < 1) throw new Error('Envie fotos.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    const promptSystem = `
      Atue como um juiz rigoroso da comunidade "Looksmaxxing".
      Analise as fotos para medir o dimorfismo sexual e harmonia.

      SEUS OBJETIVOS:
      1. Calcular notas numéricas precisas (0-100).
      2. Classificar o usuário nos Tiers (HTN, Chadlite, Chad, etc).
      3. Gerar relatório detalhado.

      RETORNE APENAS ESTE JSON (Sem markdown, sem quebras de linha dentro dos valores):
      {
        "overall": 68,
        "potential": 89,
        "tier": "HTN",
        "type": "Hunter",
        "attributes": {
          "jawline": 70,
          "eyes": 65,
          "hair": 80,
          "skin": 60,
          "masculinity": 75
        },
        "comment": "ANÁLISE: Seu rosto tem boa estrutura... | FALHAS: A pele precisa de... | PROTOCOLO: Use retinol..."
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{ text: promptSystem }]
      }]
    };

    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(`Erro Google: ${response.status}`);
    const data = await response.json();
    
    let rawText = data.candidates[0].content.parts[0].text;

    // --- LIMPEZA DE SEGURANÇA (FIX BAD CONTROL CHARACTER) ---
    // Remove code blocks
    let cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Remove caracteres de controle invisíveis que quebram o JSON (exceto os permitidos)
    cleanText = cleanText.replace(/[\x00-\x1F\x7F]/g, (char) => {
        // Mantém apenas os caracteres de controle seguros se estiverem escapados corretamente
        return ""; 
    });

    try {
        const jsonResult = JSON.parse(cleanText);
        res.status(200).json(jsonResult);
    } catch (e) {
        console.error("Falha ao limpar JSON. Texto original:", rawText);
        // Tenta uma recuperação de emergência ou lança erro mais claro
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
