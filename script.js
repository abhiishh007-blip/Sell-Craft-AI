const DEFAULT_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:3b';
const form = document.getElementById('listingForm');
const generateBtn = document.getElementById('generateBtn');
const emptyState = document.getElementById('emptyState');
const outputContent = document.getElementById('outputContent');
const outputStatus = document.getElementById('outputStatus');
const engineLabel = document.getElementById('engineLabel');
const settingsDialog = document.getElementById('settingsDialog');
const endpointInput = document.getElementById('endpointInput');
const toast = document.getElementById('toast');
let endpoint = localStorage.getItem('sellcraft-endpoint') || DEFAULT_ENDPOINT;
let lastProduct = null;
let toastTimer;
endpointInput.value = endpoint;

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function getProduct() {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    name: data.productName.trim(), category: data.category, platform: data.platform,
    features: data.features.trim(), audience: data.audience.trim() || 'people looking for a useful, well-made product',
    tone: data.tone, price: data.price.trim(), keywords: data.keywords.trim()
  };
}
function makePrompt(p) {
  return `You are SellCraft, an expert ecommerce copywriter for small independent sellers. Create an honest, useful listing using only facts supplied below. Never invent certifications, materials, measurements, shipping promises, reviews, scarcity, or product benefits not supported by the input. Avoid exaggerated claims. Adapt formatting to ${p.platform}.\n\nPRODUCT: ${p.name}\nCATEGORY: ${p.category}\nFEATURES / FACTS: ${p.features}\nTARGET CUSTOMER: ${p.audience}\nBRAND VOICE: ${p.tone}\nPRICE: ${p.price || 'Not supplied'}\nKEYWORDS: ${p.keywords || 'Choose relevant natural search terms'}\n\nReturn only valid JSON with exactly these keys: "title" (clear and searchable, ideally under 140 characters), "description" (2-4 short paragraphs, persuasive but accurate; include a gentle call to action), and "tags" (array of 8-12 short search phrases). Do not use markdown fences.`;
}
function parseModelResponse(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The model returned an unexpected format. Please try again.');
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!parsed.title || !parsed.description || !Array.isArray(parsed.tags)) throw new Error('The model response was missing a title, description, or tags. Try again.');
  return { title: String(parsed.title), description: String(parsed.description), tags: parsed.tags.map(String).slice(0, 12) };
}
function renderResult(result, sourceLabel) {
  document.getElementById('resultTitle').textContent = result.title;
  document.getElementById('resultDescription').textContent = result.description;
  const tags = document.getElementById('resultTags');
  tags.replaceChildren();
  result.tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag.replace(/^#/, '');
    tags.appendChild(span);
  });
  emptyState.classList.add('hidden');
  outputContent.classList.remove('hidden');
  outputStatus.textContent = 'DRAFT READY';
  engineLabel.textContent = sourceLabel;
}
async function generateListing(useDemoOnFailure = true) {
  if (!form.reportValidity()) return;
  lastProduct = getProduct();
  setLoading(true);
  outputStatus.textContent = 'GENERATING…';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: makePrompt(lastProduct), stream: false, format: 'json', options: { temperature: 0.65 } })
    });
    if (!response.ok) throw new Error(`Ollama responded with ${response.status}.`);
    const data = await response.json();
    if (!data.response) throw new Error('Ollama did not return generated text.');
    const result = parseModelResponse(data.response);
    renderResult(result, `Generated locally with ${data.model || MODEL}`);
    saveDraft(lastProduct, result);
    notify('Your listing is ready to edit.');
  } catch (error) {
    if (useDemoOnFailure) {
      const result = createDemoListing(lastProduct);
      renderResult(result, 'Demo mode · template output, not AI-generated');
      saveDraft(lastProduct, result);
      notify('Ollama wasn’t reachable, so demo mode created a sample draft.');
    } else {
      notify('Could not connect. Check Ollama and the endpoint.');
      outputStatus.textContent = 'CONNECTION ISSUE';
    }
  } finally {
    setLoading(false);
  }
}
function createDemoListing(p) {
  const keyword = p.keywords.split(',').map(x => x.trim()).filter(Boolean);
  const title = `${p.name} | ${p.category}`.slice(0, 140);
  const priceLine = p.price ? `Price: ${p.price}. ` : '';
  const description = `${p.name} is made for ${p.audience}. ${p.features}\n\n${priceLine}Whether you're shopping for yourself or choosing something thoughtful, explore the details and see if it fits your needs. Please review the product specifications before ordering.`;
  const tags = [...keyword, p.name.toLowerCase(), p.category.toLowerCase(), 'small business find', 'thoughtful gift', 'everyday essential', 'independent seller', 'unique product', 'gift idea', 'shop small'].filter(Boolean);
  return { title, description, tags: [...new Set(tags)].slice(0, 12) };
}
function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.innerHTML = isLoading ? '<span class="spinner">◌</span> Creating your listing…' : '<span>✦</span> Generate my listing <span class="btn-arrow">↗</span>';
}
function saveDraft(product, result) {
  try {
    const drafts = JSON.parse(localStorage.getItem('sellcraft-drafts') || '[]');
    drafts.unshift({ product: product.name, title: result.title, savedAt: new Date().toISOString(), result });
    localStorage.setItem('sellcraft-drafts', JSON.stringify(drafts.slice(0, 10)));
  } catch (_) { /* Storage may be disabled; generation still works. */ }
}
function getAllText() {
  const title = document.getElementById('resultTitle').innerText.trim();
  const description = document.getElementById('resultDescription').innerText.trim();
  const tags = [...document.querySelectorAll('#resultTags .tag')].map(el => el.innerText.trim());
  return `PRODUCT LISTING\n${'='.repeat(30)}\n\nTITLE\n${title}\n\nDESCRIPTION\n${description}\n\nSEARCH TAGS\n${tags.join(', ')}`;
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify('Copied to clipboard.');
  } catch (_) {
    const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy'); area.remove();
    notify(ok ? 'Copied to clipboard.' : 'Copy failed — select the text and copy it manually.');
  }
}
form.addEventListener('submit', event => { event.preventDefault(); generateListing(true); });
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => {
  const target = document.getElementById(button.dataset.copy);
  copyText(target.innerText.trim());
}));
document.getElementById('copyAllBtn').addEventListener('click', () => copyText(getAllText()));
document.getElementById('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([getAllText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `${(lastProduct?.name || 'sellcraft-listing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); notify('Listing exported as a text file.');
});
document.getElementById('regenerateBtn').addEventListener('click', () => { if (lastProduct) generateListing(true); else notify('Fill in the product details first.'); });
document.getElementById('connectionBtn').addEventListener('click', () => settingsDialog.showModal());
document.getElementById('helpBtn').addEventListener('click', () => settingsDialog.showModal());
document.getElementById('saveEndpointBtn').addEventListener('click', () => {
  const value = endpointInput.value.trim();
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
  catch (_) { notify('Enter a valid HTTP or HTTPS endpoint.'); return; }
  endpoint = value; localStorage.setItem('sellcraft-endpoint', endpoint); settingsDialog.close(); notify('Local AI endpoint saved.');
});
document.getElementById('testConnectionBtn').addEventListener('click', async () => {
  const original = document.getElementById('testConnectionBtn').textContent;
  document.getElementById('testConnectionBtn').disabled = true;
  document.getElementById('testConnectionBtn').textContent = 'Testing…';
  try {
    const base = endpointInput.value.trim().replace(/\/api\/generate\/?$/, '');
    const response = await fetch(`${base}/api/tags`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const found = (data.models || []).some(m => (m.name || '').startsWith(MODEL));
    notify(found ? `Connected. ${MODEL} is installed.` : `Connected to Ollama, but ${MODEL} may not be installed. Run: ollama pull ${MODEL}`);
  } catch (_) { notify('Connection failed. Start Ollama and check browser CORS settings.'); }
  finally { document.getElementById('testConnectionBtn').disabled = false; document.getElementById('testConnectionBtn').textContent = original; }
});
document.getElementById('historyNav').addEventListener('click', () => {
  try {
    const drafts = JSON.parse(localStorage.getItem('sellcraft-drafts') || '[]');
    if (!drafts.length) { notify('No saved drafts yet. Generate a listing to start your history.'); return; }
    const choice = drafts[0];
    document.getElementById('productName').value = choice.product;
    renderResult(choice.result, `Restored saved draft · ${new Date(choice.savedAt).toLocaleString()}`);
    notify(`Restored latest draft: ${choice.product}`);
  } catch (_) { notify('Draft history is unavailable in this browser.'); }
});

// The app can be previewed without installing a model. This checks whether Ollama is reachable;
// it does not send product details until the user clicks Generate.
(async function checkConnection() {
  try {
    const base = endpoint.replace(/\/api\/generate\/?$/, '');
    const response = await fetch(`${base}/api/tags`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const found = (data.models || []).some(m => (m.name || '').startsWith(MODEL));
    engineLabel.textContent = found ? `Connected · ${MODEL} ready` : `Ollama connected · install ${MODEL}`;
    document.querySelector('.footer-dot').style.background = found ? '#a8f0cf' : '#f0c77b';
  } catch (_) { engineLabel.textContent = 'Ollama offline · demo mode available'; }
})();
