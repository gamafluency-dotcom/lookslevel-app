// Aumenta o limite para aceitar fotos de alta resolução
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // 1. Configurações de Segurança (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') throw new Error('Método incorreto. Use POST.');
    
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos || photos.length === 0) throw new Error('Nenhuma foto recebida.');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // 2. O PROMPT DE VISAGISMO PROFISSIONAL
    // Aqui está a mágica. Instruções detalhadas para gerar o relatório que você pediu.
    const promptSystem = `
      Atue como um Esteticista e Visagista Profissional com 20 anos de experiência.
      Analise as fotos do usuário com extremo rigor técnico e científico.
      
      OBJETIVO: Identificar falhas estéticas, qualidades estruturais e criar um plano de correção.
      IDIOMA DA RESPOSTA: Português do Brasil (PT-BR).

      Gere uma análise dividida nestes 4 tópicos exatos:
      1. ANÁLISE PRO: Avalie a qualidade da pele (textura, acne, rugas), simetria facial, terços do rosto e mandíbula.
      2. MELHORES E PIORES TRAÇOS: Cite o que destaca o rosto e o que prejudica a harmonia.
      3. DIMORFISMO E ATRATIVIDADE: Compare os traços com o padrão ideal do gênero (masculinidade/feminilidade) e dê um veredito sobre o nível de atratividade atual.
      4. PLANO BASEADO EM CIÊNCIA: Crie uma rotina prática (skincare ou sugestões estéticas) para resolver os problemas citados.

      Retorne APENAS um JSON válido (sem markdown, sem crases) neste formato:
      {
        "score": 8.2,
        "potential": 9.5,
        "comment": "Aqui você colocará todo o texto da análise detalhada dividida pelos tópicos acima. Use quebras de linha para organizar."
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{ text: promptSystem }]
      }]
    };

    // Adiciona as fotos
    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // 3. Conexão com o Google (Modelo Potente)
    // Com o cartão ativo, usamos o Gemini 2.0 Flash que é rápido e inteligente.
    // Se quiser ainda mais inteligência (mas mais lento), pode trocar por 'gemini-1.5-pro'.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro API Google (${response.status}): ${errorData.error?.message}`);
    }

    const data = await response.json();
    
    // 4. Limpeza e Entrega
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google não retornou análise.");
    }

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro Backend:", error);
    res.status(500).json({ error: `FALHA TÉCNICA: ${error.message}` });
  }
}
