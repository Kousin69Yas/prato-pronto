// Rotas dos pedidos. O controller concentra operações MySQL e respostas HTTP.
const express = require("express");
const controller = require("../controllers/pedidosController");
const router = express.Router();

function runController(methodNames, description) {
  return async (req, res, next) => {
    const methodName = methodNames.find((name) => typeof controller[name] === "function");
    if (!methodName) {
      return res.status(501).json({ erro: `Implemente ${description} em backend/controllers/pedidosController.js.` });
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

function validatePickupCode(req, res, next) {
  const code = String(req.params.codigo || "");
  if (!/^\d{4}$/.test(code)) return res.status(400).json({ erro: "O código de retirada deve ter exatamente 4 dígitos." });
  next();
}

function validateNewOrder(req, res, next) {
  const body = req.body || {};
  const name = String(body.nome || body.personName || "").trim();
  const items = body.itens || body.items;
  const role = body.tipo_usuario || body.tipo || body.role;
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ erro: "Informe um nome com pelo menos 2 caracteres e no máximo 80." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ erro: "Escolha pelo menos um item para o prato." });
  }
  if (role && !["aluno", "professor", "student", "teacher"].includes(String(role).toLowerCase())) {
    return res.status(400).json({ erro: "O tipo de pessoa deve ser aluno ou professor." });
  }
  next();
}

// POST /api/pedidos — cria um pedido e deve devolver { codigo: "1234", ... }.
router.post("/", validateNewOrder, runController(["criar", "criarPedido", "registrarPedido", "createOrder", "create"], "criar um pedido"));

// GET /api/pedidos/codigo/:codigo — consulta pelo código usado pelo frontend.
router.get("/codigo/:codigo", validatePickupCode, runController(["buscarPorCodigo", "buscarPedidoPorCodigo", "consultarPorCodigo", "obterPorCodigo", "getByCode"], "consultar um pedido pelo código"));

// GET /api/pedidos/:id — consulta interna pelo identificador do pedido.
router.get("/:id", runController(["buscarPorId", "obterPedidoPorId", "buscarPedido", "getById"], "buscar um pedido pelo ID"));

// PATCH /api/pedidos/:id/status — usado pela cozinha para avançar o preparo.
router.patch("/:id/status", runController(["atualizarStatus", "alterarStatus", "atualizarStatusPedido", "updateStatus"], "atualizar o status de um pedido"));

module.exports = router;
