const el = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const currentView = params.get('view') || 'pet';
let state;
let characters = [];
let conversation = [];
let saveTimer;

function text(node, value) { if (node) node.textContent = value; }
function activeCharacter() { return characters.find(item => item.id === state.character) || characters[0]; }
function showError(message) {
  const bubble = document.createElement('div'); bubble.className = 'system-message error'; bubble.textContent = message;
  el('messages')?.appendChild(bubble); el('messages')?.scrollTo({ top: el('messages').scrollHeight, behavior: 'smooth' });
}
async function save(delta = {}) {
  state = { ...state, ...delta };
  state = await window.companion.saveState(state);
  applyState();
}
function saveSoon(delta) {
  clearTimeout(saveTimer); saveTimer = setTimeout(() => save(delta), 160);
}
function applyState() {
  if (!state || !characters.length) return;
  const character = activeCharacter();
  if (currentView === 'pet') {
    el('pet').classList.remove('hidden');
    el('petImage').src = character.src;
    el('petImage').alt = character.name;
    el('petName').textContent = character.name.toUpperCase();
    el('petMood').textContent = state.settings.mood.toUpperCase();
    el('pet').style.setProperty('--pet-scale', state.size || 1);
    el('nameCard').classList.toggle('hidden', !!state.setupComplete);
    el('petCharacter').classList.toggle('hidden', !state.setupComplete);
    if (!state.setupComplete) setTimeout(() => el('nameInput')?.focus(), 120);
  } else if (currentView === 'chat') {
    el('chat').classList.remove('hidden');
  } else if (currentView === 'mainframe') {
    el('mainframe').classList.remove('hidden');
    buildCharacterCards(); fillControls(); renderMemories();
  }
}
function buildCharacterCards() {
  const host = el('characterGrid'); if (!host) return;
  host.replaceChildren();
  characters.forEach((character, index) => {
    const card = document.createElement('button');
    card.className = `character-card ${state.character === character.id ? 'selected' : ''}`;
    card.type = 'button'; card.setAttribute('aria-pressed', String(state.character === character.id));
    card.innerHTML = `<span class="corner-index">0${index + 1}</span><img src="${character.src}" alt=""><span class="character-card-name"></span><span class="character-card-tag">${index === 0 ? 'DEFAULT' : 'ALT PROFILE'}</span>`;
    card.querySelector('.character-card-name').textContent = character.name;
    card.addEventListener('click', () => save({ character: character.id }));
    host.appendChild(card);
  });
}
function fillControls() {
  if (!el('sizeControl')) return;
  el('sizeControl').value = state.size || 1; text(el('sizeOutput'), `${Math.round((state.size || 1) * 100)}%`);
  el('moodControl').value = state.settings.mood;
  const ranges = [
    ['humorControl', 'humor', 'humorValue'], ['friendControl', 'friendliness', 'friendValue'], ['sassControl', 'sass', 'sassValue'], ['proactiveControl', 'proactive', 'proactiveValue']
  ];
  ranges.forEach(([control, key, output]) => { el(control).value = state.settings[key]; text(el(output), key === 'proactive' ? (Number(state.settings[key]) === 0 ? 'OFF' : `${state.settings[key]} / 5`) : `${state.settings[key]}%`); });
  el('quietControl').checked = !!state.settings.quietMode;
  el('intervalControl').value = String(state.settings.checkInMinutes);
  el('soundControl').checked = !!state.settings.startupSound;
  el('speechControl').checked = !!state.settings.spokenReplies;
  text(el('mfStatus'), 'LOCAL DEVICE');
  const modelSelect = el('modelControl');
  if (!modelSelect.dataset.ready) {
    modelSelect.innerHTML = '<option value="gemma4:e4b">gemma4:e4b — preferred</option><option value="custom">Custom model…</option>';
    modelSelect.dataset.ready = 'true';
  }
  modelSelect.value = ['gemma4:e4b', 'custom'].includes(state.model) ? state.model : 'custom';
  if (state.model !== 'gemma4:e4b') el('modelCustom').value = state.model;
}
function addMessage(role, content) {
  const bubble = document.createElement('article'); bubble.className = `message ${role}`;
  const label = document.createElement('div'); label.className = 'message-label'; label.textContent = role === 'user' ? `YOU${state.userName ? ` / ${state.userName}` : ''}` : activeCharacter().name.toUpperCase();
  const body = document.createElement('div'); body.className = 'message-body'; body.textContent = content;
  bubble.append(label, body); el('messages').appendChild(bubble); el('messages').scrollTo({ top: el('messages').scrollHeight, behavior: 'smooth' });
}
function renderConversation() {
  el('messages').replaceChildren();
  if (!conversation.length) {
    const intro = document.createElement('div'); intro.className = 'conversation-intro';
    intro.innerHTML = '<span class="eyebrow">LOCAL CHAT / READY WHEN YOU ARE</span><p>He keeps the introduction short.</p>';
    el('messages').appendChild(intro);
  }
  conversation.forEach(message => addMessage(message.role, message.content));
}
async function submitChat(event) {
  event.preventDefault();
  const input = el('chatInput'); const value = input.value.trim(); if (!value) return;
  input.value = ''; input.disabled = true; el('chatForm').classList.add('busy');
  conversation.push({ role: 'user', content: value });
  await save({ conversation: conversation.slice(-60) });
  addMessage('user', value);
  const typing = document.createElement('div'); typing.className = 'typing'; typing.textContent = 'Checking the property line…'; el('messages').appendChild(typing);
  const result = await window.companion.sendMessage(conversation.slice(0, -1), value);
  typing.remove(); input.disabled = false; input.focus(); el('chatForm').classList.remove('busy');
  if (!result.ok) { showError(result.error); return; }
  conversation.push({ role: 'assistant', content: result.text });
  await save({ conversation: conversation.slice(-60) }); addMessage('assistant', result.text);
  if (state.settings.spokenReplies && 'speechSynthesis' in window) {
    const spoken = new SpeechSynthesisUtterance(result.text.replace(/^This is private property, but I'll tell you\s*[—,-]?\s*/i, ''));
    speechSynthesis.speak(spoken);
  }
}
function renderMemories() {
  const host = el('memoryList'); if (!host) return;
  host.replaceChildren();
  if (!state.memories.length) { const empty = document.createElement('p'); empty.className = 'empty-note'; empty.textContent = 'No saved memories yet.'; host.appendChild(empty); }
  state.memories.forEach((memory, index) => {
    const item = document.createElement('div'); item.className = 'memory-item';
    const input = document.createElement('textarea'); input.rows = 2; input.maxLength = 800; input.value = memory.text;
    input.addEventListener('change', () => { state.memories[index].text = input.value.trim(); save({ memories: state.memories }); });
    const remove = document.createElement('button'); remove.className = 'remove-memory'; remove.textContent = 'DELETE'; remove.type = 'button';
    remove.addEventListener('click', () => { const memories = state.memories.filter((_, i) => i !== index); save({ memories }); });
    item.append(input, remove); host.appendChild(item);
  });
}
async function refreshOllama() {
  if (!el('ollamaStatus')) return;
  text(el('ollamaStatus'), 'Checking localhost…'); text(el('ollamaDetail'), state.ollamaUrl);
  const result = await window.companion.ollamaStatus();
  text(el('ollamaStatus'), result.connected ? 'Ollama connected' : 'Ollama not detected');
  text(el('ollamaDetail'), result.connected ? `${result.models.length} installed model${result.models.length === 1 ? '' : 's'}` : `Setup: start Ollama, then pull a model. ${result.error || ''}`);
  el('ollamaStatus').className = result.connected ? 'connected' : 'disconnected';
  const select = el('modelControl'); const chosen = state.model;
  const escape = model => model.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const options = ['<option value="gemma4:e4b">gemma4:e4b — preferred</option>', ...result.models.map(model => `<option value="${escape(model)}">${escape(model)}</option>`), '<option value="custom">Custom model…</option>'];
  select.innerHTML = [...new Set(options)].join('');
  select.value = [...select.options].some(option => option.value === chosen) ? chosen : 'custom';
  if (select.value === 'custom' && chosen !== 'gemma4:e4b') el('modelCustom').value = chosen;
}
function bindSettings() {
  el('mfNav')?.addEventListener('click', event => {
    const button = event.target.closest('[data-tab]'); if (!button) return;
    document.querySelectorAll('.mf-nav [data-tab]').forEach(node => node.classList.toggle('active', node === button));
    document.querySelectorAll('.tab-page').forEach(node => node.classList.toggle('active', node.dataset.page === button.dataset.tab));
  });
  el('sizeControl')?.addEventListener('input', event => { const size = Number(event.target.value); text(el('sizeOutput'), `${Math.round(size * 100)}%`); saveSoon({ size }); });
  el('moodControl')?.addEventListener('change', e => save({ settings: { ...state.settings, mood: e.target.value } }));
  [['humorControl','humor','humorValue'],['friendControl','friendliness','friendValue'],['sassControl','sass','sassValue'],['proactiveControl','proactive','proactiveValue']].forEach(([id,key,out]) => el(id)?.addEventListener('input', e => {
    const value = Number(e.target.value); text(el(out), key === 'proactive' ? (value === 0 ? 'OFF' : `${value} / 5`) : `${value}%`); saveSoon({ settings: { ...state.settings, [key]: value } });
  }));
  el('quietControl')?.addEventListener('change', e => save({ settings: { ...state.settings, quietMode: e.target.checked } }));
  el('intervalControl')?.addEventListener('change', e => save({ settings: { ...state.settings, checkInMinutes: Number(e.target.value) } }));
  el('soundControl')?.addEventListener('change', e => save({ settings: { ...state.settings, startupSound: e.target.checked } }));
  el('speechControl')?.addEventListener('change', e => save({ settings: { ...state.settings, spokenReplies: e.target.checked } }));
  el('refreshOllama')?.addEventListener('click', refreshOllama);
  el('modelControl')?.addEventListener('change', e => { el('modelCustom').disabled = e.target.value !== 'custom'; });
  el('saveModel')?.addEventListener('click', async () => {
    const model = el('modelControl').value === 'custom' ? el('modelCustom').value.trim() : el('modelControl').value;
    if (!model) return text(el('ollamaDetail'), 'Enter a model tag before saving.');
    await save({ model }); await refreshOllama();
  });
  el('pullModel')?.addEventListener('click', async () => {
    const model = el('modelControl').value === 'custom' ? el('modelCustom').value.trim() : el('modelControl').value;
    if (!model) return text(el('modelProgress'), 'Select or enter a model tag first.');
    el('pullModel').disabled = true; text(el('modelProgress'), `Starting: ollama pull ${model}`);
    const result = await window.companion.pullModel(model); el('pullModel').disabled = false;
    text(el('modelProgress'), result.ok ? `${model} is ready.` : result.error); await refreshOllama();
    if (result.ok) await save({ model });
  });
  window.companion.onProgress(value => text(el('modelProgress'), value));
  el('memoryForm')?.addEventListener('submit', async event => {
    event.preventDefault(); const value = el('memoryInput').value.trim(); if (!value) return;
    await save({ memories: [...state.memories, { id: crypto.randomUUID(), text: value }].slice(-200) }); el('memoryInput').value = ''; renderMemories();
  });
  el('previewSound')?.addEventListener('click', () => { const audio = el('startupAudio'); if (audio) { audio.currentTime = 0; audio.play(); } else new Audio('../assets/private-property.mp3').play(); });
  el('hideMainframe')?.addEventListener('click', () => window.close());
}
async function init() {
  state = await window.companion.getState();
  characters = await window.companion.characters();
  conversation = Array.isArray(state.conversation) ? state.conversation.slice(-60) : [];
  if (currentView === 'pet') {
    window.companion.onState(next => { state = next; applyState(); });
    applyState();
    if (state.settings.startupSound) { const audio = el('startupAudio'); audio.volume = 0.68; audio.play().catch(() => {}); }
    document.addEventListener('contextmenu', event => { event.preventDefault(); window.companion.contextMenu(); });
    el('petMenu').addEventListener('click', () => window.companion.contextMenu());
    const openChat = () => window.companion.openWindow('chat');
    el('petTalk').addEventListener('click', openChat); el('talkButton').addEventListener('click', openChat);
    el('mainframeButton').addEventListener('click', () => window.companion.openWindow('mainframe'));
    el('nameForm').addEventListener('submit', async event => { event.preventDefault(); const name = el('nameInput').value.trim(); if (!name) return;
      await save({ userName: name, setupComplete: true }); el('petCaption').textContent = `Good to meet you, ${name}.`;
    });
    const remarks = ['Easy does it. This is a quiet stretch of road.', 'Property line is holding. You doing alright?', 'No rush. I’ll be right here if you need a word.'];
    setInterval(() => { if (!state.settings.quietMode && Number(state.settings.proactive) > 0 && Math.random() < Number(state.settings.proactive) / 40 && document.visibilityState === 'visible' && state.setupComplete) { el('petCaption').textContent = remarks[Math.floor(Math.random() * remarks.length)]; setTimeout(() => { if (el('petCaption')) el('petCaption').textContent = 'This is private property.'; }, 6500); } }, Math.max(1, Number(state.settings.checkInMinutes) || 45) * 60000);
  } else if (currentView === 'chat') {
    window.companion.onState(next => { state = next; });
    renderConversation(); el('chatForm').addEventListener('submit', submitChat);
    el('chatMainframe').addEventListener('click', () => window.companion.openWindow('mainframe'));
    el('chatInput').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); el('chatForm').requestSubmit(); } });
  } else if (currentView === 'mainframe') {
    window.companion.onState(next => { state = next; buildCharacterCards(); fillControls(); renderMemories(); });
    bindSettings(); applyState(); refreshOllama();
  }
}
init().catch(error => console.error('Companion startup error:', error));
