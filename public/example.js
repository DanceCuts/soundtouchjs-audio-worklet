/**
 * Loosely based on an example from:
 * http://onlinetonegenerator.com/pitch-shifter.html
 */

/**
 * https://github.com/chrisguttandin/standardized-audio-context
 * To see this working with the standaridized-audio-context ponyfill,
 * uncomment these two lines
 */
//import sac from 'https://jspm.dev/standardized-audio-context';
//const { AudioContext, AudioWorkletNode } = sac;

const fileInput = document.getElementById('fileinput');
const playBtn = document.getElementById('play');
const stopBtn = document.getElementById('stop');
const tempoSlider = document.getElementById('tempoSlider');
const tempoOutput = document.getElementById('tempo');
tempoOutput.innerHTML = tempoSlider.value;
const pitchSlider = document.getElementById('pitchSlider');
const pitchOutput = document.getElementById('pitch');
pitchOutput.innerHTML = pitchSlider.value;
const keySlider = document.getElementById('keySlider');
const keyOutput = document.getElementById('key');
keyOutput.innerHTML = keySlider.value;
const volumeSlider = document.getElementById('volumeSlider');
const volumeOutput = document.getElementById('volume');
volumeOutput.innerHTML = volumeSlider.value;
const currTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const progressMeter = document.getElementById('progressMeter');

let audioCtx;
let gainNode;
let soundtouch;
let buffer;
let is_ready = false;

const resetControls = () => {
  playBtn.setAttribute('disabled', 'disabled');
  stopBtn.setAttribute('disabled', 'disabled');
  soundtouch.tempo = tempoSlider.value;
  soundtouch.pitch = pitchSlider.value;
  soundtouch.percentagePlayed = 0;
  progressMeter.value = 0;
  duration.innerHTML = soundtouch.formattedDuration;
};

const onEnd = (detail) => {
  resetControls();
  updateProgress(detail);
};

const onInitialized = (detail) => {
  console.log('PitchSoundtouch Initialized ', detail);
  resetControls();
  playBtn.removeAttribute('disabled');
  is_ready = true;
};

const updateProgress = (detail) => {
  currTime.innerHTML = detail.formattedTimePlayed;
  progressMeter.value = detail.percentagePlayed;
};

const loadSource = async (file) => {
  if (is_playing) {
    pause(true);
  }
  try {
    playBtn.setAttribute('disabled', 'disabled');

    audioCtx = new AudioContext();
    audioCtx.resume();
    audioCtx.decodeAudioData(await file.arrayBuffer(), async (data) => {
      buffer = audioCtx.createBufferSource();
      buffer.buffer = data;
      await audioCtx.audioWorklet.addModule("../dist/st-worklet.js");
      soundtouch = new AudioWorkletNode(audioCtx, "st-worklet");
      onInitialized();
    }); 
  } catch (err) {
    console.error('[loadSource] ', err);
  }
};

let is_playing = false;
const play = function () {
  if (is_ready) {
    gainNode = audioCtx.createGain();
    buffer.connect(soundtouch);
    soundtouch.connect(gainNode); // SoundTouch goes to the GainNode
    gainNode.connect(audioCtx.destination); // GainNode goes to the AudioDestinationNode

    buffer.start();

    is_playing = true;
    playBtn.setAttribute('disabled', 'disabled');
    stopBtn.removeAttribute('disabled');
  }
};

const pause = function (stop = false, override = false) {
  gainNode.disconnect(); // disconnect the DestinationNode
  soundtouch.disconnect(); // disconnect the AudioGainNode
  soundtouch.disconnectFromBuffer(); // disconnect the SoundTouchNode

  if (stop) {
    soundtouch.stop();
  } else {
    soundtouch.pause();
  }

  stopBtn.setAttribute('disabled', 'disabled');
  if (is_playing || override) {
    playBtn.removeAttribute('disabled');
  }
};

fileInput.onchange = (e) => {
  loadSource(e.target.files[0]);
};

playBtn.onclick = play;
stopBtn.onclick = () => pause();

tempoSlider.addEventListener('input', function () {
  tempoOutput.innerHTML = soundtouch.tempo = this.value;
});

pitchSlider.addEventListener('input', function () {
  pitchOutput.innerHTML = soundtouch.pitch = this.value;
  soundtouch.tempo = tempoSlider.value;
});

keySlider.addEventListener('input', function () {
  soundtouch.pitchSemitones = this.value;
  keyOutput.innerHTML = this.value / 2;
  soundtouch.tempo = tempoSlider.value;
});

volumeSlider.addEventListener('input', function () {
  volumeOutput.innerHTML = gainNode.gain.value = this.value;
});

progressMeter.addEventListener('click', function (event) {
  const pos = event.target.getBoundingClientRect();
  const relX = event.pageX - pos.x;
  const perc = (relX * 100) / event.target.offsetWidth;
  pause(null, true);
  soundtouch.percentagePlayed = perc;
  progressMeter.value = perc;
  currTime.innerHTML = soundtouch.formattedTimePlayed;
  if (is_playing) {
    play();
  }
});
