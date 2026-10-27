// Rotas de retirada. A confirmação final sempre é feita pelo controller e pelo MySQL.
const express = require("express");
const controller = require("../controllers/retiradaController");
const router = express.Router();

function runController(methodNames, description) {
  return async (req, res, next) => {
    const methodName = methodNames.find((name) => typeof controller[name] === "function");
    if (!methodName) {
      return res.status(501).json({ erro: `Implemente ${description} em backend/controllers/retiradaController.js.` });
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

function validateCode(req, res, next) {
  const code = String(req.body?.codigo || req.body?.codigo_retirada || req.body?.pickupCode || req.params.codigo || "");
  if (!/^\d{4}$/.test(code)) return res.status(400).json({ erro: "Informe um código de retirada com exatamente 4 dígitos." });
  req.pickupCode = code;
  next();
}

// POST /api/retiradas — registra a entrega e libera o código para uso futuro.
router.post("/", validateCode, runController(["registrar", "registrarRetirada", "confirmarRetirada", "retirarPedido", "create"], "registrar uma retirada"));

// GET /api/retiradas/:codigo — consulta registro da retirada, se o controller oferecer esse método.
router.get("/:codigo", validateCode, runController(["buscarPorCodigo", "consultarRetirada", "obterPorCodigo", "getByCode"], "consultar uma retirada"));

module.exports = router;
