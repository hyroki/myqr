const video = document.getElementById('video');
const resultDiv = document.getElementById('result');
const status = document.getElementById('status');
const btnSwitch = document.getElementById('btnSwitch');
const btnTorch = document.getElementById('btnTorch');
const btnPause = document.getElementById('btnPause');
const btnResume = document.getElementById('btnResume');
const btnCopy = document.getElementById('btnCopy');

let stream=null, track=null, devices=[], currentDeviceId=null;
let scanning=true, found=false, foundData=null, torchOn=false, countdownTimer=null;

async function listCameras(){
  const all = await navigator.mediaDevices.enumerateDevices();
  devices = all.filter(d => d.kind === 'videoinput');
  return devices;
}

async function startCamera(deviceId){
  stopCamera();
  const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined, facingMode: 'environment' } , audio:false};
  try{
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  }catch(e){
    status.textContent = 'Gagal akses kamera: ' + e.message;
    console.error(e);
    return;
  }
  video.srcObject = stream;
  track = stream.getVideoTracks()[0];
  scanning = true;
  startDecodeLoop();
  status.textContent = 'Kamera aktif';
}

function stopCamera(){
  if(stream){
    stream.getTracks().forEach(t => t.stop());
    stream=null;
  }
  scanning=false;
  status.textContent = 'Kamera berhenti';
}

btnPause.onclick = () => {
  stopCamera();
  btnPause.style.display='none';
  btnResume.style.display='inline-block';
};

btnResume.onclick = async () => {
  await listCameras();
  /* currentDeviceId = devices.length ? devices[0].deviceId : null; */
  await startCamera(currentDeviceId);
  btnResume.style.display='none';
  btnPause.style.display='inline-block';
};

btnSwitch.onclick = async () => {
  await listCameras();
  if(devices.length<2) return alert('Tidak ada kamera lain terdeteksi');
  let idx = devices.findIndex(d => d.deviceId === currentDeviceId);
  idx = (idx+1) % devices.length;
  currentDeviceId = devices[idx].deviceId;
  await startCamera(currentDeviceId);
};

btnTorch.onclick = async () => {
  if(!track) return alert('Senter tidak didukung');
  const cap = track.getCapabilities ? track.getCapabilities() : {};
  if(!cap.torch) return alert('Senter tidak didukung di perangkat ini.');
  torchOn = !torchOn;
  try{
    await track.applyConstraints({ advanced: [{ torch: torchOn }]});
    btnTorch.textContent = torchOn ? 'Senter: ON' : 'Nyalakan senter';
  }catch(e){
    alert('Gagal nyalakan senter: ' + e.message);
  }
};

btnCopy.onclick = async () => {
  if(!foundData) return;
  try{ await navigator.clipboard.writeText(foundData); alert('Teks disalin'); }catch(e){ alert('Gagal salin: ' + e.message); }
};

function isValidUrl(s){
  try{ const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }catch(e){ return false; }
}

function handleFound(text){
  if(found) return;
  found = true;
  foundData = text;
  resultDiv.textContent = 'Terdeteksi: ' + text;
  btnCopy.style.display='inline-block';
  if(navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
  if(isValidUrl(text)){
    resultDiv.innerHTML = 'URL terdeteksi: <a href="' + text + '" target="_blank" rel="noopener">' + text + '</a><br>Redirect dalam <span id="cd">1</span> detik. <button id="cancel">Batal</button>';
    const cdSpan = document.getElementById('cd');
    const cancelBtn = document.getElementById('cancel');
    let sec = 1;
    cancelBtn.onclick = () => { clearInterval(countdownTimer); resultDiv.textContent = 'Redirect dibatalkan.'; found=false; };
    countdownTimer = setInterval(() => {
      sec -= 1;
      if(sec<=0){
        clearInterval(countdownTimer);
        window.location.href = text;
      } else {
        cdSpan.textContent = sec.toString();
      }
    }, 1000);
  } else {
    resultDiv.textContent = 'Teks ditemukan: ' + text;
  }
  stopCamera();
}

async function startDecodeLoop(){
  if('BarcodeDetector' in window){
    const detector = new BarcodeDetector({formats:['qr_code']});
    status.textContent = 'Using native BarcodeDetector';
    const detectLoop = async () => {
      if(!stream || !video || video.readyState < 2) { requestAnimationFrame(detectLoop); return; }
      try{
        const results = await detector.detect(video);
        if(results && results.length){ handleFound(results[0].rawValue || ''); return; }
      }catch(e){}
      requestAnimationFrame(detectLoop);
    };
    detectLoop();
    return;
  }

  let attempts = 0;
  while(typeof jsQR === 'undefined' && attempts < 30){
    await new Promise(r => setTimeout(r,200));
    attempts++;
  }
  if(typeof jsQR === 'undefined'){
    status.textContent = 'Decoder QR tidak tersedia (jsQR).';
    return;
  }
  status.textContent = 'Scanning (jsQR)';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const loop = () => {
    if(!stream || !scanning || video.readyState < 2) { requestAnimationFrame(loop); return; }
    try{
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const im = ctx.getImageData(0,0,canvas.width,canvas.height);
      const code = jsQR(im.data, canvas.width, canvas.height);
      if(code){ handleFound(code.data); return; }
    }catch(e){}
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

window.addEventListener('load', async () => {
  await listCameras();
  currentDeviceId = devices.length ? devices[0].deviceId : null;
  await startCamera(currentDeviceId);
});
