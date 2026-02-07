export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Configurações de Segurança (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // Prepara o conteúdo
    const requestBody = {
      contents: [{
        parts: [
          { text: `Atue como um visagista. Analise as fotos.
                   Retorne APENAS um JSON válido (sem markdown):
                   { "score": 8.8, "potential": 9.7, "comment": "Breve análise técnica visagista." }` 
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

    // --- A ÚLTIMA TENTATIVA GRATUITA ---
    // Usando o modelo EXPERIMENTAL (exp).
    // Geralmente o Google libera a cota deste modelo para testes de desenvolvedores.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Se der erro 429 aqui também, aí não tem jeito: precisa do cartão.
      if (response.status === 429) {
          throw new Error("FIM DA LINHA GRATUITA: O Google bloqueou o acesso temporário por excesso de tentativas. Para resolver definitivo, cadastre o cartão na sua conta do Google Cloud.");
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
