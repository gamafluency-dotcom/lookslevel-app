import OpenAI from 'openai';

// Configuração para permitir arquivos maiores (fotos)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { photos } = req.body;

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto recebida' });
    }

    // O Prompt para a IA (Visagista Profissional)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em Visagismo e Looksmaxing. Analise as fotos e retorne APENAS um JSON (sem markdown) com:
          - score: Nota de 0 a 10 (decimal, ex: 7.4). Seja criterioso.
          - potential: Nota potencial (maior que a atual, ex: 9.1).
          - comment: Um parágrafo técnico e construtivo sobre simetria, pele, mandíbula e olhos. Mencione pontos fortes e fracos.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise estas fotos para o relatório LooksLevel Pro." },
            ...photos.map(base64 => ({
              type: "image_url",
              image_url: { url: base64 }
            }))
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error("Erro OpenAI:", error);
    res.status(500).json({ error: "Erro ao processar análise." });
  }
}