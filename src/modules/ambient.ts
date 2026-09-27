type AudioContextConstructor = new () => AudioContext;

interface Graph {
  context: AudioContext;
  master: GainNode;
}

/** The Web Audio constructor, if this browser has one. */
function audioContextConstructor(): AudioContextConstructor | undefined {
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/**
 * Opt-in generative ambient soundscape. The button ships `hidden` and is only
 * revealed when Web Audio exists; if the context still cannot be created, the
 * button hides itself again instead of throwing.
 */
export function initAmbient(button: HTMLButtonElement | null): void {
  const AudioContextCtor = audioContextConstructor();
  if (!button || !AudioContextCtor) return;
  button.hidden = false;

  let graph: Graph | null = null;
  let playing = false;

  button.addEventListener('click', () => {
    try {
      graph ??= buildGraph(new AudioContextCtor());
    } catch {
      button.hidden = true;
      return;
    }
    const { context, master } = graph;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    playing = !playing;
    button.setAttribute('aria-pressed', String(playing));
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(playing ? 0.5 : 0, now + (playing ? 1.6 : 0.7));
  });
}

function buildGraph(context: AudioContext): Graph {
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  // low drone - detuned oscillators through a lowpass = warm city hum
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 320;
  lowpass.Q.value = 0.6;
  lowpass.connect(master);
  [55, 82.5, 110].forEach((frequency, i) => {
    const oscillator = context.createOscillator();
    oscillator.type = i === 2 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency * (1 + (i - 1) * 0.004);
    const gain = context.createGain();
    gain.gain.value = i === 2 ? 0.12 : 0.22;
    oscillator.connect(gain).connect(lowpass);
    oscillator.start();
    // slow LFO drift on gain for life
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.03 + i * 0.017;
    const depth = context.createGain();
    depth.gain.value = 0.05;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
  });

  // airy filtered noise = distant traffic / rain shimmer
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1400;
  bandpass.Q.value = 0.7;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.04;
  noise.connect(bandpass).connect(noiseGain).connect(master);
  noise.start();

  return { context, master };
}
