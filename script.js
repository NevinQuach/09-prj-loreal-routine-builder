/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Cloudflare Worker endpoint (this is safe to keep public)
const WORKER_URL = "https://muddy-limit-7eee.787688nev0908.workers.dev/";
const systemMessage = {
  role: "system",
  content:
    "You are a helpful L'Oreal routine advisor. Use prior chat context to answer follow-up questions clearly and consistently. Do not answer unrelated questions. If someone does, then politely decline and change the topic.",

// Set initial message",
};

/* We keep recent messages so follow-up questions stay contextual. */
const chatMessages = [
  {
    role: "assistant",
    content:
      "👋 Hello! I am a LOréal assistant. How may I help you today?",
  },
];
const MAX_HISTORY_MESSAGES = 10;
const SELECTED_PRODUCTS_STORAGE_KEY = "selectedProducts";
const selectedProducts = new Map();
let currentCategoryProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentCategoryProducts = products;

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div
      class="product-card ${selectedProducts.has(product.id) ? "selected" : ""}"
      data-product-id="${product.id}"
      tabindex="0"
      role="button"
      aria-pressed="${selectedProducts.has(product.id) ? "true" : "false"}"
      aria-label="${product.name} by ${product.brand}. Hover or focus to read description. Click to select."
    >
      <div class="product-main">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
      </div>
      <p class="product-description">${product.description}</p>
      <p class="product-card-hint">Hover or focus to read more.</p>
    </div>
  `,
    )
    .join("");
}

function toggleProductSelection(card) {
  const productId = Number(card.dataset.productId);
  const clickedProduct = currentCategoryProducts.find(
    (product) => product.id === productId,
  );

  if (!clickedProduct) {
    return;
  }

  if (selectedProducts.has(productId)) {
    selectedProducts.delete(productId);
  } else {
    selectedProducts.set(productId, clickedProduct);
  }

  saveSelectedProducts();
  syncVisibleProductCards();
  renderSelectedProducts();
}

function syncVisibleProductCards() {
  const cards = productsContainer.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const productId = Number(card.dataset.productId);
    const isSelected = selectedProducts.has(productId);

    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function saveSelectedProducts() {
  const selectedProductsArray = Array.from(selectedProducts.values());

  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify(selectedProductsArray),
  );
}

function loadSelectedProducts() {
  try {
    const savedProducts = localStorage.getItem(SELECTED_PRODUCTS_STORAGE_KEY);

    if (!savedProducts) {
      return;
    }

    const parsedProducts = JSON.parse(savedProducts);

    if (!Array.isArray(parsedProducts)) {
      return;
    }

    parsedProducts.forEach((product) => {
      if (product && Number.isFinite(product.id)) {
        selectedProducts.set(product.id, product);
      }
    });
  } catch (error) {
    localStorage.removeItem(SELECTED_PRODUCTS_STORAGE_KEY);
  }
}

productsContainer.addEventListener("keydown", (e) => {
  const card = e.target.closest(".product-card");

  if (!card) {
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleProductSelection(card);
  }
});

productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) {
    return;
  }

  toggleProductSelection(card);
});

function renderSelectedProducts() {
  const selectedProductsArray = Array.from(selectedProducts.values());

  if (selectedProductsArray.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="selected-products-placeholder">No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProductsArray
    .map(
      (product) => `
      <div class="selected-product-tag">
        <div class="selected-product-text">
          <strong>${product.name}</strong>
          <span>${product.brand}</span>
        </div>
        <button
          type="button"
          class="remove-selected-btn"
          data-remove-product-id="${product.id}"
          aria-label="Remove ${product.name} from selected products"
        >
          Remove
        </button>
      </div>
    `,
    )
    .join("");

  selectedProductsList.innerHTML += `
    <button type="button" id="clearSelectedBtn" class="clear-selected-btn">
      Clear all selected products
    </button>
  `;
}

selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");

  if (removeButton) {
    const productId = Number(removeButton.dataset.removeProductId);

    if (selectedProducts.has(productId)) {
      selectedProducts.delete(productId);
      saveSelectedProducts();
      syncVisibleProductCards();
      renderSelectedProducts();
    }

    return;
  }

  const clearButton = e.target.closest("#clearSelectedBtn");

  if (clearButton) {
    selectedProducts.clear();
    saveSelectedProducts();
    syncVisibleProductCards();
    renderSelectedProducts();
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Send user messages to the Cloudflare Worker, not directly to OpenAI */
chatForm.addEventListener("submit", (e) => {
  handleChatSubmit(e);
});

generateRoutineBtn.addEventListener("click", () => {
  handleGenerateRoutine();
});

function addMessageToChat(role, content) {
  const message = document.createElement("p");

  if (role === "user") {
    message.innerHTML = `<strong>You:</strong> ${content}`;
  } else {
    message.innerHTML = `<strong>Advisor:</strong> ${content}`;
  }

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addMessageToHistory(role, content) {
  chatMessages.push({ role, content });

  if (chatMessages.length > MAX_HISTORY_MESSAGES) {
    chatMessages.splice(0, chatMessages.length - MAX_HISTORY_MESSAGES);
  }
}

function buildMessagesForRequest() {
  return [systemMessage, ...chatMessages];
}

async function requestAssistantReply() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: buildMessagesForRequest() }),
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  const data = await response.json();
  const aiReply =
    data.choices?.[0]?.message?.content ||
    data.reply ||
    "Sorry, I could not generate a response.";

  return aiReply;
}

function buildRoutineRequestMessage(selectedProductsArray) {
  const selectedProductsText = selectedProductsArray
    .map(
      (product) =>
        `- ${product.name} (${product.brand})\\n  Category: ${product.category}\\n  Description: ${product.description}`,
    )
    .join("\\n");

  return `Create a personalized routine using ONLY these selected products:\n${selectedProductsText}\n\nFormat the routine with:\n1. Morning steps\n2. Evening steps\n3. Why this routine works\n4. One caution or usage tip\n\nKeep it beginner-friendly and concise.`;
}

async function handleGenerateRoutine() {
  const selectedProductsArray = Array.from(selectedProducts.values());

  if (selectedProductsArray.length === 0) {
    addMessageToChat(
      "assistant",
      "Please select at least one product, then click Generate Routine.",
    );
    return;
  }

  const routineRequestMessage = buildRoutineRequestMessage(
    selectedProductsArray,
  );

  addMessageToChat(
    "user",
    `Generate a routine with my ${selectedProductsArray.length} selected products.`,
  );

  addMessageToHistory("user", routineRequestMessage);
  generateRoutineBtn.disabled = true;

  try {
    const aiReply = await requestAssistantReply();

    addMessageToChat("assistant", aiReply);
    addMessageToHistory("assistant", aiReply);
  } catch (error) {
    addMessageToChat(
      "assistant",
      "Sorry, there was a problem generating your routine.",
    );
  } finally {
    generateRoutineBtn.disabled = false;
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();

  const messageText = userInput.value.trim();
  if (!messageText) {
    return;
  }

  addMessageToChat("user", messageText);
  userInput.value = "";
  sendBtn.disabled = true;

  addMessageToHistory("user", messageText);

  try {
    const aiReply = await requestAssistantReply();

    addMessageToChat("assistant", aiReply);
    addMessageToHistory("assistant", aiReply);
  } catch (error) {
    addMessageToChat(
      "assistant",
      "Sorry, there was a problem reaching the AI service.",
    );
  } finally {
    sendBtn.disabled = false;
  }
}

addMessageToChat("assistant", chatMessages[0].content);
loadSelectedProducts();
renderSelectedProducts();
