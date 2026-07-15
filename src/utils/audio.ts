// ==========================
// AUDIO & TTS UTILITIES
// ==========================

class AudioSynthesizer {
    ctx: AudioContext | null = null;
    volume: number = 0.5;
    reducedMotion: boolean = false;

    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
    }

    playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1) {
        if (this.reducedMotion) return; // Accessibility bypass
        try {
            this.init();
            if (!this.ctx) return;
            
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn("AudioSynth error:", e);
        }
    }

    playCorrect() {
        this.playTone(523.25, 'sine', 0.15); // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.2), 100); // E5
    }

    playIncorrect() {
        this.playTone(150, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.3), 150);
    }
    
    playPop() {
        this.playTone(600, 'sine', 0.05);
    }
    
    playSuccess() {
        this.playTone(440, 'sine', 0.1);
        setTimeout(() => this.playTone(554.37, 'sine', 0.1), 100);
        setTimeout(() => this.playTone(659.25, 'sine', 0.2), 200);
    }
}

export const AudioSynth = new AudioSynthesizer();

if (typeof window !== 'undefined') {
    const savedVol = localStorage.getItem('adhd_volume');
    if (savedVol !== null) {
        AudioSynth.volume = parseFloat(savedVol);
    } else {
        AudioSynth.volume = 1.0;
    }
}

// --- TTS Logic ---

let ttsVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        ttsVoices = window.speechSynthesis.getVoices();
    };
    // Initialize immediately if available
    ttsVoices = window.speechSynthesis.getVoices();
}

const ttsAudioCache: Record<string, string> = {};
let activeAudio: HTMLAudioElement | null = null;
let currentTTSId = 0;

export function setGlobalVolume(vol: number) {
    AudioSynth.volume = vol;
    if (activeAudio) {
        activeAudio.volume = vol;
    }
}

export function stopAudio() {
    currentTTSId++; // Invalidate any pending fetches
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

export function playTTS(text: string, lang: string = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
        if (!text) {
            resolve();
            return;
        }
        
        stopAudio(); // Cut off any currently playing audio
        const ttsId = ++currentTTSId;
        
        // Check cache first
        const cacheKey = text.toLowerCase().trim();
        if (ttsAudioCache[cacheKey]) {
            const audio = new Audio(ttsAudioCache[cacheKey]);
            audio.volume = AudioSynth.volume;
            activeAudio = audio;
            audio.onended = () => resolve();
            audio.onerror = (e) => {
                console.error("Cached audio play failed:", e);
                resolve();
            };
            audio.play().catch(e => {
                console.error("Cached audio play failed:", e);
                resolve();
            });
            return;
        }
        
        // Attempt PHP Backend TTS
        fetch('/api/tts.php?text=' + encodeURIComponent(text))
            .then(async res => {
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Backend didn't return JSON.");
                }
                return res.json();
            })
            .then(data => {
                if (data.success && data.url) {
                    ttsAudioCache[cacheKey] = data.url;
                    if (currentTTSId !== ttsId) {
                        resolve();
                        return;
                    }
                    const audio = new Audio(data.url);
                    audio.volume = AudioSynth.volume;
                    activeAudio = audio;
                    audio.onended = () => resolve();
                    audio.onerror = (e) => {
                        console.error("Audio error:", e);
                        resolve();
                    }
                    audio.play().catch(e => {
                        console.error("Audio play failed:", e);
                        resolve();
                    });
                } else {
                    throw new Error(data.error);
                }
            })
            .catch(err => {
                console.warn("TTS backend unavailable, using browser fallback:", err.message);
                // Fallback to browser TTS (Web Speech API)
                if (!window.speechSynthesis || currentTTSId !== ttsId) {
                    resolve();
                    return;
                }
                
                const utterance = new SpeechSynthesisUtterance(text);
                const engVoices = ttsVoices.filter(v => v.lang.startsWith(lang) || v.lang.startsWith('en-GB'));
                
                if (engVoices.length > 0) {
                    const premiumVoices = engVoices.filter(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Daniel'));
                    // Use a consistent voice (the first available premium one, or the first english one) instead of randomizing
                    utterance.voice = premiumVoices.length > 0 
                        ? premiumVoices[0] 
                        : engVoices[0];
                }
                
                utterance.volume = AudioSynth.volume;
                utterance.rate = 0.85;
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                window.speechSynthesis.speak(utterance);
            });
    });
}

export function playAudioClip(audioUrl: string | undefined, fallbackText: string = '', lang: string = 'en-US'): Promise<void> {
    if (!audioUrl) {
        return fallbackText ? playTTS(fallbackText, lang) : Promise.resolve();
    }

    return new Promise((resolve) => {
        stopAudio();
        const clipId = ++currentTTSId;

        const audio = new Audio(audioUrl);
        audio.volume = AudioSynth.volume;
        activeAudio = audio;
        audio.onended = () => resolve();
        audio.onerror = () => {
            if (currentTTSId === clipId && fallbackText) {
                playTTS(fallbackText, lang).then(resolve);
            } else {
                resolve();
            }
        };
        audio.play().catch(() => {
            if (currentTTSId === clipId && fallbackText) {
                playTTS(fallbackText, lang).then(resolve);
            } else {
                resolve();
            }
        });
    });
}

export function preloadTTS(texts: string[]): void {
    if (typeof window === 'undefined') return;
    texts.forEach(text => {
        if (!text) return;
        const cacheKey = text.toLowerCase().trim();
        if (ttsAudioCache[cacheKey]) return;
        
        fetch('/api/tts.php?text=' + encodeURIComponent(text))
            .then(res => {
                if (res.ok) return res.json();
                return null;
            })
            .then(data => {
                if (data && data.success && data.url) {
                    ttsAudioCache[cacheKey] = data.url;
                    // Preload the audio file into the browser cache
                    const audio = new Audio();
                    audio.preload = 'auto';
                    audio.src = data.url;
                }
            })
            .catch(() => {}); // Silently ignore preload errors
    });
}

export function playSoundEffect(type: 'success' | 'fail' | 'pop') {
    if (type === 'success') {
        AudioSynth.playCorrect();
    } else if (type === 'fail') {
        AudioSynth.playIncorrect();
    } else if (type === 'pop') {
        AudioSynth.playPop();
    }
}
