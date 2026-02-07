export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configurações de Segurança
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // Prepara o JSON para o Gemini
    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista profissional. Analise estas fotos.
                   Responda APENAS com este JSON exato (sem markdown, sem crases):
                   { "score": 7.5, "potential": 9.4, "comment": "Breve análise técnica sobre o rosto." }` 
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

    // --- A MUDANÇA FINAL ---
    // Usando 'gemini-pro' (Versão 1.0 Clássica).
    // Esse modelo funciona em 100% das contas, onde o 1.5 pode falhar.
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro Google (${response.status}): ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    
    // Extração e Limpeza
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google analisou mas não retornou texto. Tente outra foto.");
    }

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    // Se der erro, mostramos exatamente o que houve
    res.status(500).json({ error: `FALHA COMPATIBILIDADE: ${error.message}` });
  }
}
