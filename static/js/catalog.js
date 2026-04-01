/* ============================================
   Danielle Cowdrey Art — Gallery Catalog
   Invoice Request Form Logic
   ============================================ */

const PRODUCT_TYPES = {
  'Canvas Print': [
    '6×6"','8×8"','8×10"','8×12"','9×12"','10×10"','10×20"','11×14"',
    '12×12"','12×16"','12×18"','12×24"','12×36"','14×14"','16×16"',
    '16×20"','16×24"','16×32"','16×48"','18×18"','18×24"','18×26"',
    '20×20"','20×24"','20×28"','20×30"','20×40"','20×60"','24×24"',
    '24×30"','24×32"','24×36"','24×48"','26×26"','26×40"','28×28"',
    '28×40"','30×30"','30×40"','30×60"','32×32"','32×48"','36×36"',
    '37×37"','40×55"','40×60"'
  ],
  'Framed Canvas': [
    '8×10"','9×12"','11×14"','12×12"','12×16"','12×18"','16×16"',
    '16×20"','18×24"','20×28"','20×30"','24×32"','24×36"'
  ],
  'Framed Poster with Mat': [
    '12×16"','12×18"','16×20"','18×24"','24×36"'
  ]
};

const ART_THUMBNAILS = {
  "Absolem's Garden":       '/static/thumbnails/AbsolemsGardenWITHSIG-web.jpg',
  'Cheshire Smile':         '/static/thumbnails/CheshireSmileWITHSIG-web.jpg',
  'Dragon Mischief':        '/static/thumbnails/DragonMischiefWITHSIG-web.jpg',
  'Gemstone Hatchlings':    '/static/thumbnails/GemstoneHatchlingsWITHSIG-web.jpg',
  'Jewel of the Rainforest':'/static/thumbnails/JeweloftheRainforestWITHSIG-web.jpg',
  'Neon Depths':            '/static/thumbnails/NeonDepths-WithSIG-web.jpg',
  'Neon Peonies':           '/static/thumbnails/NeonPeonies-WITHSIG-web.jpg',
  'Parisian Prism':         '/static/thumbnails/ParisianPrismWITHSIG-web.jpg',
  'Quadceratops':           '/static/thumbnails/Quadceratops-WITHSIG-web.jpg',
  'Rainbow Safari':         '/static/thumbnails/RainbowSafariWITHSIG-web.jpg',
  'Serpent Queen':           '/static/thumbnails/SerpentQueen-WITHSIG-web.jpg',
  'Taste the Rainbow':      '/static/thumbnails/Taste-the-RainbowWITHSIG-web.jpg',
  'Turbo Mirage':           '/static/thumbnails/TurboMirage-withSig-web.jpg',
  'Wooly Mammoth':          '/static/thumbnails/WoolyMammoth-WITHSIG-web.jpg'
};

// State
let selectedArt = new Set();
let lineItemId = 0;

// DOM refs
const artGrid = document.getElementById('artGrid');
const lineItemsWrapper = document.getElementById('lineItemsWrapper');
const lineItemsContainer = document.getElementById('lineItems');
const addVariantBtn = document.getElementById('addVariantBtn');
const requestForm = document.getElementById('requestForm');
const submitBtn = document.getElementById('submitBtn');
const requestSuccess = document.getElementById('requestSuccess');
const resetBtn = document.getElementById('resetBtn');

// --- Art card toggle ---
artGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.art-card');
  if (!card) return;
  const artName = card.dataset.art;

  if (selectedArt.has(artName)) {
    selectedArt.delete(artName);
    card.classList.remove('selected');
    removeLineItemsByArt(artName);
  } else {
    selectedArt.add(artName);
    card.classList.add('selected');
    addLineItem(artName);
  }

  updateVisibility();
});

// --- Add line item ---
function addLineItem(artName, productType, size, quantity) {
  lineItemId++;
  const id = lineItemId;
  const thumb = ART_THUMBNAILS[artName] || '';

  const div = document.createElement('div');
  div.className = 'line-item';
  div.dataset.id = id;
  div.dataset.art = artName;

  // Build product type options
  const typeOptions = Object.keys(PRODUCT_TYPES)
    .map(t => `<option value="${t}"${t === productType ? ' selected' : ''}>${t}</option>`)
    .join('');

  // Build size options for initial product type
  const initialType = productType || Object.keys(PRODUCT_TYPES)[0];
  const sizeOptions = PRODUCT_TYPES[initialType]
    .map(s => `<option value="${s}"${s === size ? ' selected' : ''}>${s}</option>`)
    .join('');

  div.innerHTML = `
    <img class="line-item-thumb" src="${thumb}" alt="${artName}">
    <span class="line-item-art">${artName}</span>
    <select class="line-item-type" aria-label="Product type for ${artName}">
      ${typeOptions}
    </select>
    <select class="line-item-size" aria-label="Size for ${artName}">
      ${sizeOptions}
    </select>
    <input type="number" class="line-item-qty" value="${quantity || 1}" min="1" max="999" aria-label="Quantity">
    <button type="button" class="line-item-remove" aria-label="Remove item" title="Remove">&times;</button>
  `;

  // Wire up product type → size cascade
  const typeSelect = div.querySelector('.line-item-type');
  const sizeSelect = div.querySelector('.line-item-size');

  typeSelect.addEventListener('change', () => {
    const sizes = PRODUCT_TYPES[typeSelect.value] || [];
    sizeSelect.innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  });

  // Wire up remove button
  div.querySelector('.line-item-remove').addEventListener('click', () => {
    div.remove();
    // If no more line items for this art, deselect the card
    const remaining = lineItemsContainer.querySelectorAll(`[data-art="${CSS.escape(artName)}"]`);
    if (remaining.length === 0) {
      selectedArt.delete(artName);
      const card = artGrid.querySelector(`[data-art="${CSS.escape(artName)}"]`);
      if (card) card.classList.remove('selected');
    }
    updateVisibility();
  });

  lineItemsContainer.appendChild(div);
}

// --- Remove all line items for a given art name ---
function removeLineItemsByArt(artName) {
  const items = lineItemsContainer.querySelectorAll(`[data-art="${CSS.escape(artName)}"]`);
  items.forEach(el => el.remove());
}

// --- "Add another line item" button ---
addVariantBtn.addEventListener('click', () => {
  if (selectedArt.size === 0) return;
  // Default to the first selected art piece
  const firstArt = [...selectedArt][0];
  addLineItem(firstArt);
});

// --- Show/hide sections ---
function updateVisibility() {
  const hasItems = lineItemsContainer.children.length > 0;
  lineItemsWrapper.hidden = !hasItems;
  requestForm.hidden = !hasItems;
}

// --- Form submission ---
requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const items = [];
  const lineItems = lineItemsContainer.querySelectorAll('.line-item');
  for (const li of lineItems) {
    items.push({
      art_name: li.dataset.art,
      product_type: li.querySelector('.line-item-type').value,
      size: li.querySelector('.line-item-size').value,
      quantity: parseInt(li.querySelector('.line-item-qty').value, 10) || 1
    });
  }

  if (items.length === 0) return;

  const payload = {
    name: document.getElementById('reqName').value.trim(),
    email: document.getElementById('reqEmail').value.trim(),
    phone: document.getElementById('reqPhone').value.trim() || null,
    company: document.getElementById('reqCompany').value.trim() || null,
    notes: document.getElementById('reqNotes').value.trim() || null,
    items
  };

  submitBtn.disabled = true;
  submitBtn.querySelector('.submit-text').hidden = true;
  submitBtn.querySelector('.submit-loading').hidden = false;

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Something went wrong. Please try again.');
    }

    // Success
    document.getElementById('request').querySelector('.art-grid').hidden = true;
    lineItemsWrapper.hidden = true;
    requestForm.hidden = true;
    requestSuccess.hidden = false;
    requestSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.submit-text').hidden = false;
    submitBtn.querySelector('.submit-loading').hidden = true;
  }
});

// --- Reset form ---
resetBtn.addEventListener('click', () => {
  selectedArt.clear();
  lineItemsContainer.innerHTML = '';
  lineItemId = 0;
  requestForm.reset();
  requestSuccess.hidden = true;

  // Deselect all art cards and show the grid
  artGrid.querySelectorAll('.art-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('request').querySelector('.art-grid').hidden = false;
  lineItemsWrapper.hidden = true;
  requestForm.hidden = true;
});
