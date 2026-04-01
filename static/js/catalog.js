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
  'Framed Print with Mat': [
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

// DOM refs
const artGrid = document.getElementById('artGrid');
const artSelections = document.getElementById('artSelections');
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
    removeArtSelection(artName);
  } else {
    selectedArt.add(artName);
    card.classList.add('selected');
    addArtSelection(artName);
  }

  updateVisibility();
});

// --- Create a per-art selection block ---
function addArtSelection(artName) {
  const thumb = ART_THUMBNAILS[artName] || '';

  const block = document.createElement('div');
  block.className = 'art-selection';
  block.dataset.art = artName;

  block.innerHTML = `
    <div class="art-selection-header">
      <img class="art-selection-thumb" src="${thumb}" alt="${artName}">
      <span class="art-selection-name">${artName}</span>
      <button type="button" class="art-selection-remove">Remove</button>
    </div>
    <div class="art-selection-items"></div>
    <button type="button" class="add-line-btn">+ Add another format / size</button>
  `;

  // Wire remove button
  block.querySelector('.art-selection-remove').addEventListener('click', () => {
    selectedArt.delete(artName);
    const card = artGrid.querySelector(`[data-art="${CSS.escape(artName)}"]`);
    if (card) card.classList.remove('selected');
    block.remove();
    updateVisibility();
  });

  // Wire "add another" button
  block.querySelector('.add-line-btn').addEventListener('click', () => {
    addLineItem(block, artName);
  });

  artSelections.appendChild(block);

  // Add the first line item automatically
  addLineItem(block, artName);

  // Scroll the new block into view
  block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Add a line item to a specific art block ---
function addLineItem(block, artName) {
  const container = block.querySelector('.art-selection-items');

  const typeOptions = Object.keys(PRODUCT_TYPES)
    .map(t => `<option value="${t}">${t}</option>`)
    .join('');

  const firstType = Object.keys(PRODUCT_TYPES)[0];
  const sizeOptions = PRODUCT_TYPES[firstType]
    .map(s => `<option value="${s}">${s}</option>`)
    .join('');

  const div = document.createElement('div');
  div.className = 'line-item';

  div.innerHTML = `
    <select class="line-item-type" aria-label="Product type for ${artName}">
      ${typeOptions}
    </select>
    <select class="line-item-size" aria-label="Size for ${artName}">
      ${sizeOptions}
    </select>
    <input type="number" class="line-item-qty" value="1" min="1" max="999" aria-label="Quantity">
    <button type="button" class="line-item-remove" aria-label="Remove item" title="Remove">&times;</button>
  `;

  // Wire product type → size cascade
  const typeSelect = div.querySelector('.line-item-type');
  const sizeSelect = div.querySelector('.line-item-size');

  typeSelect.addEventListener('change', () => {
    const sizes = PRODUCT_TYPES[typeSelect.value] || [];
    sizeSelect.innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  });

  // Wire remove — if last item in block, remove the whole art selection
  div.querySelector('.line-item-remove').addEventListener('click', () => {
    div.remove();
    if (container.children.length === 0) {
      selectedArt.delete(artName);
      const card = artGrid.querySelector(`[data-art="${CSS.escape(artName)}"]`);
      if (card) card.classList.remove('selected');
      block.remove();
      updateVisibility();
    }
  });

  container.appendChild(div);
}

// --- Remove art selection block ---
function removeArtSelection(artName) {
  const block = artSelections.querySelector(`[data-art="${CSS.escape(artName)}"]`);
  if (block) block.remove();
}

// --- Show/hide contact form ---
function updateVisibility() {
  const hasSelections = artSelections.children.length > 0;
  requestForm.hidden = !hasSelections;
}

// --- Form submission ---
requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const items = [];
  const blocks = artSelections.querySelectorAll('.art-selection');
  for (const block of blocks) {
    const artName = block.dataset.art;
    const lineItems = block.querySelectorAll('.line-item');
    for (const li of lineItems) {
      items.push({
        art_name: artName,
        product_type: li.querySelector('.line-item-type').value,
        size: li.querySelector('.line-item-size').value,
        quantity: parseInt(li.querySelector('.line-item-qty').value, 10) || 1
      });
    }
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
    artGrid.hidden = true;
    artSelections.hidden = true;
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
  artSelections.innerHTML = '';
  requestForm.reset();
  requestSuccess.hidden = true;

  artGrid.querySelectorAll('.art-card').forEach(c => c.classList.remove('selected'));
  artGrid.hidden = false;
  artSelections.hidden = false;
  requestForm.hidden = true;
});
