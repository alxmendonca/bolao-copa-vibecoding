import fs from "fs";
import path from "path";
import https from "https";

// Parser simples para ler o arquivo .env do cliente
function loadEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    console.error("Erro: Arquivo .env não encontrado em client/.");
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    // Captura CHAVE=VALOR
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      let val = match[2].trim();
      // Remove aspas simples/duplas das pontas, se houver
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[match[1]] = val;
    }
  });
  return env;
}

console.log("=== Testador de Conexão com Firebase Realtime Database ===\n");

const env = loadEnv();
const dbUrl = env.VITE_FIREBASE_DATABASE_URL || "";
const apiKey = env.VITE_FIREBASE_API_KEY || "";

console.log(`VITE_FIREBASE_DATABASE_URL: "${dbUrl}"`);
console.log(`VITE_FIREBASE_API_KEY: ${apiKey ? "Configurado (Presente)" : "Não configurado (Ausente)"}`);

if (!dbUrl || dbUrl.trim() === "") {
  console.log("\n⚠️ AVISO: VITE_FIREBASE_DATABASE_URL está em branco no arquivo .env.");
  console.log("O aplicativo frontend continuará funcionando, mas em modo Mock (LocalStorage).");
  console.log("Para testar uma conexão real, insira suas credenciais do Firebase no arquivo client/.env.");
  process.exit(0);
}

// O Firebase Realtime Database aceita requisições REST adicionando .json no fim do caminho
const testUrl = dbUrl.endsWith("/") ? `${dbUrl}.json` : `${dbUrl}/.json`;

console.log(`\nEfetuando requisição GET REST para: ${testUrl}...`);

const request = https.get(testUrl, (res) => {
  console.log(`Código de Status HTTP: ${res.statusCode} ${res.statusMessage}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\nResposta do Firebase:");
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(data || "(Vazio)");
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("\n✅ SUCESSO: Conexão com o Firebase Realtime Database estabelecida!");
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      console.log("\n🔒 SUCESSO PARCIAL: Conexão feita, mas Acesso Negado (401/403).");
      console.log("Isso é NORMAL e significa que as Security Rules estão ativas e bloqueando leituras públicas anônimas.");
      console.log("Isso confirma que o banco de dados existe e está respondendo às requisições!");
    } else {
      console.log("\n❌ ERRO: O Firebase retornou um código de status inesperado.");
    }
    process.exit(0);
  });
});

request.on("error", (err) => {
  console.error(`\n❌ ERRO DE CONEXÃO: Não foi possível alcançar o servidor do Firebase.`);
  console.error(`Detalhes: ${err.message}`);
  process.exit(1);
});

// Timeout de 10 segundos
request.setTimeout(10000, () => {
  console.error("\n❌ ERRO DE TIMEOUT: A requisição ao Firebase expirou após 10 segundos.");
  request.destroy();
  process.exit(1);
});
