// ===== State =====
// conversation menyimpan seluruh riwayat percakapan dalam format
// yang dipahami backend: [{ role: 'user' | 'model', text: string }]
let conversation = [];

// ===== DOM refs =====
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.getElementById('status-text');

const temperatureSlider = document.getElementById('temperature-slider');
const temperatureValue = document.getElementById('temperature-value');
const topPSlider = document.getElementById('top-p-slider');
const topPValue = document.getElementById('top-p-value');
const topKSlider = document.getElementById('top-k-slider');
const topKValue = document.getElementById('top-k-value');
const systemInstructionEl = document.getElementById('system-instruction');

const configPanel = document.getElementById('config-panel');
const configToggle = document.getElementById('config-toggle');
const newChatBtn = document.getElementById('new-chat-btn');

// ===== Slider live readouts =====
temperatureSlider.addEventListener('input', () => {
  temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(2);
});
topPSlider.addEventListener('input', () => {
  topPValue.textContent = parseFloat(topPSlider.value).toFixed(2);
});
topKSlider.addEventListener('input', () => {
  topKValue.textContent = topKSlider.value;
});

// ===== Mobile config drawer =====
configToggle.addEventListener('click', () => {
  const isOpen = configPanel.classList.toggle('open');
  configToggle.setAttribute('aria-expanded', String(isOpen));
});

// ===== System instruction presets (khusus asisten produktivitas) =====
const PRESETS = {
  prioritas:
    "Kamu adalah asisten produktivitas pribadi yang fokus membantu memprioritaskan tugas. Untuk setiap daftar tugas yang diberikan, urutkan berdasarkan urgensi dan deadline, lalu jelaskan singkat alasan urutan tersebut. Gunakan daftar bernomor.",
  pecah:
    "Kamu adalah asisten produktivitas pribadi yang ahli memecah tugas besar menjadi langkah-langkah kecil yang actionable. Setiap kali diberi satu tugas besar, pecah menjadi 3-6 langkah konkret yang bisa langsung dikerjakan, urut dari yang paling awal.",
  motivasi:
    "Kamu adalah asisten produktivitas pribadi dengan gaya bicara yang memotivasi dan suportif, seperti coach pribadi. Bantu pengguna menyusun rencana tugas, tapi sisipkan juga kata-kata semangat singkat agar pengguna termotivasi menyelesaikannya.",
};

document.querySelectorAll('.preset-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (PRESETS[preset]) {
      systemInstructionEl.value = PRESETS[preset];
    }
  });
});

// ===== New chat =====
newChatBtn.addEventListener('click', () => {
  conversation = [];
  chatWindow.innerHTML = `
    <div class="intro-msg">
      <p><strong>Percakapan baru dimulai.</strong></p>
      <p>Riwayat sebelumnya sudah dihapus dari memori sesi ini.</p>
    </div>
  `;
  userInput.focus();
});

// ===== Auto-resize textarea =====
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
});

// Enter untuk kirim, Shift+Enter untuk baris baru
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

// ===== Rendering helpers =====
function appendMessage(role, text, extraClass = '') {
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${role} ${extraClass}`.trim();

  const roleLabel = document.createElement('span');
  roleLabel.className = 'msg-role';
  roleLabel.textContent = role === 'user' ? 'kamu' : 'asisten';

  const body = document.createElement('span');
  body.className = 'msg-body';
  body.textContent = text;

  wrapper.appendChild(roleLabel);
  wrapper.appendChild(body);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return wrapper;
}

function setThinking(el, isThinking) {
  el.classList.toggle('thinking', isThinking);
}

// ===== Submit handler =====
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // 1. Tampilkan pesan user & reset input
  appendMessage('user', message);
  conversation.push({ role: 'user', text: message });
  userInput.value = '';
  userInput.style.height = 'auto';

  // 2. Tampilkan placeholder "thinking"
  const thinkingEl = appendMessage('model', 'Sedang menyusun rencana…', 'thinking');

  // 3. Kunci composer selama request berlangsung
  sendBtn.disabled = true;
  userInput.disabled = true;
  statusText.textContent = 'Mengirim permintaan ke /api/chat …';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation,
        temperature: parseFloat(temperatureSlider.value),
        topP: parseFloat(topPSlider.value),
        topK: parseInt(topKSlider.value, 10),
        systemInstruction: systemInstructionEl.value.trim(),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.result) {
      thinkingEl.querySelector('.msg-body').textContent = data.result;
      setThinking(thinkingEl, false);
      conversation.push({ role: 'model', text: data.result });
      statusText.textContent = 'Terhubung ke /api/chat';
    } else {
      thinkingEl.querySelector('.msg-body').textContent = 'Sorry, no response received.';
      thinkingEl.classList.add('error');
      setThinking(thinkingEl, false);
    }
  } catch (err) {
    console.error('Error fetching response:', err);
    thinkingEl.querySelector('.msg-body').textContent = 'Failed to get response from server.';
    thinkingEl.classList.add('error');
    setThinking(thinkingEl, false);
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
