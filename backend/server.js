// servidor Express do Prato Pronto
// Este arquivo pressupõe que as rotas exportem um express.Router() e que
// database/conexao.js exporte um pool de conexão mysql2.
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIR = path.resolve(__dirname, "../frontend");
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Importa os módulos da árvore mostrada: backend/routes e backend/database.
const databaseModule = require("./database/conexao");
const database = databaseModule.pool || databaseModule.connection || databaseModule;
const menuRoutes = requireRouter("./routes/menu");
const pedidosRoutes = requireRouter("./routes/pedidos");
const retiradasRoutes = requireRouter("./routes/retiradas");
const usuariosRoutes = requireRouter("./routes/usuarios");

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

// O front é servido por este mesmo servidor. CORS só é necessário no
// desenvolvimento separado (por exemplo, Live Server em localhost:5500).
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const forwardedProtocol = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
  const sameOrigin = origin === `${forwardedProtocol}://${req.get("host")}`;
  const localDevelopmentOrigin = process.env.NODE_ENV !== "production"
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
  const originIsAllowed = !origin || sameOrigin || allowedOrigins.has(origin) || localDevelopmentOrigin;

  if (!originIsAllowed) {
    return res.status(403).json({ erro: "Origem não autorizada." });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Verificação simples para monitoramento: também confirma que o MySQL responde.
app.get("/api/health", async (_req, res) => {
  try {
    const queryable = typeof database.promise === "function" ? database.promise() : database;
    await queryable.query("SELECT 1 AS conectado");
    res.status(200).json({ status: "ok", banco: "conectado" });
  } catch (error) {
    console.error("[health] Falha ao consultar o MySQL:", error.message);
    res.status(503).json({ status: "erro", banco: "indisponível" });
  }
});

// Os prefixes abaixo correspondem aos endpoints usados pelos arquivos HTML/JS.
app.use("/api/menu", menuRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/retiradas", retiradasRoutes);
app.use("/api/usuarios", usuariosRoutes);

// Servir index.html, menu.html, confirmacao.html, retirada.html e seus assets.
app.use(express.static(FRONTEND_DIR, { extensions: ["html"], index: "index.html" }));
app.get("/", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota da API não encontrada." }));
app.use((_req, res) => res.status(404).send("Página não encontrada."));

app.use((error, _req, res, _next) => {
  console.error("[server] Erro não tratado:", error);
  if (res.headersSent) return;
  res.status(error.status || 500).json({
    erro: process.env.NODE_ENV === "production" ? "Erro interno do servidor." : error.message,
  });
});

function requireRouter(modulePath) {
  const imported = require(modulePath);
  const router = imported.router || imported.default || imported;
  if (typeof router !== "function") {
    throw new TypeError(`${modulePath} precisa exportar um Express Router.`);
  }
  return router;
}

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Prato Pronto disponível na porta ${PORT}.`);
  try {
    const queryable = typeof database.promise === "function" ? database.promise() : database;
    await queryable.query("SELECT 1 AS conectado");
    console.log("Conexão MySQL verificada.");
  } catch (error) {
    console.error("MySQL não respondeu na inicialização:", error.message);
    console.error("Confira as variáveis do .env e backend/database/conexao.js.");
  }
});

async function shutdown(signal) {
  console.log(`${signal}: encerrando o servidor…`);
  server.close(async () => {
    try {
      if (typeof database.end === "function") {
        if (database.end.length > 0) {
          await new Promise((resolve, reject) => database.end((error) => error ? reject(error) : resolve()));
        } else {
          await database.end();
        }
      }
    } catch (error) {
      console.error("Não foi possível encerrar o pool MySQL:", error.message);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
