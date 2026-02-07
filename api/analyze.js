export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configurações de segurança
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // Prepara o conteúdo (Prompt + Imagens)
    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista. Analise as fotos.
                   Retorne APENAS um JSON válido (sem markdown):
                   { "score": 7.5, "potential": 9.4, "comment": "Análise técnica breve." }` 
          }
        ]
      }]
    };

    // Adiciona as fotos
    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // --- A ESTRATÉGIA DUPLA ---
    
    // TENTATIVA 1: Modelo Flash (Rápido)
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Se der erro 404 (Modelo não encontrado), tentamos o Plano B
    if (response.status === 404) {
      console.log("Flash falhou (404). Tentando Gemini 1.5 Pro...");
      // TENTATIVA 2: Modelo Pro (Mais robusto)
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    }

    // Se ainda assim der erro, paramos
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro Google (${response.status}): ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    
    // Tratamento da resposta
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    res.status(500).json({ error: `FALHA FINAL: ${error.message}` });
  }
}
