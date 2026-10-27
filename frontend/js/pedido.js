// Criação do pedido (menu.html) e confirmação/cópia do código (confirmacao.html).
(() => {
    "use strict";
  
    const API = "/api";
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);
    const form = document.querySelector("#pedido-form");
  
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const menu = window.PratoProntoMenu;
        if (!menu) return;
  
        const order = menu.getOrder();
        if (!order.name || order.name.length < 2 || !order.items.length) {
          menu.setError("Informe seu nome e escolha pelo menos um item do prato.");
          return;
        }
  
        menu.setError("");
        menu.setBusy(true);
        const items = order.items.map((item) => ({
          id: item.id,
          menuItemId: item.id,
          menu_item_id: item.id,
          nome: item.name,
          quantidade: item.quantity,
          quantity: item.quantity,
        }));
  
        try {
          const response = await fetch(`${API}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: order.name,
              tipo_usuario: order.personType,
              tipo: order.personType,
              turma: order.classroom,
              itens: items,
              personName: order.name,
              role: order.personType === "aluno" ? "student" : "teacher",
              classGroup: order.classroom,
              items,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || result.erro || "Não foi possível confirmar o pedido.");
  
          const code = result.codigo || result.codigo_retirada || result.codigoRetirada || result.pickupCode || result.code || result.pedido?.codigo || result.data?.codigo;
          if (!code || !/^\d{4}$/.test(String(code))) {
            throw new Error("A resposta da rota POST /api/pedidos não trouxe um código de retirada de 4 dígitos.");
          }
  
          const savedOrder = {
            codigo: String(code),
            nome: order.name,
            tipo: order.personType,
            turma: order.classroom,
            itens: order.items,
          };
          sessionStorage.setItem("pratoProntoPedido", JSON.stringify(savedOrder));
          window.location.href = "confirmacao.html";
        } catch (error) {
          menu.setError(`${error.message} Confira a rota de pedidos e tente novamente.`);
          menu.setBusy(false);
        }
      });
    }
  
    const codeElement = document.querySelector("#codigo");
    if (!codeElement) return;
  
    const savedOrder = JSON.parse(sessionStorage.getItem("pratoProntoPedido") || "null");
    const code = savedOrder?.codigo;
    const codeArea = document.querySelector("#codigo-area");
    const nameElement = document.querySelector("#nome-pessoa");
    const message = document.querySelector("#confirm-message");
    const copyButton = document.querySelector("#copiar-codigo");
  
    if (!savedOrder || !/^\d{4}$/.test(String(code || ""))) {
      codeArea.hidden = true;
      nameElement.textContent = "ainda não tem código?";
      document.querySelector(".confirmation-lede").textContent = "Monte seu prato e confirme o pedido. O código de retirada aparece ao finalizar.";
      document.querySelector("#itens-pedido").innerHTML = "<li>Seu código será criado ao confirmar o almoço.</li>";
      copyButton.hidden = true;
      message.textContent = "Ainda não há pedido confirmado neste navegador.";
    } else {
      codeElement.innerHTML = String(code).split("").map((digit) => `<i>${digit}</i>`).join("");
      nameElement.textContent = savedOrder.nome ? `${savedOrder.nome}.` : "seu prato está a caminho.";
      document.querySelector("#resumo-pessoa").textContent = savedOrder.tipo === "aluno"
        ? `Aluno${savedOrder.turma ? ` · ${savedOrder.turma}` : ""}`
        : "Professor";
      document.querySelector("#itens-pedido").innerHTML = (savedOrder.itens || []).map((item) =>
        `<li><span>${escapeHtml(item.emoji || "🍽️")}</span>${escapeHtml(item.name || item.nome)}<b>×${Number(item.quantity || item.quantidade) || 1}</b></li>`,
      ).join("") || "<li>O prato foi confirmado.</li>";
    }
  
    copyButton.addEventListener("click", async () => {
      if (!code) return;
      try {
        await navigator.clipboard.writeText(String(code));
        copyButton.textContent = "Código copiado ✓";
      } catch {
        message.textContent = `Anote seu código: ${code}`;
      }
    });
  })();
  