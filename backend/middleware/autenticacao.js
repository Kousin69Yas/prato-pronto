// Middleware de autenticação JWT para as rotas do Prato Pronto.
// Defina JWT_SECRET (com pelo menos 32 caracteres aleatórios) no .env da raiz.
const path = require("node:path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function autenticar(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(503).json({ erro: "Autenticação indisponível: configure JWT_SECRET com pelo menos 32 caracteres no .env." });
  }

  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ erro: "Token de acesso não informado." });
  }

  jwt.verify(match[1], secret, { algorithms: ["HS256"] }, (error, payload) => {
    if (error || !payload || typeof payload !== "object") {
      return res.status(401).json({ erro: "Token inválido ou expirado. Faça login novamente." });
    }

    const id = payload.id ?? payload.usuarioId ?? payload.userId ?? payload.sub;
    const tipo = payload.tipo ?? payload.tipo_usuario ?? payload.role;
    if (id === undefined || id === null) {
      return res.status(401).json({ erro: "Token sem identificador de usuário válido." });
    }

    // Mantém as demais claims verificadas e padroniza os campos consumidos nas rotas.
    req.user = { ...payload, id, tipo };
    req.auth = payload;
    next();
  });
}

function autorizarTipos(...tiposPermitidos) {
  const permitidos = tiposPermitidos.flat().map(normalizarTipo);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Autenticação necessária." });
    const tipo = normalizarTipo(req.user.tipo);
    if (!permitidos.includes(tipo)) return res.status(403).json({ erro: "Seu perfil não tem permissão para esta operação." });
    next();
  };
}

function exigirDonoOuAdmin(parametroId = "id") {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Autenticação necessária." });
    const isAdmin = normalizarTipo(req.user.tipo) === "admin";
    const isOwner = String(req.params[parametroId] ?? "") === String(req.user.id);
    if (!isAdmin && !isOwner) return res.status(403).json({ erro: "Você só pode acessar os seus próprios dados." });
    next();
  };
}

function normalizarTipo(tipo) {
  const value = String(tipo || "").toLowerCase();
  if (value === "student") return "aluno";
  if (value === "teacher") return "professor";
  return value;
}

// Exporta a função diretamente e pelos nomes aceitos em routes/usuarios.js.
module.exports = autenticar;
module.exports.autenticar = autenticar;
module.exports.autenticarToken = autenticar;
module.exports.verificarToken = autenticar;
module.exports.verificarAutenticacao = autenticar;
module.exports.authenticate = autenticar;
module.exports.protegerRota = autenticar;
module.exports.autorizarTipos = autorizarTipos;
module.exports.exigirDonoOuAdmin = exigirDonoOuAdmin;