type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

export async function prepareFocusTimerSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume();
  } catch {
    // Browsers can block audio setup; focus timer must keep working silently.
  }
}

export async function playFocusTimerCompleteSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume();

    const now = context.currentTime;
    const endAt = now + 2.05;
    const master = context.createGain();
    const soften = context.createBiquadFilter();

    soften.type = "lowpass";
    soften.frequency.setValueAtTime(2200, now);
    soften.Q.setValueAtTime(0.45, now);

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.075, now + 0.08);
    master.gain.setValueAtTime(0.075, now + 1.35);
    master.gain.exponentialRampToValueAtTime(0.0001, endAt);

    master.connect(soften);
    soften.connect(context.destination);

    const notes = [523.25, 659.25, 783.99, 659.25, 880];

    notes.forEach((frequency, index) => {
      const start = now + index * 0.22;
      const stop = start + 0.58;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = index === notes.length - 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.006, stop);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(index === notes.length - 1 ? 0.42 : 0.34, start + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(stop + 0.04);
    });

    window.setTimeout(() => {
      try {
        master.disconnect();
        soften.disconnect();
      } catch {
        // Nodes may already be disconnected by the browser; either way, silence wins.
      }
    }, 2400);
  } catch {
    // Completion sound is non-critical and must never break the UI.
  }
}
