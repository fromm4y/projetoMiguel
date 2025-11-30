// ===========================
// Script principal
// ===========================

// === Variáveis úteis ===
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const btnAbrirChatbot = document.getElementById('btnAbrirChatbot');
const dfMessenger = document.querySelector("df-messenger");
const yearSpan = document.getElementById('year');

// Coloca o ano atual no rodapé
yearSpan.textContent = new Date().getFullYear();

// ------------------- CHATBOT -------------------
btnAbrirChatbot.addEventListener("click", () => {
    dfMessenger.classList.toggle("aberto");
    dfMessenger.setAttribute("opened", dfMessenger.classList.contains("aberto"));
});

// ------------------- ACESSIBILIDADE - TAB OUTLINE -------------------
(function enableFocusOutlineForKeyboard(){
  function handleFirstTab(e) {
    if(e.key === 'Tab') {
      document.documentElement.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();

// ------------------- ANIMAÇÃO SCROLL REVEAL -------------------
(function revealOnScroll(){
  const items = document.querySelectorAll('.fade-in');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.style.opacity = 1;
        e.target.style.transform = 'none';
        obs.unobserve(e.target);
      }
    });
  }, {threshold:0.12});

  items.forEach(i => {
    i.style.opacity = 0;
    i.style.transform = 'translateY(8px)';
    obs.observe(i);
  });
})();


// ==========================================================
// =====================  MODO ESCURO  =======================
// ==========================================================

document.addEventListener("DOMContentLoaded", function () {
  const checkbox = document.getElementById('darkToggle');
  const label = document.getElementById('darkToggleLabel');

  if (!checkbox) return;

  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (stored === 'dark' || (!stored && prefersDark)) {
    document.body.classList.add('dark');
    checkbox.checked = true;
  } else {
    document.body.classList.remove('dark');
    checkbox.checked = false;
  }

  checkbox.addEventListener('change', function(){
    if (this.checked) {
      document.body.classList.add('dark');
      localStorage.setItem('theme','dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme','light');
    }
  });

  // Acessibilidade do switch
  label.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  });
});


// ==========================================================
// ==============  RECONHECIMENTO FACIAL / CÂMERA ===========
// ==========================================================

let stream = null;
let modelosCarregados = false;

document.addEventListener("DOMContentLoaded", () => {

  const abrirIA = document.getElementById('abrirIA');
  const cameraModal = document.getElementById('cameraModal');
  const fecharModal = document.getElementById('fecharModal');
  const video = document.getElementById('video');
  const tirarFoto = document.getElementById('tirarFoto');
  const fotoCanvas = document.getElementById('fotoCanvas');
  const modalStatus = document.getElementById('modalStatus');

  // ----------------- Carregar modelos -----------------
  async function carregarModelos() {
    if (modelosCarregados) return;
    modalStatus.innerText = 'Carregando modelos...';
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      modelosCarregados = true;
      modalStatus.innerText = 'Modelos carregados.';
    } catch (err) {
      console.error('Erro carregando modelos:', err);
      modalStatus.innerText = 'Erro ao carregar modelos.';
    }
  }

  // ----------------- Abrir modal e iniciar câmera -----------------
  abrirIA.addEventListener('click', async () => {
    cameraModal.style.display = 'flex';
    cameraModal.setAttribute('aria-hidden', 'false');

    await carregarModelos();
    modalStatus.innerText = 'Iniciando câmera...';

    try {
      // Evitar múltiplas chamadas simultâneas
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 } });
        video.srcObject = stream;

        // Aguarda completamente antes de dar play (corrige AbortError)
        await video.play();
      }

      modalStatus.innerText = 'Câmera ativa! Clique no 📸';

    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      modalStatus.innerText = 'Não foi possível acessar a câmera.';
    }
  });

  // ----------------- Fechar modal e parar câmera -----------------
  fecharModal.addEventListener('click', () => {
    pararCamera();
    cameraModal.style.display = 'none';
    cameraModal.setAttribute('aria-hidden', 'true');
    modalStatus.innerText = 'Aguardando...';
  });

  // ----------------- Função parar câmera -----------------
  function pararCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  // ----------------- Tirar foto -----------------
  tirarFoto.addEventListener('click', async () => {

    if (!video || video.readyState < 2) {
      modalStatus.innerText = 'Vídeo ainda carregando...';
      return;
    }

    fotoCanvas.width = video.videoWidth || 640;
    fotoCanvas.height = video.videoHeight || 480;

    const ctx = fotoCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, fotoCanvas.width, fotoCanvas.height);

    modalStatus.innerText = 'Enviando foto...';

    pararCamera();
    cameraModal.style.display = 'none';
    cameraModal.setAttribute('aria-hidden', 'true');

    fotoCanvas.toBlob(async (blob) => {
      if (!blob) {
        modalStatus.innerText = 'Erro ao capturar imagem.';
        return;
      }

      const formData = new FormData();
      formData.append('foto', blob, 'foto.png');

      try {
        const response = await fetch(`${window.location.origin}/processar-foto`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.facesEncontradas === 0) {
          modalStatus.innerText = 'Nenhuma face detectada.';
          return;
        }

        const dataUrl = fotoCanvas.toDataURL('image/png');
        sessionStorage.setItem('ultimaFoto', dataUrl);

        const emocao = data.emocao || 'neutral';
        const confianca = data.confianca || 0;

        window.location.href = `resultado.html?emocao=${encodeURIComponent(emocao)}&conf=${encodeURIComponent(confianca)}`;

      } catch (err) {
        modalStatus.innerText = 'Erro ao enviar para o servidor.';
        console.error(err);
      }

    }, 'image/png');
  });

});
