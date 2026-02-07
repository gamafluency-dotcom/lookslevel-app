export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração de Permissões (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista especialista. Analise as fotos enviadas.
                   Retorne APENAS um JSON válido neste formato (sem markdown):
                   {
                     "score": 8.5,
                     "potential": 9.8,
                     "comment": "Faça uma análise breve e técnica sobre o rosto."
                   }` 
          }
        ]
      }]
    };

    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // --- MUDANÇA ESTRATÉGICA ---
    // Trocamos o 'flash' (que estourou a cota) pelo 'flash-lite' (que é feito para ser grátis/leve)
    // Esse nome estava na sua lista: gemini-2.0-flash-lite-preview-02-05
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Se der erro de cota de novo (429), avisamos de forma amigável
      if (response.status === 429) {
          throw new Error("O Google está congestionado (Erro 429). Tente novamente em 1 minuto.");
      }
      throw new Error(`Erro Google (${response.status}): ${errorData.error?.message}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google não retornou texto.");
    }

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: `FALHA: ${error.message}` });
  }
}
