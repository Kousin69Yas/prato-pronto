// Carrega e apresenta o cardápio. O pedido é enviado separadamente por pedido.js.
(() => {
    "use strict";
  
    const API = "/api";
    const categories = {
      base: { label: "Pra começar", emoji: "🍚", note: "BASES" },
      protein: { label: "A estrela do prato", emoji: "🍗", note: "PROTEÍNAS" },
      side: { label: "Para acompanhar", emoji: "🥕", note: "OPÇÕES" },
      salad: { label: "Um toque fresco", emoji: "🥗", note: "SALADAS" },
      dessert: { label: "Final feliz", emoji: "🍌", note: "FRUTAS" },
      drink: { label: "Pra beber", emoji: "🧃", note: "BEBIDAS" },
    };
  
    const menuMessage = document.querySelector("#menu-message");
    const orderForm = document.querySelector("#pedido-form");
    if (!menuMessage || !orderForm) return;
  
    let menuItems = [];
    const quantities = new Map();
    let personType = "aluno";
  
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);
  
    function firstValue(object, keys) {
      for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) return object[key];
      }
      return undefined;
    }
  
    function normalizeItem(item) {
      const rawCategory = String(firstValue(item, ["categoria", "category", "tipo"]) || "side").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const categoryAliases = { base: "base", arroz: "base", protein: "protein", proteina: "protein", side: "side", acompanhamento: "side", salad: "salad", salada: "salad", dessert: "dessert", sobremesa: "dessert", fruta: "dessert", drink: "drink", bebida: "drink" };
      const category = categoryAliases[rawCategory] || "side";
      const available = firstValue(item, ["disponivel", "isAvailable", "available"]);
      const unavailable = [false, 0, "0", "false", "indisponivel"].includes(typeof available === "string" ? available.toLowerCase() : available);
      return {
        id: firstValue(item, ["id", "id_menu", "menuItemId"]),
        name: firstValue(item, ["nome", "name", "titulo"]) || "Item do cardápio",
        description: firstValue(item, ["descricao", "description"]) || "Preparado hoje pela cozinha.",
        category,
        emoji: firstValue(item, ["emoji", "icone"]) || categories[category].emoji,
        available: !unavailable,
      };
    }
  
    function renderSummary() {
      const list = document.querySelector("#summary-items");
      if (!list) return;
  
      const selected = menuItems.filter((item) => quantities.has(String(item.id)));
      list.innerHTML = selected.length
        ? selected.map((item) => `<li><span>${escapeHtml(item.emoji)}</span><span>${escapeHtml(item.name)}</span><b>×${quantities.get(String(item.id))}</b></li>`).join("")
        : "<li class=\"summary-empty\">🍽️<br>Seu prato começa<br>com uma escolha.</li>";
  
      const total = [...quantities.values()].reduce((sum, amount) => sum + amount, 0);
      document.querySelector("#total-items").textContent = String(total);
      const name = document.querySelector("#nome").value.trim();
      document.querySelector("#confirmar-pedido").disabled = !selected.length || name.length < 2;
    }
  
    function bindMenuActions() {
      const container = document.querySelector("#menu-groups");
      container.querySelectorAll("[data-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = String(button.dataset.pick);
          if (quantities.has(id)) quantities.delete(id);
          else quantities.set(id, 1);
          renderMenu();
          renderSummary();
        });
      });
      container.querySelectorAll("[data-qty]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = String(button.dataset.qty);
          const next = (quantities.get(id) || 0) + Number(button.dataset.delta);
          if (next < 1) quantities.delete(id);
          else quantities.set(id, Math.min(5, next));
          renderMenu();
          renderSummary();
        });
      });
    }
  
    function renderMenu() {
      const container = document.querySelector("#menu-groups");
      const groups = Object.keys(categories)
        .map((category) => ({ category, items: menuItems.filter((item) => item.category === category) }))
        .filter((group) => group.items.length);
  
      container.innerHTML = groups.map((group) => {
        const category = categories[group.category];
        const cards = group.items.map((item) => {
          const id = String(item.id);
          const quantity = quantities.get(id) || 0;
          return `<article class="menu-card ${quantity ? "is-selected" : ""} ${item.available ? "" : "is-unavailable"}">
            <button class="menu-pick" type="button" data-pick="${escapeHtml(id)}" ${item.available ? "" : "disabled"} aria-pressed="${quantity > 0}">
              <span class="food-emoji">${escapeHtml(item.emoji)}</span><span class="food-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></span><span class="pick-icon">${quantity ? "✓" : "+"}</span>
            </button>
            ${quantity ? `<div class="quantity-row"><span>Quantidade</span><div><button type="button" data-qty="${escapeHtml(id)}" data-delta="-1" aria-label="Diminuir ${escapeHtml(item.name)}">−</button><b>${quantity}</b><button type="button" data-qty="${escapeHtml(id)}" data-delta="1" aria-label="Aumentar ${escapeHtml(item.name)}" ${quantity >= 5 ? "disabled" : ""}>+</button></div></div>` : ""}
            ${item.available ? "" : "<small class=\"unavailable\">Indisponível hoje</small>"}
          </article>`;
        }).join("");
        return `<section class="menu-group"><div class="menu-group-title"><span>${category.emoji}</span><h3>${category.label}</h3><i></i><small>${category.note}</small></div><div class="menu-grid">${cards}</div></section>`;
      }).join("");
  
      bindMenuActions();
    }
  
    document.querySelectorAll(".role-option").forEach((button) => {
      button.addEventListener("click", () => {
        personType = button.dataset.role;
        document.querySelectorAll(".role-option").forEach((option) => {
          const selected = option === button;
          option.classList.toggle("selected", selected);
          option.setAttribute("aria-pressed", String(selected));
        });
        document.querySelector("#turma-field").hidden = personType !== "aluno";
      });
    });
    document.querySelector("#nome").addEventListener("input", renderSummary);
  
    window.PratoProntoMenu = {
      getOrder() {
        const name = document.querySelector("#nome").value.trim();
        const classroom = personType === "aluno" ? document.querySelector("#turma").value.trim() : "";
        const selected = menuItems.filter((item) => quantities.has(String(item.id)));
        return {
          name,
          personType,
          classroom,
          items: selected.map((item) => ({
            id: item.id,
            name: item.name,
            emoji: item.emoji,
            quantity: quantities.get(String(item.id)),
          })),
        };
      },
      setError(message) {
        document.querySelector("#form-error").textContent = message;
      },
      setBusy(busy) {
        const button = document.querySelector("#confirmar-pedido");
        button.disabled = busy;
        button.textContent = busy ? "Enviando pedido…" : "Confirmar meu prato →";
      },
    };
  
    async function loadMenu() {
      try {
        const response = await fetch(`${API}/menu`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.erro || "Não foi possível buscar o cardápio no servidor.");
        const rows = Array.isArray(result)
          ? result
          : result.cardapio || result.menu || result.items || result.data?.cardapio || result.data?.items || result.data || [];
        if (!Array.isArray(rows) || !rows.length) throw new Error("O cardápio está vazio no banco de dados.");
        menuItems = rows.map(normalizeItem).filter((item) => item.id !== undefined);
        if (!menuItems.length) throw new Error("Os itens do cardápio não têm identificador para seleção.");
        menuMessage.hidden = true;
        orderForm.hidden = false;
        renderMenu();
        renderSummary();
      } catch (error) {
        menuMessage.className = "notice notice-error";
        menuMessage.textContent = `${error.message} Confira se GET /api/menu está configurado no servidor.`;
      }
    }
  
    loadMenu();
  })();
  