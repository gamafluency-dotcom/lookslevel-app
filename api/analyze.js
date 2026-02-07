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

  // Responde rápido para testes de conexão
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Verificações básicas
    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // Prepara o corpo do pedido (JSON)
    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista especialista. Analise as fotos enviadas.
                   Retorne APENAS um JSON válido seguindo estritamente este formato (sem markdown, sem crases):
                   {
                     "score": 8.5,
                     "potential": 9.8,
                     "comment": "Escreva aqui uma análise técnica breve e personalizada sobre o rosto."
                   }` 
          }
        ]
      }]
    };

    // Adiciona as fotos na lista
    photos.forEach(photoStr => {
      // Limpa o cabeçalho do base64 se houver
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // --- O GRANDE SEGREDO ---
    // Usando o modelo que VIMOS na sua lista: gemini-2.0-flash
    // E usamos a api v1beta pois modelos novos costumam ficar lá.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
    
    // Extrai o texto da resposta
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google não retornou nenhuma análise de texto.");
    }

    let text = data.candidates[0].content.parts[0].text;
    
    // Limpeza para garantir que o site entenda o JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Devolve para o seu site
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: `FALHA TÉCNICA: ${error.message}` });
  }
}
