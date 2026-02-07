export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req, res) {
  // Configurações básicas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Chave API não configurada.');

    // --- MODO SCANNER ---
    // Em vez de tentar gerar texto, vamos listar o que existe na sua conta.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(`ERRO DE CONTA: ${data.error.message}`);
    }

    if (!data.models) {
        throw new Error("Sua conta não tem nenhum modelo disponível (Lista vazia).");
    }

    // Filtra apenas os que servem para gerar texto (generateContent)
    const modelosUteis = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", "")) // Limpa o nome para ficar fácil de ler
        .join(" | ");

    // Joga o resultado na tela de erro para você ler
    throw new Error(`SUCESSO! OS MODELOS DISPONÍVEIS SÃO: [ ${modelosUteis} ]`);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
