'use strict'

const START_BUTTON_STATE = {started: false, text: 'Start Recording'}
const STOP_BUTTON_STATE = {started: true, text: 'Stop Recording'}
const SHOW_SAVEBUTTON_STATE = {visible: true}
const HIDE_SAVEBUTTON_STATE = {visible: false}
const DISABLED_FACE_SWITCH_STATE = {enabled: false, text: 'Enable Facial Tracking'}
const ENABLED_FACE_SWITCH_STATE = {enabled: true, text: 'Disable Facial Tracking'}
const DISABLED_DELAY_SWITCH_STATE = {enabled: false}
const ENABLED_DELAY_SWITCH_STATE = {enabled: true}
const DEFAULT_DELAY_SWITCH_STATE = {enabled: true, delay: 6}
const INITIAL_STATE = {
  deviceInfos: {audiooutput: [], audioinput: [], videoinput: []}
, button: START_BUTTON_STATE
, recordStreams: []
, saveButton: HIDE_SAVEBUTTON_STATE
, faceTrackingSwitch: DISABLED_FACE_SWITCH_STATE
, delaySwitch: DEFAULT_DELAY_SWITCH_STATE
, frInterval: null
, showVideo: false
};
var state = cloneObject(INITIAL_STATE);

function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  state.deviceInfos = deviceInfos.reduce((prev,curr)=>{
    prev[curr.kind].push({label:curr.label, value: curr.deviceId});
    return prev;
  }, cloneObject(INITIAL_STATE.deviceInfos));

  var listOfAudioInputs = geid('listOfAudioInputs');
  var listOfAudioOutputs = geid('listOfAudioOutputs');
  var listOfVideoInputs = geid('listOfVideoInputs');
  var lists = [listOfAudioInputs, listOfAudioOutputs, listOfVideoInputs];
  lists.map((item)=>item.innerHTML = "");
  lists = {
    audioinput: listOfAudioInputs
  , audiooutput: listOfAudioOutputs
  , videoinput: listOfVideoInputs
  };
  deviceInfos.map((deviceInfo)=>{
    var noLabelText = {
      audioinput: 'microphone '
    , audiooutput: 'speaker '
    , videoinput: 'camera '
    };
    var li = ce('li');
    li.innerText = deviceInfo.label || 
      noLabelText[deviceInfo.kind] + lists[deviceInfo.kind].childElementCount;
    lists[deviceInfo.kind].appendChild(li);
  });
  var menu = qget('.menu');
  menu.classList.remove('hidden');
}
function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
  document.getElementById('noSupport').className = null;
}
navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
var refreshButton = document.querySelector("#refreshButton");
refreshButton.onclick = function(e){
  navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
    .then(function() {
      console.log('Success, audio output device attached: ' + sinkId);
    })
    .catch(function(error) {
      var errorMessage = error;
      if (error.name === 'SecurityError') {
        errorMessage = 'You need to use HTTPS for selecting audio output ' +
            'device: ' + error;
      }
      console.error(errorMessage);
      // Jump back to first output device in the list as it's the default.
      audioOutputSelect.selectedIndex = 0;
    });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  var audioDestination = audioOutputSelect.value;
  var videoElement = document.querySelector('video');
  if (videoElement)
    attachSinkId(videoElement, audioDestination);
  else
    console.log('No Video element to change audio destination to');
}

//audioOutputSelect.onchange = changeAudioDestination;

var videoPlayer = {
  layoutVideoElements(){
    var videos = Array.from(document.querySelectorAll('video'));
    var vidLabels = Array.from(document.querySelectorAll('.vidLabel'));

    var cols = Math.ceil(Math.sqrt(videos.length));
    var rows = Math.ceil(videos.length/cols);
    //var menuHeight = document.querySelector('.menu').getBoundingClientRect().height;
    var menuHeight = 0;

    var width = document.documentElement.clientWidth/cols;
    var height = (document.documentElement.clientHeight-menuHeight)/rows;
    videos.map((vid,idx)=>{
      var dim = vid.getBoundingClientRect();
      Object.assign(vid.style, {
        width: width + "px"
      , height: height + "px"
      , top: parseInt(idx/cols) * height + menuHeight + "px"
      , left: idx%cols * width + "px"
      });

      if (vidLabels[idx]){
        Object.assign(vidLabels[idx].style,{
          top: parseInt(idx/cols) * height + menuHeight + 100+"px"
        , left: idx%cols * width + "px"
        , width: dim.width + "px"
        });
      }
    });
  }
, start(){
    // clear as needed
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map(el=>el.remove());
    state.recordStreams = [];
    var vidLabels = Array.from(document.querySelectorAll('.vidLabel'));
    vidLabels.map(el=>el.remove());

    // create video elements as needed
    var container = document.querySelector('.videopage');

    state.deviceInfos.videoinput.map(dInfo=>{
      // Create all video elements
      var videl = document.createElement('video');
      ['controls','autoplay','muted'].map((item)=>videl.setAttribute(item,''));
      container.appendChild(videl);
      // Labels
      var vidLabel = document.createElement('div');
      vidLabel.className = "vidLabel";
      vidLabel.innerText = dInfo.label;
      container.appendChild(vidLabel);
      // Label hover effects
      videl.onmouseenter=(e)=>{
        vidLabel.style.opacity = 1;
      }
      videl.onmouseleave=(e)=>{
        vidLabel.style.opacity = null;
      }

      var sel = document.createElement('select');
      Object.assign(sel.style, {
        position: 'absolute'
      , right: "20px"
      , top: "60px"
      });
      state.deviceInfos.videoinput.map(dInfo=>{
        var opt = document.createElement('option');
        opt.text = dInfo.label;
        opt.value = dInfo.value;
        sel.add(opt);
      });
      sel.onchange = function(e){
        console.log('selval:',this.value);
        custom.start(videl, {videoSource:this.value});
      }
      vidLabel.appendChild(sel);

      //Load and start webcams
      var constraint = {audio:true, video: {deviceId: {exact:dInfo.value}}};

      navigator.mediaDevices.getUserMedia(constraint).
        then(this.gotStreamFunc(videl)).catch(handleError);
    });

    this.layoutVideoElements();
  }
, gotStreamFunc(videl){
    return stream=>{
      videl.stream = stream;
      if (!state.delaySwitch.enabled || delay.classList.contains('invalid')){
        videl.srcObject = stream;
        videl.play();
      } else {
        this.playBuffered(videl);
      }
      audioHandler.gotStream(stream);
    }
  }
, playBuffered(vid){
    this.bufferTimeSize = 100;
    vid.mediaSource = new MediaSource();

    vid.srcObject = null;
    vid.src = URL.createObjectURL(vid.mediaSource);
    vid.mediaSource.addEventListener('sourceopen', ()=>{
      vid.sourceBuffer = vid.mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp9"');
    }, false);
    vid.mediaRecorder = new MediaRecorder(vid.stream);

    var recordedChunks = [];
    vid.recordedChunks = recordedChunks;
    vid.mediaRecorder.ondataavailable = function (e) {
      var reader = new FileReader();
      reader.addEventListener("loadend", function () {
        var arr = new Uint8Array(reader.result);
        if (vid.mediaSource.readyState === "open")
          vid.sourceBuffer.appendBuffer(arr);
      });
      reader.readAsArrayBuffer(e.data);

      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      } else {
        console.debug('no data available');
      }
    };
    vid.mediaRecorder.start(this.bufferTimeSize);
    vid.prestart = setTimeout(()=>{
      vid.play()
      vid.lastTime = vid.currentTime
      vid.checkPlaying = setInterval(()=>{
        if (vid.paused) return;
        var t = vid.currentTime;
        if (vid.lastTime === t){
          var b = vid.buffered;
          vid.currentTime = b.end(b.length-1)-(state.delaySwitch.delay-this.bufferTimeSize/1000);
          console.log('adjusting',state.delaySwitch.delay)
        }
        vid.lastTime = t;
      },100)
      var buf = vid.buffered;
      vid.currentTime = buf.end(buf.length-1)-(state.delaySwitch.delay-this.bufferTimeSize/1000);
    },state.delaySwitch.delay*1000);

    setTimeout(()=>{
      var countdown = new Countdown(document.body, Math.floor(state.delaySwitch.delay));
      countdown.show();
    }, state.delaySwitch.delay%1000);
  }
, removeDelay(){
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map((vid,idx)=>{
      vid.srcObject = vid.stream;
      clearTimeout(vid.prestart);
      clearInterval(vid.checkPlaying);
      vid.mediaRecorder.stop();
    });
  }
, adjustBufferedTime(){
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map((vid,idx)=>{
      var b = vid.buffered;
      vid.currentTime = b.end(b.length-1)-(state.delaySwitch.delay-this.bufferTimeSize/1000);
    });
  }
, stop(isReplay, isClear){
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map((vid)=>{
      clearTimeout(vid.prestart);
      clearInterval(vid.checkPlaying);
      vid.stream.getVideoTracks().map((track)=>track.stop());
      if (vid.mediaRecorder && vid.mediaRecorder.state === 'recording')
        vid.mediaRecorder.stop();
      if (isReplay){
        var superBuffer = new Blob(vid.recordedChunks);
        vid.blobUrl = URL.createObjectURL(superBuffer);
        vid.src = vid.blobUrl;
        vid.srcObject = null;
        vid.setAttribute('loop','');
      } else if (isClear){
        vid.remove();
        vid.recordedChunks = null;
      } else {
      }
    });
    var vidLabels = Array.from(document.querySelectorAll('.vidLabel'));
    vidLabels.map(vidl=>{vidl.remove()});
  }
, stopAndReplay(){
    this.stop(true);
  }
, clear(){
    this.stop(null, true);
  }
, save(){
    var d = new Date();
    var n = d.toISOString().slice(0,19);
    var vids = Array.from(qgeta('video'));
    vids.map((vid,idx)=>{
      var filename = "r_"+n+"_"+idx+".webm";
      if (!vid.blobUrl) {
        console.error("Can't save until blob created");
        return;
      }
      var hyperlink = document.createElement('a');
      hyperlink.href = vid.blobUrl;
      hyperlink.target = '_blank';
      hyperlink.download = filename;

      var evt = new MouseEvent('click', {
        view: window
      , bubbles: true
      , cancelable: true
      });

      hyperlink.dispatchEvent(evt);

      if (!navigator.mozGetUserMedia) {
          URL.revokeObjectURL(hyperlink.href);
      }
    });
  }
}
class Recorder {
  constructor(stream, recordingCallback, options){
    if (!stream) {
      throw new Error('Need a stream!');
      return;
    }
    options = options || {mimeType: 'video/webm'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)){
      console.error('MimeType not supported!', options.mimeType);
    }
    this.mediaRecorder = new MediaRecorder(stream, options);
    // mediaRecorder.state -> 'recording', 'inactive'
    this.recordingCallback = recordingCallback;
    
    var recordedChunks = [];
    this.recordedChunks = recordedChunks;
    this.mediaRecorder.ondataavailable = function(e) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      } else {
        // no data available???
      }
    }
    return this;
  }
  start(){
    if (this.mediaRecorder.state === 'recording'){
      console.error('media recorder is already recording',this.mediaRecorder.state);
      return this;
    }
    this.mediaRecorder.start();
    return this;
  }
  stop(){
    if (this.mediaRecorder.state === 'inactive'){
      console.error('Media Recorder is not recording', this.mediaRecorder.state);
      return this.blobUrl;
    }
    this.mediaRecorder.stop();
    var superBuffer = new Blob(this.recordedChunks);
    this.blobUrl = URL.createObjectURL(superBuffer);
    if (typeof this.recordingCallback === 'function')
      this.recordingCallback(this.blobUrl);
    return this.blobUrl;
  }
  save(filename){
    if (!this.blobUrl) {
      console.error("Can't save until blob created");
      return;
    } else if (!filename) {
      console.error("Need a filename!");
      return;
    }
    var hyperlink = document.createElement('a');
    hyperlink.href = this.blobUrl;
    hyperlink.target = '_blank';
    hyperlink.download = filename;

    var evt = new MouseEvent('click', {
      view: window
    , bubbles: true
    , cancelable: true
    });

    hyperlink.dispatchEvent(evt);

    if (!navigator.mozGetUserMedia) {
        URL.revokeObjectURL(hyperlink.href);
    }
  }
}


var audioHandler = {
  buf: new Float32Array(1024)
, audioContext: null
, mediaStreamSource: null
, analyser: null
, MIN_SAMPLES: 0
, rafID: 0
, _running: false
, get running(){
    return this._running;
  }
, set running(x){
    this._running = x;
    if (!x){
      this.audioContainer.style.display = null;
    }
  }
, audioLevelEl: document.querySelector('.audioLevel')
, audioContainer: document.querySelector('.audioTools')
, freqLevelEl: document.querySelector('.frequencyLevel')
, gotStream(stream){ 
    // Create an AudioNode from the stream.
    this.audioContext = new AudioContext();
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.mediaStreamSource.connect(this.analyser);
    //updatePitch();

    this.running = true;
    this.audioContainer.style.display = "block";
    this.rafID = window.requestAnimationFrame(this.updatePitch.bind(this));
  }
, updatePitch(){
    this.analyser.getFloatTimeDomainData(this.buf);
    var {rms, freq} = this.autoCorrelate(this.buf, this.audioContext.sampleRate);

    if (rms != -1 && rms > 0.05){
      var level = (Math.log(rms)+3)/3;
      if (level < 0) level = 0;
      if (level > 1) level = 1;
      this.audioLevelEl.style.height = level*100+"%";
      this.freqLevelEl.innerText = freq.toFixed(1)+"Hz";
    }
    if (this.running)
      this.rafID = window.requestAnimationFrame(this.updatePitch.bind(this));
  }
, autoCorrelate(buf, sampleRate) {
    var SIZE = this.buf.length;
    var MAX_SAMPLES = Math.floor(SIZE/2);
    var best_offset = -1;
    var best_correlation = 0;
    var rms = 0;
    var foundGoodCorrelation = false;
    var correlations = new Array(MAX_SAMPLES);

    for (var i=0;i<SIZE;i++) {
      var val = this.buf[i];
      rms += val*val;
    }
    rms = Math.sqrt(rms/SIZE);
    if (rms<0.01) // not enough signal
      return {rms:-1, freq:0};

    var lastCorrelation=1;
    for (var offset = this.MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
      var correlation = 0;

      for (var i=0; i<MAX_SAMPLES; i++) {
        correlation += Math.abs((this.buf[i])-(this.buf[i+offset]));
      }
      correlation = 1 - (correlation/MAX_SAMPLES);
      correlations[offset] = correlation; // store it, for the tweaking we need to do below.
      if ((correlation>0.9) && (correlation > lastCorrelation)) {
        foundGoodCorrelation = true;
        if (correlation > best_correlation) {
          best_correlation = correlation;
          best_offset = offset;
        }
      } else if (foundGoodCorrelation) {
        var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
        return {rms, freq:sampleRate/(best_offset+(8*shift))};
      }
      lastCorrelation = correlation;
    }
    if (best_correlation > 0.01) {
      return {rms, freq:sampleRate/best_offset};
    }
    return {rms:-1, freq:0};
  }
}
class Countdown {
  constructor(parent, numElements){
    this.parent = parent;
    var dim = parent.getBoundingClientRect();
    this.elements = [];
    this.numElements = numElements;
    for (var i = 0; i < numElements; ++i){
      var giantNumber = ce('div');
      giantNumber.classList.add('giantNumber');
      giantNumber.style.lineHeight = dim.height + "px";
      giantNumber.style.fontSize = dim.height*1/2 + "px"
      giantNumber.innerText = i+1;
      this.elements.push(giantNumber);
      parent.appendChild(giantNumber);
    }
  }
  show(){
    var dim = this.parent.getBoundingClientRect();
    this.timers = [];
    for (let i = 0; i < this.numElements; ++i){
      this.timers.push(setTimeout(()=>{
        this.elements[i].style.opacity = 1;
        this.elements[i].style.fontSize = dim.height*4/5 + "px"
        setTimeout(()=>{
          this.elements[i].remove();
        },1000);
      },(this.numElements-1-i)*1000));
    }
  }
  cancelShow(){
    this.timers.map(i=>clearTimeout(i));
  }
}
var animate = {
  fadeIn(el){
    el.style.transition = "all 1s";
    el.style.opacity = 1;
    el.style.transform = "none";
  }
, fadeOut(el){
    el.style.transition = "all 1s";
    el.style.opacity = 0.04;
    el.style.transform = null;
  }
, fadeInDisplay(el){
    el.style.display = "block";
    el.style.transition = "all 1s";
    el.style.opacity = 1;
    setTimeout(()=>{
      el.style.opacity = 1;
    });
  }
}
var custom = {
  getDevices(){
    this.deviceInfo = [];
    navigator.mediaDevices.enumerateDevices().then(deviceInfos=>{
      // Handles being called several times to update labels. Preserve values.
      for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        //option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'videoinput') {
          console.log(deviceInfo.deviceId);
          this.deviceInfo.push(deviceInfo);
        }
      }
    })
  }
, start(vid, data) {
    var constraints = {
      audio: {deviceId: data.audioSource ? {exact: data.audioSource} : undefined},
      video: {deviceId: data.videoSource ? {exact: data.videoSource} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints).then(stream=>vid.srcObject=stream);
  }
}

var startButton = document.querySelector("#startButton")
var clearButton = document.querySelector("#clearButton")
var faceTrackingSwitch = document.querySelector("#faceTrackingSwitch")
var delay = document.querySelector("#delay")
var saveButton = document.querySelector("#saveButton")
var menu = document.querySelector(".menu")
var aboutPage = document.querySelector(".aboutPage")

startButton.onclick = function(e){
  state.button = startButton.classList.toggle('enabled') ? 
    STOP_BUTTON_STATE : 
    START_BUTTON_STATE;

  if (!delay.classList.contains('invalid'))
    state.delaySwitch.delay = parseFloat(delay.querySelector('.delayVal').value);

  if (state.button.started){
    videoPlayer.start();

    state.showVideo = true;
    state.saveButton = HIDE_SAVEBUTTON_STATE;
    if (state.faceTrackingSwitch.enabled)
      state.frInterval = setInterval(()=>facialRecognition.run(), 1500);
  } else {
    videoPlayer.stopAndReplay();
    audioHandler.running = false;
    clearInterval(state.frInterval);
    facialRecognition.removeCanvases();

    state.saveButton = SHOW_SAVEBUTTON_STATE;
  }
  this.innerText = state.button.text;
  saveButton.style.display = state.saveButton.visible ? "inline-block" : null;
  clearButton.style.display = "inline-block";
  menu.classList.add('videoPlaying'); //i guess maybe state.showVideo
  if (state.showVideo){
    var videoCover = qget('.videoCover');
    videoCover.style.display = "block";
  }
};
clearButton.onclick = function(e){
  videoPlayer.clear();
  audioHandler.running = false;
  clearInterval(state.frInterval);
  facialRecognition.removeCanvases();

  state.button = START_BUTTON_STATE;
  state.saveButton = HIDE_SAVEBUTTON_STATE;
  state.showVideo = false;

  startButton.innerText = state.button.text;
  state.button = startButton.classList.remove('enabled');
  saveButton.style.display = state.saveButton.visible ? "inline-block" : null;
  clearButton.style.display = null;
  menu.classList.remove('videoPlaying');
  var videoCover = qget('.videoCover');
  videoCover.style.display = null;
  clearInterval(state.frInterval);
}
saveButton.onclick = function(e){
  videoPlayer.save();
}
faceTrackingSwitch.onclick = function(e){
  state.faceTrackingSwitch = faceTrackingSwitch.classList.toggle('enabled') ? 
    ENABLED_FACE_SWITCH_STATE : 
    DISABLED_FACE_SWITCH_STATE;

  // Render
  var textNode = this.qget('span');
  textNode.innerText = state.faceTrackingSwitch.text;
  if (state.faceTrackingSwitch.enabled){
    state.frInterval = setInterval(()=>facialRecognition.run(), 1500);
  } else {
    clearInterval(state.frInterval);
    facialRecognition.removeCanvases();
  }
}
delay.onclick = function(e){
  state.delaySwitch = delay.classList.toggle('enabled') ? 
    Object.assign(state.delaySwitch, ENABLED_DELAY_SWITCH_STATE) :
    Object.assign(state.delaySwitch, DISABLED_DELAY_SWITCH_STATE)

  if (state.delaySwitch.enabled){
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map(vid=>{
      videoPlayer.playBuffered(vid);
    });
  } else {
    videoPlayer.removeDelay();
  }
}
var delayVal = delay.querySelector('.delayVal')
delayVal.onclick = function(e){
  e.stopPropagation();
}
delayVal.onkeyup = function(e){
  // get check if valid
  var val = this.value
  var isValid = parseFloat(val) == val && val >= 0.1
  if (isValid){
    this.classList.remove('invalid')

    if (state.delaySwitch.enabled){
      state.delaySwitch.delay = val;
      videoPlayer.adjustBufferedTime();
    }
  } else {
    this.classList.add('invalid')
  }
}
delayVal.onkeydown = function(e){
  e.stopPropagation();
}

// Keyboard shortcuts
document.onkeydown = function(e) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
    return;
  switch(e.keyCode){
    case keyCode.KEY_R:
      console.log("r pressed");
      startButton.click();
      break;
    case keyCode.KEY_C:
      console.log("c pressed");
      clearButton.click();
      break;
    case keyCode.SPACE:
      console.log("space pressed");
      var videoElements = Array.from(document.querySelectorAll('video'));
      videoElements.map((el)=>{
        el.paused ? el.play() : el.pause();
      });
      break;
    case keyCode.KEY_M:
      console.log("m pressed");
      var videoElements = Array.from(document.querySelectorAll('video'));
      videoElements.map((el)=>{
        el.muted = el.muted ? false : true
      });
      break;
  }
}
var aboutShown = false;
window.onscroll = function(e){
  var dim = aboutPage.getBoundingClientRect();
  if (!aboutShown && dim.top < window.innerHeight/2){
    animate.fadeIn(aboutPage);
    aboutShown = true;
  } else if(aboutShown && dim.top > window.innerHeight/2){
    animate.fadeOut(aboutPage);
    aboutShown = false;
  }
}
window.onscroll();
window.onresize = function(e){
  console.log('resize');
  videoPlayer.layoutVideoElements();
}

var facialRecognition = {
  ctx: null
, createCanvases(num){
    var canvasContainer = geid('canvasContainer');
    var canvases = qgeta('canvas');
    for(var i = canvases.length; i < num; ++i){
      var cEl = document.createElement('canvas');
      canvasContainer.appendChild(cEl);
    }
  }
, removeCanvases(){
    var canvases = qgeta('canvas');
    for(var i = 0; i < canvases.length; ++i){
      canvases[i].remove();
    }
  }
, layoutCanvas(video, canvas, vidDim){
    // for each canvas set the width and height equal to video while maintaining dim aspect ratio
    var vdim = video.getBoundingClientRect();
    var vidAspectRatio = vdim.width/vdim.height;
    var canvAspectRatio = vidDim.width/vidDim.height;
    var imgDim = vidAspectRatio > canvAspectRatio ? {
      width: vdim.height * canvAspectRatio
    , height: vdim.height
    } : {
      width: vdim.width
    , height: vdim.width/canvAspectRatio
    }
    Object.assign(canvas.style, imgDim.map((k,v)=>v+"px"));
    Object.assign(canvas, imgDim);
    Object.assign(canvas.style, {
      left: (vdim.width - imgDim.width) / 2 + vdim.left + "px"
    , top: (vdim.height - imgDim.height) / 2 + vdim.top + "px"
    });
  }
, getImageFromVideo(video){
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')
      .drawImage(video, 0, 0, canvas.width, canvas.height);

    var img = document.createElement("img");
    img.src = canvas.toDataURL();
    return img;
  }
, getGreyedCanvasFromVideo(video){
    var imgCanvas = document.createElement("canvas");
    imgCanvas.width = video.videoWidth;
    imgCanvas.height = video.videoHeight;
    imgCanvas.getContext("2d").drawImage(video, 0, 0);
    //return imgCanvas;
    return ccv.grayscale(imgCanvas);
  }
, drawCanvas(video, canvas, imgCanvas){
    var dim = canvas.getBoundingClientRect();
    var ctx = canvas.getContext("2d");

    var comp = ccv.detect_objects({
      //canvas: ccv.grayscale(ccv.pre(image))
      canvas: imgCanvas
    , cascade: cascade
    , interval: 5
    , min_neighbors: 1
    });
    this.post(canvas, comp, canvas.width/video.videoWidth);
  }
, post(canvas, comp, scale){
    // "num-faces" comp.length.toString();
    // "detection-time" Math.round((new Date()).getTime() - elapsed_time).toString() + "ms";
    console.log('faces:',comp.length);
    var ctx = canvas.getContext('2d')
    ctx.lineWidth = 2;
    ctx.strokeStyle="rgba(75,221,17,1)";
    /* draw detected area */
    for (var i = 0; i < comp.length; ++i) {
      ctx.beginPath();
      ctx.strokeRect(comp[i].x*scale, comp[i].y*scale, comp[i].width*scale, comp[i].height*scale);
      ctx.stroke();
    }
  }
, run(){
    var elapsed_time = (new Date()).getTime();
    var videos = Array.from(qgeta('video'));
    this.createCanvases(videos.length);
    console.log('Time to create canvases:',(new Date()).getTime() - elapsed_time);
    var canvases = Array.from(qgeta('canvas'));
    videos.map((v,idx)=>{
      //var image = this.getImageFromVideo(v);
      //console.log('Time to draw images:',(new Date()).getTime() - elapsed_time);
      var imgCanvas = this.getGreyedCanvasFromVideo(v);
      console.log('Time to draw canvas:',(new Date()).getTime() - elapsed_time);
      //imgCanvas = ccv.grayscale(imgCanvas);
      //console.log('Time to grey canvas:',(new Date()).getTime() - elapsed_time);
      this.layoutCanvas(v, canvases[idx], {width:v.videoWidth, height:v.videoHeight});
      console.log('Time to layout canvas:',(new Date()).getTime() - elapsed_time);
      this.drawCanvas(v, canvases[idx], imgCanvas);
      console.log('Time to render:',(new Date()).getTime() - elapsed_time);
    });
    console.log('Time to do all:',(new Date()).getTime() - elapsed_time);
  }
}
