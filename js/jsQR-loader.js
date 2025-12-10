(function(){
  if (window.jsQR) return;
  var s = document.createElement('script');
  s.src = 'js/jsQR.js';
  s.onload = function(){ if(window.jsQR) console.log('jsQR loaded (local)'); };
  s.onerror = function(){
    console.warn('Local jsQR not found, loading CDN copy');
    var s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js';
    s2.crossOrigin = 'anonymous';
    s2.onload = function(){ console.log('jsQR loaded from CDN'); };
    s2.onerror = function(){ console.error('Failed to load jsQR. Offline decode may not work.'); };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
})();
