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

    // Prepara o conteúdo
    const contents = [{
      parts: [
        { text: `Atue como um visagista. Analise as fotos.
                 Retorne APENAS um JSON válido (sem markdown):
                 { "score": 8.7, "potential": 9.9, "comment": "Análise técnica visagista." }` 
        }
      ]
    }];

    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // --- A ESCOLHA EXATA ---
    // Este nome está EXATAMENTE assim na sua lista de modelos disponíveis.
    // Ele é a versão "Lite" (leve/grátis) e "001" (estável).
    const modelName = "gemini-2.0-flash-lite-001";
    
    console.log(`Tentando conectar no modelo: ${modelName}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Se der erro de Cota (429), vamos tentar o PRO EXPERIMENTAL como última esperança
      if (response.status === 429) {
          console.log("Cota do Lite excedida. Tentando Pro Experimental...");
          const backupUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent?key=${apiKey}`;
          const backupResponse = await fetch(backupUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents })
          });
          
          if (backupResponse.ok) {
              const dataBackup = await backupResponse.json();
              let textBackup = dataBackup.candidates[0].content.parts[0].text;
              textBackup = textBackup.replace(/```json/g, "").replace(/```/g, "").trim();
              return res.status(200).json(JSON.parse(textBackup));
          }
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
    res.status(500).json({ error: `FALHA: ${error.message}` });
  }
}
