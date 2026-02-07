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
                 { "score": 8.5, "potential": 9.8, "comment": "Breve análise técnica." }` 
        }
      ]
    }];

    photos.forEach(photoStr => {
      const base64Data = photoStr.includes(',') ? photoStr.split(',')[1] : photoStr;
      contents[0].parts.push({
        inlineData: { mimeType: "image/jpeg", data: base64Data }
      });
    });

    // --- LISTA DE MODELOS PARA TENTAR (EM ORDEM) ---
    // 1. Lite (Nome curto)
    // 2. Experimental (Geralmente livre de cota zero)
    // 3. 1.5 Flash (Estável)
    const modelosParaTentar = [
        "gemini-2.0-flash-lite", 
        "gemini-2.0-flash-exp", 
        "gemini-1.5-flash"
    ];

    let lastError = null;
    let resultadoFinal = null;

    // LOOP DE TENTATIVAS
    for (const modelo of modelosParaTentar) {
        try {
            console.log(`Tentando modelo: ${modelo}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            // Se der erro 404 (Não achou) ou 429 (Cota excedida), lançamos erro para tentar o próximo
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Erro ${response.status}: ${errData.error?.message}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content) {
                // SUCESSO! Pegamos o texto e paramos o loop.
                let text = data.candidates[0].content.parts[0].text;
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                resultadoFinal = JSON.parse(text);
                break; // Sai do loop
            }

        } catch (error) {
            console.warn(`Falha no modelo ${modelo}: ${error.message}`);
            lastError = error;
            // O loop continua para o próximo modelo...
        }
    }

    // Se depois de tentar todos, ainda não tivermos resultado:
    if (!resultadoFinal) {
        throw new Error(`TODOS OS MODELOS FALHARAM. Último erro: ${lastError?.message}`);
    }

    // Devolve o resultado do vencedor
    res.status(200).json(resultadoFinal);

  } catch (error) {
    res.status(500).json({ error: `FALHA GERAL: ${error.message}` });
  }
}
