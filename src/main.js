const { app, BrowserWindow, Menu, Tray, ipcMain, screen, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const appRoot = path.join(__dirname, '..');
const characters = [
  { id: 'driver', name: 'The Driver', file: 'driver.png' },
  { id: 'boatman', name: 'The Boatman', file: 'boatman.png' },
  { id: 'block-rancher', name: 'The Block Rancher', file: 'block-rancher.png' },
  { id: 'convertible', name: 'The Open-Road Version', file: 'convertible.png' }
];
const openingLine = "This is private property, but I'll tell you — ";
let petWindow;
let chatWindow;
let mainframeWindow;
let tray;
let statePath;
let isQuitting = false;

const defaults = {
  version: 1,
  setupComplete: false,
  userName: '',
  character: 'driver',
  size: 1,
  conversation: [],
  model: 'gemma4:e4b',
  ollamaUrl: 'http://127.0.0.1:11434',
  memories: [],
  settings: {
    startupSound: true,
    spokenReplies: false,
    quietMode: false,
    proactive: 2,
    checkInMinutes: 45,
    mood: 'Easygoing',
    humor: 55,
    friendliness: 70,
    sass: 35
  }
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return { ...clone(defaults), ...parsed, settings: { ...defaults.settings, ...(parsed.settings || {}) }, memories: Array.isArray(parsed.memories) ? parsed.memories : [] };
  } catch { return clone(defaults); }
}
let appState;
function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(appState, null, 2), { mode: 0o600 });
}
function sendToWindows(channel, payload) {
  [petWindow, chatWindow, mainframeWindow].filter(Boolean).forEach(win => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  });
}
function resizePet(sizeValue) {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds(); const size = Math.max(0.7, Math.min(1.5, Number(sizeValue) || 1));
  const width = Math.round(280 * size); const height = Math.round(372 * size);
  petWindow.setBounds({ x: bounds.x + bounds.width - width, y: bounds.y + bounds.height - height, width, height });
}
function createPet() {
  const display = screen.getPrimaryDisplay().workArea;
  const width = 280;
  const height = 372;
  petWindow = new BrowserWindow({
    width, height, x: display.x + display.width - width - 26, y: display.y + display.height - height - 18,
    transparent: true, frame: false, resizable: false, movable: true, alwaysOnTop: true,
    skipTaskbar: true, hasShadow: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy: 'no-user-gesture-required' }
  });
  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.loadFile(path.join(__dirname, 'index.html'), { query: { view: 'pet' } });
  petWindow.once('ready-to-show', () => petWindow.show());
  petWindow.on('close', event => { if (!isQuitting) { event.preventDefault(); petWindow.hide(); } });
  petWindow.on('closed', () => { petWindow = null; });
  petWindow.webContents.on('context-menu', () => showPetMenu());
}
function createPanel(view) {
  const existing = view === 'chat' ? chatWindow : mainframeWindow;
  if (existing && !existing.isDestroyed()) { existing.show(); existing.focus(); return; }
  const isChat = view === 'chat';
  const win = new BrowserWindow({
    width: isChat ? 430 : 900, height: isChat ? 690 : 740,
    minWidth: isChat ? 360 : 700, minHeight: isChat ? 520 : 620,
    title: isChat ? 'Private Property — Conversation' : 'Mainframe',
    backgroundColor: '#0b0c12', show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  if (isChat) chatWindow = win; else mainframeWindow = win;
  win.loadFile(path.join(__dirname, 'index.html'), { query: { view } });
  win.once('ready-to-show', () => win.show());
  win.on('close', event => { if (!isQuitting) { event.preventDefault(); win.hide(); } });
  win.on('closed', () => { if (isChat) chatWindow = null; else mainframeWindow = null; });
}
function showPetMenu() {
  const template = [
    { label: 'Talk to him', click: () => createPanel('chat') },
    { label: 'Mainframe', click: () => createPanel('mainframe') },
    { label: 'Size', submenu: [0.8, 1, 1.2, 1.4].map(size => ({ label: `${Math.round(size * 100)}%`, type: 'radio', checked: appState.size === size, click: () => { appState.size = size; resizePet(size); saveState(); sendToWindows('state-updated', appState); } })) },
    { type: 'separator' },
    { label: 'Hide', click: () => petWindow?.hide() },
    { label: 'Show', click: () => petWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ];
  Menu.buildFromTemplate(template).popup({ window: petWindow || undefined });
}
function createTray() {
  let icon = nativeImage.createFromPath(path.join(appRoot, 'assets', 'characters', 'driver.png'));
  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Private Property Companion');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show companion', click: () => petWindow?.show() },
    { label: 'Talk to him', click: () => createPanel('chat') },
    { label: 'Mainframe', click: () => createPanel('mainframe') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => petWindow?.isVisible() ? petWindow.hide() : petWindow?.show());
}
function systemPrompt() {
  const memories = appState.memories.map(item => `- ${item.text}`).join('\n') || '(none)';
  const mood = appState.settings.mood;
  return `You are a friendly, easygoing desktop companion inspired by a humorous "private property" meme. Keep a steady ${mood.toLowerCase()} voice. Humor ${appState.settings.humor}/100, friendliness ${appState.settings.friendliness}/100, sass ${appState.settings.sass}/100. Be concise and natural. The app adds the fixed opening phrase before your answer, so begin directly with the answer and do not repeat it. The user's name is ${appState.userName || 'not provided'}. The user-managed facts below are local notes to personalize replies; never claim to know anything about their screen or device.\nSaved memories:\n${memories}`;
}

app.whenReady().then(() => {
  statePath = path.join(app.getPath('userData'), 'companion-state.json');
  appState = readState();
  ipcMain.handle('state:get', () => appState);
  ipcMain.handle('state:save', (_event, next) => {
    const allowed = ['setupComplete', 'userName', 'character', 'size', 'model', 'ollamaUrl', 'memories', 'settings', 'conversation'];
    for (const key of allowed) if (next && Object.hasOwn(next, key)) appState[key] = next[key];
    appState.settings = { ...defaults.settings, ...(appState.settings || {}) };
    appState.memories = Array.isArray(appState.memories) ? appState.memories.slice(0, 200) : [];
    appState.conversation = Array.isArray(appState.conversation) ? appState.conversation.slice(-60) : [];
    if (petWindow && next && Object.hasOwn(next, 'size')) resizePet(appState.size);
    saveState(); sendToWindows('state-updated', appState); return appState;
  });
  ipcMain.handle('ollama:status', async () => {
    try {
      const response = await fetch(`${appState.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error(`Ollama responded ${response.status}`);
      const data = await response.json();
      return { connected: true, models: (data.models || []).map(item => item.name), selected: appState.model };
    } catch (error) { return { connected: false, models: [], selected: appState.model, error: error.message }; }
  });
  ipcMain.handle('ollama:pull', async (_event, model) => new Promise(resolve => {
    if (!/^[\w.:/-]+$/.test(model || '')) return resolve({ ok: false, error: 'Enter a valid Ollama model tag.' });
    const child = spawn('ollama', ['pull', model], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output = (output + chunk.toString()).slice(-1600); sendToWindows('ollama:progress', output); });
    child.stderr.on('data', chunk => { output = (output + chunk.toString()).slice(-1600); sendToWindows('ollama:progress', output); });
    child.on('error', error => resolve({ ok: false, error: `Ollama command not found. Install Ollama, then run “ollama pull ${model}”.` }));
    child.on('close', code => resolve(code === 0 ? { ok: true } : { ok: false, error: output || `ollama pull exited with code ${code}` }));
  }));
  ipcMain.handle('chat:send', async (_event, history, text) => {
    if (!appState.model) return { ok: false, error: 'Choose an Ollama model in Mainframe → Brain.' };
    const previous = Array.isArray(history) ? history.slice(-16).filter(m => ['user', 'assistant'].includes(m.role)).map(m => ({ role: m.role, content: String(m.content).slice(0, 5000) })) : [];
    try {
      const response = await fetch(`${appState.ollamaUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ model: appState.model, stream: false, messages: [{ role: 'system', content: systemPrompt() }, ...previous, { role: 'user', content: String(text).slice(0, 5000) }] })
      });
      if (!response.ok) throw new Error(`Ollama responded ${response.status}. Check that the model is installed.`);
      const data = await response.json();
      return { ok: true, text: openingLine + (data.message?.content?.trim() || 'What was that? I was checking the property line.') };
    } catch (error) {
      return { ok: false, error: `Local Ollama is unavailable. Nothing was sent to a cloud service. ${error.message}\n\nStart Ollama and run: ollama pull ${appState.model}` };
    }
  });
  ipcMain.handle('window:open', (_event, view) => { if (view === 'chat' || view === 'mainframe') createPanel(view); });
  ipcMain.handle('window:hide-pet', () => petWindow?.hide());
  ipcMain.handle('window:show-pet', () => petWindow?.show());
  ipcMain.handle('window:context-menu', () => showPetMenu());
  ipcMain.handle('assets:characters', () => characters.map(character => ({ ...character, src: `../assets/characters/${character.file}` })));
  ipcMain.handle('launch:startup-sound', () => {
    if (appState.settings.startupSound) petWindow?.webContents.send('sound:play');
  });

  app.setLoginItemSettings({ openAtLogin: false });
  createPet();
  createTray();
  app.on('activate', () => petWindow?.show());
});
app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => {});

