// Configuração Vercel para aceitar fotos maiores
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb', // Aumentei um pouco para garantir qualidade
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

    // 2. O PROMPT "PREMIUM VISUAL"
    // Instruções extremamente detalhadas para a IA agir como um consultor de elite.
    const promptSystem = `
      Atue como um Visagista, Dermatologista e Cientista de Dados Estéticos de renome mundial.
      Analise as fotos enviadas com precisão cirúrgica. Sua análise deve ser profunda, técnica, mas explicada com exemplos visuais claros.

      FORMATO DA RESPOSTA:
      Você DEVE retornar APENAS um JSON válido. O campo "comment" deve ser um texto longo, formatado com quebras de linha (\n), usando estritamente os ícones e a estrutura abaixo:

      ESTRUTURA DO CAMPO "comment":
      🔎 ANÁLISE TÉCNICA DETALHADA
      [Fale sobre simetria, qualidade da pele, proporção áurea e estrutura óssea. Use termos técnicos explicados.]

      ✅ PONTOS FORTES (SEUS MELHORES TRAÇOS)
      [Liste 3 traços que elevam a nota, explicando o porquê visualmente.]

      ⚠️ PONTOS DE MELHORIA & EXEMPLOS VISUAIS
      [Para cada problema identificado, descreva um exemplo visual do que deve ser resolvido. Ex: "Mandíbula pouco definida. Exemplo visual: Falta a sombra projetada entre o pescoço e o queixo que cria o contorno forte."]

      🧪 PLANO CIENTÍFICO PERSONALIZADO
      [Rotina prática de skincare ou procedimentos estéticos sugeridos para os pontos de melhoria.]

      📊 NÍVEL DE ATRATIVIDADE & DIMORFISMO
      [Análise comparativa com o padrão do gênero e nota final explicada.]

      🔄 VERSÃO GÊNERO OPOSTO (PROMPT GENERATIVO)
      [Crie um prompt de texto altamente detalhado (em inglês) que descreva essa mesma pessoa se ela fosse do gênero oposto, mantendo as mesmas características étnicas, cores e nível de atratividade. O usuário usará este texto para gerar uma imagem em outra IA.]

      Retorne o JSON exato neste modelo (sem markdown):
      {
        "score": 8.5,
        "potential": 9.7,
        "comment": "Seu texto formatado aqui..."
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

    // 3. Conexão com o Google (Gemini 2.0 Flash - Rápido e Potente)
    // Como você tem Billing, isso vai voar.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Se ainda der erro de cota mesmo com cartão, avisa.
      if (response.status === 429) throw new Error("Sistema sobrecarregado momentaneamente. Tente em 30 segundos.");
      throw new Error(`Erro API Google (${response.status}): ${errorData.error?.message}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("O Google analisou mas não retornou o relatório.");
    }

    let text = data.candidates[0].content.parts[0].text;
    // Limpeza de segurança para garantir JSON puro
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error("Erro Backend:", error);
    res.status(500).json({ error: error.message });
  }
}
