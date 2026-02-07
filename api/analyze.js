export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // Prepara o corpo do pedido
    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista. Analise as fotos.
                   Responda APENAS com este JSON (sem markdown):
                   { "score": 7.5, "potential": 9.4, "comment": "Análise técnica breve." }` 
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

    // --- ESTRATÉGIA DE GUERRA (API v1 ESTÁVEL) ---
    
    // TENTATIVA 1: Usando a rota OFICIAL (v1) com o modelo padrão
    // Isso costuma resolver o erro 404 que acontece na v1beta
    let url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Se a v1 falhar, tentamos a versão 'legacy' que nunca morre
    if (!response.ok) {
      console.log(`v1 Flash falhou (${response.status}). Tentando modelo 001...`);
      
      // TENTATIVA 2: Versão específica 001
      url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro Google (${response.status}): ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    
    // Extração segura do texto
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google não retornou texto. Tente outra foto.");
    }

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    res.status(500).json({ error: `FALHA V1: ${error.message}` });
  }
}
