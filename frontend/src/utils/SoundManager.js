class SoundManager {
  constructor() {
    this.context = null;
    this.muted = localStorage.getItem('muffin_muted') === 'true';
  }

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    localStorage.setItem('muffin_muted', isMuted);
  }

  playHover() {
    if (this.muted) return;
    this.init();
    
    // Low, short, tactile tick
    const osc = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.context.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.05);
  }

  playSelect() {
    if (this.muted) return;
    this.init();
    
    // Soft swoosh/click
    const osc = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.15, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  playSplash() {
    if (this.muted) return;
    this.init();
    
    // Deep cinematic boom
    const osc = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + 1.5);
    
    gainNode.gain.setValueAtTime(0.8, this.context.currentTime);
    gainNode.gain.setTargetAtTime(0, this.context.currentTime + 0.5, 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 2.0);
  }
}

export const sound = new SoundManager();
