// Rotas de usuários. Consultas de perfil são protegidas; cadastro/login delegam
// a validação de credenciais e a geração/verificação de senha ao controller.
const express = require("express");
const controller = require("../controllers/usuariosController");
const authModule = require("../middleware/autenticacao");
const router = express.Router();

const authMiddleware = typeof authModule === "function"
  ? authModule
  : authModule.autenticar || authModule.autenticarToken || authModule.verificarToken || authModule.verificarAutenticacao || authModule.authenticate || authModule.protegerRota;

function runController(methodNames, description) {
  return async (req, res, next) => {
    const methodName = methodNames.find((name) => typeof controller[name] === "function");
    if (!methodName) {
      return res.status(501).json({ erro: `Implemente ${description} em backend/controllers/usuariosController.js.` });
    }
    try {
      const result = await controller[methodName](req, res, next);
      if (result !== undefined && !res.headersSent) return res.json(result);
      if (!res.headersSent) return res.status(501).json({ erro: `O método ${methodName} precisa enviar uma resposta ou retornar os dados.` });
    } catch (error) {
      next(error);
    }
  };
}

function requireAuthentication(req, res, next) {
  if (typeof authMiddleware !== "function") {
    return res.status(503).json({ erro: "Configure a exportação do middleware em backend/middleware/autenticacao.js antes de liberar perfis." });
  }
  return authMiddleware(req, res, next);
}

function validateCredentials(req, res, next) {
  const body = req.body || {};
  const identifier = String(body.email || body.usuario || body.username || body.login || "").trim();
  const password = String(body.senha || body.password || "");
  if (!identifier || password.length < 1) return res.status(400).json({ erro: "Informe usuário/e-mail e senha." });
  next();
}

function validateRegistration(req, res, next) {
  const body = req.body || {};
  const name = String(body.nome || body.name || "").trim();
  const password = String(body.senha || body.password || "");
  const role = String(body.tipo || body.tipo_usuario || body.role || "").toLowerCase();
  if (name.length < 2 || name.length > 100) return res.status(400).json({ erro: "Informe um nome entre 2 e 100 caracteres." });
  if (password.length < 8) return res.status(400).json({ erro: "A senha deve ter pelo menos 8 caracteres." });
  if (role && !["aluno", "professor", "student", "teacher", "admin"].includes(role)) {
    return res.status(400).json({ erro: "Tipo de usuário inválido." });
  }
  next();
}

// POST /api/usuarios — cadastro; nunca armazene senha em texto puro no controller.
router.post("/", validateRegistration, runController(["cadastrar", "criar", "criarUsuario", "registrar", "create"], "cadastrar um usuário"));

// POST /api/usuarios/login — login público; o controller deve comparar hash de senha.
router.post("/login", validateCredentials, runController(["login", "autenticar", "entrar", "loginUsuario"], "autenticar um usuário"));

// GET /api/usuarios/me — consulta apenas a própria conta autenticada.
router.get("/me", requireAuthentication, runController(["me", "perfil", "obterPerfil", "usuarioLogado"], "consultar o perfil do usuário"));

// GET /api/usuarios/:id — consulta por ID protegida (sem listagem pública de usuários).
router.get("/:id", requireAuthentication, runController(["buscarPorId", "obterUsuarioPorId", "consultarPorId", "getById"], "buscar usuário por ID"));

// PATCH /api/usuarios/:id — edição autenticada; o controller deve validar permissões.
router.patch("/:id", requireAuthentication, runController(["atualizar", "atualizarUsuario", "editarUsuario", "update"], "atualizar usuário"));

module.exports = router;
