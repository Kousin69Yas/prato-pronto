// Rotas do cardápio. O controller deve exportar um Express handler.
const express = require("express");
const controller = require("../controllers/menuController");
const router = express.Router();

function runController(methodNames, description) {
  return async (req, res, next) => {
    const methodName = methodNames.find((name) => typeof controller[name] === "function");
    if (!methodName) {
      return res.status(501).json({ erro: `Implemente ${description} em backend/controllers/menuController.js.` });
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

// GET /api/menu — usado por frontend/js/menu.js.
router.get("/", runController(["listar", "listarMenu", "obterMenu", "getMenu", "buscarTodos"], "listar o cardápio"));

// GET /api/menu/:id — consultar um item específico, quando necessário.
router.get("/:id", runController(["buscarPorId", "obterPorId", "buscarItem", "getById"], "buscar um item do cardápio"));

module.exports = router;