export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. Configurar Permissões (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') throw new Error('Método incorreto.');
    
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // 2. Preparar as imagens para o formato JSON direto
    const parts = [{ text: `Atue como um visagista. Analise estas fotos.
    Responda APENAS com este JSON exato (sem markdown, sem crases):
    {
      "score": 7.5,
      "potential": 9.4,
      "comment": "Análise técnica breve de 2 frases sobre o rosto."
    }` 
    }];

    // Adiciona as fotos na lista de envio
    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    });

    // 3. O PULO DO GATO: Chamada Direta via Fetch (Sem biblioteca!)
    // Usamos o modelo 'gemini-1.5-flash' que é rápido e moderno.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Erro desconhecido do Google');
    }

    const data = await response.json();
    
    // 4. Extrair o texto da resposta
    let text = data.candidates[0].content.parts[0].text;
    
    // Limpar formatação para garantir que seja JSON puro
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Devolver para o site
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro API:", error);
    res.status(500).json({ error: `ERRO: ${error.message}` });
  }
}
