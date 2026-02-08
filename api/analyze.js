// Configuração para Vercel (Aumenta o limite de tamanho para fotos grandes)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. Configuração de Cabeçalhos (Permite que seu front-end acesse a API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde imediatamente a requisições de teste (pre-flight)
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 2. Validações Iniciais
    if (req.method !== 'POST') throw new Error('Método não permitido. Use POST.');
    
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos || photos.length === 0) throw new Error('Nenhuma foto foi recebida.');
    if (!apiKey) throw new Error('Chave API não configurada no servidor.');

    // 3. Montagem do Pedido para a IA
    // Instrução clara para garantir o formato JSON
    const promptSystem = `Atue como um visagista especialista de alto nível. Analise as fotos enviadas com foco em geometria facial e harmonia.
    Retorne APENAS um JSON válido, sem markdown, sem crases, seguindo estritamente este formato:
    {
      "score": 8.7,
      "potential": 9.8,
      "comment": "Escreva aqui um parágrafo técnico, direto e personalizado sobre os pontos fortes e melhorias do rosto."
    }`;

    const requestBody = {
      contents: [{
        parts: [{ text: promptSystem }]
      }]
    };

    // Adiciona as fotos ao pedido
    photos.forEach(photoStr => {
      // Limpa o prefixo "data:image/jpeg;base64," se existir
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // 4. Conexão com o Google (Modelo Gemini 2.0 Flash)
    // Com o Billing ativo, este endpoint é rápido e estável.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // 5. Tratamento de Erros da API
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro Google:", JSON.stringify(errorData, null, 2));
      throw new Error(`Erro na IA (${response.status}): ${errorData.error?.message || 'Falha desconhecida'}`);
    }

    const data = await response.json();
    
    // 6. Extração e Limpeza da Resposta
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("A IA processou, mas não retornou texto.");
    }

    let text = data.candidates[0].content.parts[0].text;
    
    // Remove formatações indesejadas que a IA possa colocar (ex: ```json ... ```)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 7. Entrega o Resultado Final
    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Falha no Backend:", error);
    res.status(500).json({ 
        error: "Erro ao processar análise.",
        details: error.message 
    });
  }
}
