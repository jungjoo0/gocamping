const FAMILIES = ["단비네", "세연네"];
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbx33xYnOt5lX4coK5DTrZ7LJ0uaWMte07qyFQ9m6_QAT2NKmN-tfCTBTJEd1HCCqSre/exec";
const STORAGE_KEYS = {
  family: "camping.family",
  apiUrl: "camping.apiUrl",
  localItems: "camping.localItems"
};

const state = {
  family: localStorage.getItem(STORAGE_KEYS.family) || "",
  apiUrl: localStorage.getItem(STORAGE_KEYS.apiUrl) || DEFAULT_API_URL,
  items: [],
  activeView: "my",
  loading: false
};

const els = {
  familyScreen: document.querySelector("#family-screen"),
  mainScreen: document.querySelector("#main-screen"),
  familyTitle: document.querySelector("#family-title"),
  notice: document.querySelector("#notice"),
  itemForm: document.querySelector("#item-form"),
  editingId: document.querySelector("#editing-id"),
  itemName: document.querySelector("#item-name"),
  quantity: document.querySelector("#quantity"),
  saveButton: document.querySelector("#save-button"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  myList: document.querySelector("#my-list"),
  compareList: document.querySelector("#compare-list"),
  apiUrl: document.querySelector("#api-url")
};

document.querySelectorAll(".family-button").forEach((button) => {
  button.addEventListener("click", () => selectFamily(button.dataset.family));
});

document.querySelector("#change-family-button").addEventListener("click", () => {
  state.family = "";
  localStorage.removeItem(STORAGE_KEYS.family);
  render();
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#refresh-my-button").addEventListener("click", loadItems);
document.querySelector("#refresh-compare-button").addEventListener("click", loadItems);

document.querySelector("#save-api-url-button").addEventListener("click", () => {
  state.apiUrl = els.apiUrl.value.trim();
  localStorage.setItem(STORAGE_KEYS.apiUrl, state.apiUrl);
  showNotice(state.apiUrl ? "저장했습니다. 이제 구글시트와 연결됩니다." : "URL을 비웠습니다. 이 브라우저 안에만 임시 저장됩니다.");
  loadItems();
});

els.cancelEditButton.addEventListener("click", resetForm);
els.itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const itemName = els.itemName.value.trim();
  const quantity = Number(els.quantity.value || 1);

  if (!itemName || quantity < 1) {
    showNotice("장비명과 수량을 확인해 주세요.");
    return;
  }

  const id = els.editingId.value;
  if (id) {
    await updateItem(id, { itemName, quantity });
  } else {
    await createItem({ itemName, quantity });
  }
});

init();

function init() {
  els.apiUrl.value = state.apiUrl;
  render();
  if (state.family) {
    loadItems();
  }
}

function selectFamily(family) {
  state.family = family;
  localStorage.setItem(STORAGE_KEYS.family, family);
  render();
  loadItems();
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach((viewEl) => viewEl.classList.add("hidden"));
  document.querySelector(`#view-${view}`).classList.remove("hidden");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "compare") {
    renderCompareList();
  }
}

function render() {
  const hasFamily = FAMILIES.includes(state.family);
  els.familyScreen.classList.toggle("hidden", hasFamily);
  els.mainScreen.classList.toggle("hidden", !hasFamily);

  if (hasFamily) {
    els.familyTitle.textContent = state.family;
    setView(state.activeView);
    renderMyList();
    renderCompareList();
    if (!state.apiUrl) {
      showNotice("아직 Apps Script URL이 없습니다. 설정에서 URL을 넣기 전까지는 이 브라우저에만 임시 저장됩니다.", false);
    }
  }
}

function showNotice(message, autoHide = true) {
  els.notice.textContent = message;
  els.notice.classList.remove("hidden");
  if (autoHide) {
    window.setTimeout(() => els.notice.classList.add("hidden"), 2600);
  }
}

async function loadItems() {
  setLoading(true);
  try {
    state.items = await request("listItems", {});
    renderMyList();
    renderCompareList();
  } catch (error) {
    showNotice(error.message || "목록을 불러오지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

async function createItem(data) {
  setLoading(true);
  try {
    await request("createItem", { ...data, family: state.family });
    resetForm();
    await loadItems();
  } catch (error) {
    showNotice(error.message || "장비를 추가하지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

async function updateItem(id, data) {
  setLoading(true);
  try {
    await request("updateItem", { id, ...data });
    resetForm();
    await loadItems();
  } catch (error) {
    showNotice(error.message || "장비를 수정하지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

async function deleteItem(id) {
  if (!window.confirm("이 장비를 삭제할까요?")) {
    return;
  }
  setLoading(true);
  try {
    await request("deleteItem", { id });
    await loadItems();
  } catch (error) {
    showNotice(error.message || "장비를 삭제하지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

async function chooseFamily(itemName, selectedFamily) {
  setLoading(true);
  try {
    await request("chooseFamily", { itemName, selectedFamily });
    await loadItems();
  } catch (error) {
    showNotice(error.message || "선택을 저장하지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;
  els.saveButton.disabled = isLoading;
  document.querySelectorAll("button").forEach((button) => {
    if (!button.classList.contains("nav-button")) {
      button.disabled = isLoading;
    }
  });
}

function renderMyList() {
  const myItems = state.items.filter((item) => item.family === state.family);
  if (!myItems.length) {
    els.myList.innerHTML = `<div class="empty-state">아직 등록한 공용 장비가 없습니다.</div>`;
    return;
  }

  els.myList.innerHTML = myItems
    .map((item) => `
      <article class="item-card">
        <div>
          <p class="item-name">${escapeHtml(item.itemName)}</p>
          <p class="item-meta">${Number(item.quantity || 1)}개</p>
        </div>
        <div class="card-actions">
          <button class="small-button" type="button" data-edit="${item.id}">수정</button>
          <button class="small-button danger-button" type="button" data-delete="${item.id}">삭제</button>
        </div>
      </article>
    `)
    .join("");

  els.myList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => startEdit(button.dataset.edit));
  });
  els.myList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
}

function renderCompareList() {
  const groups = groupItems(state.items);
  if (!groups.length) {
    els.compareList.innerHTML = `<div class="empty-state">비교할 장비가 없습니다.</div>`;
    return;
  }

  els.compareList.innerHTML = groups
    .map((group) => {
      const selectedFamily = group.selectedFamily || "";
      return `
        <article class="compare-card">
          <h3 class="compare-title">${escapeHtml(group.itemName)}</h3>
          ${FAMILIES.map((family) => renderFamilyRow(family, group.byFamily[family])).join("")}
          <div class="choice-grid">
            ${FAMILIES.map((family) => `
              <button class="choice-button ${selectedFamily === family ? "selected" : ""}" type="button" data-choose="${escapeHtml(group.itemName)}" data-family="${family}">
                ${family}
              </button>
            `).join("")}
          </div>
        </article>
      `;
    })
    .join("");

  els.compareList.querySelectorAll("[data-choose]").forEach((button) => {
    button.addEventListener("click", () => chooseFamily(button.dataset.choose, button.dataset.family));
  });
}

function renderFamilyRow(family, item) {
  if (!item) {
    return `<div class="family-row"><strong>${family}</strong><span class="missing">없음</span></div>`;
  }
  return `
    <div class="family-row">
      <strong>${family}</strong>
      <span>${Number(item.quantity || 1)}개</span>
    </div>
  `;
}

function groupItems(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = normalizeItemName(item.itemName);
    if (!map.has(key)) {
      map.set(key, {
        itemName: item.itemName,
        selectedFamily: item.selectedFamily || "",
        byFamily: {}
      });
    }

    const group = map.get(key);
    group.selectedFamily = item.selectedFamily || group.selectedFamily;
    group.byFamily[item.family] = item;
  });

  return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName, "ko"));
}

function startEdit(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  els.editingId.value = item.id;
  els.itemName.value = item.itemName;
  els.quantity.value = item.quantity || 1;
  els.saveButton.textContent = "수정";
  els.cancelEditButton.classList.remove("hidden");
  els.itemName.focus();
}

function resetForm() {
  els.editingId.value = "";
  els.itemName.value = "";
  els.quantity.value = "1";
  els.saveButton.textContent = "추가";
  els.cancelEditButton.classList.add("hidden");
}

function request(action, payload) {
  if (!state.apiUrl) {
    return localRequest(action, payload);
  }

  return jsonp(state.apiUrl, {
    action,
    payload: JSON.stringify(payload)
  });
}

function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `campingCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const query = new URLSearchParams({ ...params, callback: callbackName });

    window[callbackName] = (response) => {
      cleanup();
      if (!response || response.ok === false) {
        reject(new Error(response?.error || "요청이 실패했습니다."));
        return;
      }
      resolve(response.data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Apps Script URL을 확인해 주세요."));
    };

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }

    script.src = `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
    document.body.appendChild(script);
  });
}

function localRequest(action, payload) {
  const items = readLocalItems();
  const now = new Date().toISOString();

  if (action === "listItems") {
    return Promise.resolve(items);
  }

  if (action === "createItem") {
    items.push({
      id: crypto.randomUUID(),
      family: payload.family,
      itemName: payload.itemName,
      quantity: Number(payload.quantity || 1),
      selectedFamily: "",
      createdAt: now,
      updatedAt: now
    });
  }

  if (action === "updateItem") {
    const item = items.find((entry) => entry.id === payload.id);
    if (item) {
      item.itemName = payload.itemName;
      item.quantity = Number(payload.quantity || 1);
      item.updatedAt = now;
    }
  }

  if (action === "deleteItem") {
    const index = items.findIndex((entry) => entry.id === payload.id);
    if (index >= 0) {
      items.splice(index, 1);
    }
  }

  if (action === "chooseFamily") {
    const key = normalizeItemName(payload.itemName);
    items.forEach((item) => {
      if (normalizeItemName(item.itemName) === key) {
        item.selectedFamily = payload.selectedFamily;
        item.updatedAt = now;
      }
    });
  }

  localStorage.setItem(STORAGE_KEYS.localItems, JSON.stringify(items));
  return Promise.resolve(action === "listItems" ? items : { ok: true });
}

function readLocalItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.localItems) || "[]");
  } catch {
    return [];
  }
}

function normalizeItemName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
