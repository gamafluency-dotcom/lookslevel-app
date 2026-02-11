export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }, // Aumentei para 3 fotos
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { photos } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!photos || photos.length < 1) throw new Error('Envie pelo menos 1 foto (Ideal: 3).');
    if (!apiKey) throw new Error('Chave API não configurada.');

    // PROMPT LOOKSMAXXING HARDCORE
    const promptSystem = `
      Atue como um juiz rigoroso da comunidade "Looksmaxxing".
      Analise as 3 fotos (Frente, Perfil Esquerdo, Perfil Direito) para medir o dimorfismo sexual e harmonia.

      SEUS OBJETIVOS:
      1. Calcular notas numéricas precisas (0-100) para os atributos chave.
      2. Classificar o usuário nos Tiers oficiais do Looksmaxxing.
      3. Gerar um relatório detalhado.

      TIERS MASCULINOS (Do pior para o melhor):
      - It's Over (Sub-5)
      - Normie (Média)
      - HTN (High Tier Normal)
      - Chadlite
      - Chad
      - GigaChad

      TIERS FEMININOS:
      - Femcel
      - Normie
      - Becky
      - Stacy
      - GigaStacy

      RETORNE APENAS ESTE JSON (Sem markdown):
      {
        "overall": 45,
        "potential": 88,
        "tier": "HTN (High Tier Normal)",
        "type": "Hunter / Pretty Boy / Masc",
        "attributes": {
          "jawline": 65,
          "eyes": 50,
          "hair": 70,
          "skin": 40,
          "masculinity": 55
        },
        "comment": "TEXTO DA ANÁLISE: Use termos como 'Canthal Tilt', 'Hunter Eyes', 'Ramus', 'Gonials'. Seja direto. \n\n🔎 ANÁLISE:\n[Análise técnica]\n\n⚠️ FALHAS (FAILOS):\n[O que atrapalha]\n\n🧪 PROTOCOLO:\n[Como resolver (Mewing, Skincare, Academia, etc)]"
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{ text: promptSystem }]
      }]
    };

    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      requestBody.contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(`Erro Google: ${response.status}`);
    const data = await response.json();
    
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
