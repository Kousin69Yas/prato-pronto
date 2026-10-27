// Consulta do código e confirmação de retirada. Proteja a rota de escrita no backend.
(() => {
    "use strict";
  
    const API = "/api";
    const form = document.querySelector("#buscar-form");
    if (!form) return;
  
    const input = document.querySelector("#codigo-input");
    const searchButton = document.querySelector("#buscar-button");
    const message = document.querySelector("#message");
    const resultBox = document.querySelector("#pedido-result");
    const pickupButton = document.querySelector("#confirmar-retirada");
    let currentCode = "";
  
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);
    const cleanCode = (value) => String(value || "").replace(/\D/g, "").slice(0, 4);
  
    function unwrapOrder(raw) {
      return raw?.pedido || raw?.order || raw?.data?.pedido || raw?.data?.order || raw?.data || raw;
    }
  
    function statusInfo(value) {
      const status = String(value || "").toLowerCase();
      if (["ready", "pronto", "pronta"].includes(status)) return { label: "Pronto para buscar", className: "ready", ready: true };
      if (["preparing", "em preparo", "preparando"].includes(status)) return { label: "Em preparo", className: "preparing", ready: false };
      if (["picked_up", "retirado", "retirada concluída", "entregue"].includes(status)) return { label: "Retirado", className: "picked-up", ready: false };
      return { label: "Pedido recebido", className: "received", ready: false };
    }
  
    input.addEventListener("input", () => { input.value = cleanCode(input.value); });
  
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      currentCode = cleanCode(input.value);
      if (currentCode.length !== 4) return;
  
      searchButton.disabled = true;
      searchButton.textContent = "Procurando…";
      message.textContent = "";
      message.className = "form-message";
      resultBox.hidden = true;
  
      try {
        const response = await fetch(`${API}/pedidos/codigo/${encodeURIComponent(currentCode)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.erro || "Pedido não encontrado. Confira os quatro números.");
  
        const order = unwrapOrder(result);
        const items = order.itens || order.items || [];
        const status = statusInfo(order.status || order.estado || order.situacao);
        document.querySelector("#pedido-titular").textContent = `PEDIDO DE ${String(order.nome || order.personName || order.usuario_nome || "USUÁRIO").toLocaleUpperCase("pt-BR")}`;
        document.querySelector("#pedido-status").textContent = status.label;
        const pill = document.querySelector("#status-pill");
        pill.className = `status-pill ${status.className}`;
        pill.textContent = status.label;
        document.querySelector("#pedido-itens").innerHTML = items.map((item) =>
          `<li><span>${escapeHtml(item.emoji || "🍽️")}</span>${escapeHtml(item.nome || item.itemName || item.name || "Item do pedido")}<b>×${Number(item.quantidade || item.quantity) || 1}</b></li>`,
        ).join("") || "<li>Detalhes do prato não disponíveis.</li>";
        document.querySelector("#ready-message").hidden = !status.ready;
        pickupButton.hidden = !status.ready;
        resultBox.hidden = false;
      } catch (error) {
        message.textContent = `${error.message} Confira se GET /api/pedidos/codigo/:codigo está configurado.`;
        message.className = "form-message error";
      } finally {
        searchButton.disabled = false;
        searchButton.innerHTML = "Acompanhar pedido <span aria-hidden=\"true\">→</span>";
      }
    });
  
    pickupButton.addEventListener("click", async () => {
      pickupButton.disabled = true;
      pickupButton.textContent = "Registrando retirada…";
      message.textContent = "";
      message.className = "form-message";
      try {
        const response = await fetch(`${API}/retiradas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: currentCode, codigo_retirada: currentCode, pickupCode: currentCode }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.erro || "Não foi possível registrar a retirada.");
        document.querySelector("#pedido-status").textContent = "Retirado";
        const pill = document.querySelector("#status-pill");
        pill.className = "status-pill picked-up";
        pill.textContent = "Retirado";
        document.querySelector("#ready-message").textContent = "✓ Retirada registrada. Bom almoço!";
        document.querySelector("#ready-message").hidden = false;
        pickupButton.hidden = true;
      } catch (error) {
        message.textContent = `${error.message} Confira se POST /api/retiradas está configurado.`;
        message.className = "form-message error";
      } finally {
        pickupButton.disabled = false;
        pickupButton.innerHTML = "Confirmar retirada <span aria-hidden=\"true\">✓</span>";
      }
    });
  
    const params = new URLSearchParams(window.location.search);
    if (params.has("codigo")) {
      input.value = cleanCode(params.get("codigo"));
      if (input.value.length === 4) form.requestSubmit();
    }
  })();
  