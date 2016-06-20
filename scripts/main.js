'use strict';

const START_BUTTON_STATE = {started: false, text: "Start Recording"}
const STOP_BUTTON_STATE = {started: true, text: "Stop Recording"}
const SHOW_SAVEBUTTON_STATE = {visible: true}
const HIDE_SAVEBUTTON_STATE = {visible: false}
const DISABLED_FACE_SWITCH_STATE = {enabled: false, text: "Enable Facial Tracking"}
const ENABLED_FACE_SWITCH_STATE = {enabled: true, text: "Disable Facial Tracking"}
const INITIAL_STATE = {
  deviceInfos:{audiooutput:[], audioinput:[], videoinput:[]}
, button: START_BUTTON_STATE
, recordStreams: []
, saveButton: HIDE_SAVEBUTTON_STATE
, faceTrackingSwitch: DISABLED_FACE_SWITCH_STATE
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

    var divisor = Math.ceil(Math.sqrt(videos.length));
    var menuHeight = document.querySelector('.menu').getBoundingClientRect().height;
    //var menuHeight = 0;

    videos.map((vid,idx)=>{
      var width = document.documentElement.clientWidth/divisor;
      var height = (document.documentElement.clientHeight-menuHeight)/divisor;
      Object.assign(vid.style, {
        width:width + "px"
      , height: height + "px"
      , top: parseInt(idx/divisor) * height + menuHeight + "px"
      , left: idx%divisor * width + "px"
      });

      Object.assign(vidLabels[idx].style,{
        top: parseInt(idx/divisor) * height + menuHeight + "px"
      , left: idx%divisor * width + "px"
      });
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

    state.deviceInfos.videoinput.map((dInfo,idx)=>{
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

      //Load and start webcams
      var constraint = {audio:true, video: {deviceId: {exact:dInfo.value}}};

      navigator.mediaDevices.getUserMedia(constraint).
        then(stream=>{
          videl.srcObject = stream;
          rtcRecord.start(stream);
          audioHandler.gotStream(stream);
        }).catch(handleError);
    });

    this.layoutVideoElements();
  }
, stop(isReplay, isClear){
    var videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.map((el)=>{
      el.srcObject.getVideoTracks().map((el)=>el.stop());
      if (isReplay){
        rtcRecord.stopAndReplay(videoElements);
      } else if (isClear){
        rtcRecord.clear();
        el.remove();
      } else {
        rtcRecord.stop(videoElements);
      }
    });
    var vidLabels = Array.from(document.querySelectorAll('.vidLabel'));
    vidLabels.map((el)=>{el.remove()});
  }
, stopAndReplay(){
    this.stop(true);
  }
, clear(){
    this.stop(null, true);
  }
}
var rtcRecord = {
  start(mediaStream){
    var options = {
      type: 'video',
      frameInterval: 20 // minimum time between pushing frames to Whammy (in milliseconds)
    };
    var recordRTC = RecordRTC(mediaStream, options);
    recordRTC.startRecording();
    state.recordStreams.push(recordRTC);
  }
, stop(videoElements, isReplay){
    if (videoElements.length < state.recordStreams.length){
      console.error('recordStreams greater than video elements');
      state.recordStreams.splice(videoElements.length);
    }
    state.recordStreams.map((recordRTC,idx)=>{
      recordRTC.stopRecording((videoURL)=>{
        console.log('videoURL:',videoURL);
        if (isReplay){
          videoElements[idx].src = videoURL;
          videoElements[idx].setAttribute('loop','');
        }
      });
    });
  }
, stopAndReplay(videoElements){
    this.stop(videoElements, true);
  }
, clear(){
    state.recordStreams.map((recordRTC,idx)=>{
      recordRTC.stopRecording((videoURL)=>{
        console.log('videoURL:',videoURL);
        //window.open(recordRTC.toURL());
      });
    });
    state.recordStreams = [];
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

var startButton = document.querySelector("#startButton")
var clearButton = document.querySelector("#clearButton")
var faceTrackingSwitch = document.querySelector("#faceTrackingSwitch")
var saveButton = document.querySelector("#saveButton")
var menu = document.querySelector(".menu")

startButton.onclick = function(e){
  state.button = startButton.classList.toggle('enabled') ? 
    STOP_BUTTON_STATE : 
    START_BUTTON_STATE;

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
  //Get list of streams, save
  var d = new Date();
  var n = d.toISOString().slice(0,19);
  state.recordStreams.map((stream, idx)=>stream.save("r_"+n+"_"+idx+".webm"));
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

// Keyboard shortcuts
document.onkeydown = function(e) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
    return;
  switch(e.keyCode){
    case keyCode.KEY_S:
      console.log("s pressed");
      // Giant Numbers animation
      var giantNumbers = Array.from(document.querySelectorAll('.giantNumber'));
      var menuHeight = document.querySelector('.menu').getBoundingClientRect().height;

      var func = (numList, cb)=>{
        numList[0].style.lineHeight = window.innerHeight-menuHeight+"px";
        numList[0].style.opacity = 1;
        numList[0].style.fontSize = "200px";

        // Callback on itself after delay, hide and show next
        setTimeout(()=>{
          var hide = numList.splice(0,1)[0];
          hide.style.opacity = null;
          if (numList.length > 0){
            cb(numList, cb);
          } else {
            // countdown finished
            videoPlayer.stop();
            videoPlayer.start();
          }
        },1000);
      };
      
      // warmup cause it ain't synced
      if (!state.button.started){
        func(giantNumbers, func);
      }
      startButton.click();
      break;
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
, layoutCanvas(video, canvas, dim){
    // for each canvas set the width and height equal to video while maintaining dim aspect ratio
    var vdim = video.getBoundingClientRect();
    var vidAspectRatio = vdim.width/vdim.height;
    var canvAspectRatio = dim.width/dim.height;
    var newDim = {};
    if (vidAspectRatio > canvAspectRatio){
      newDim = {
        width: vdim.height * canvAspectRatio
      , height: vdim.height
      }
    } else {
      newDim = {
        width: vdim.width
      , height: vdim.width/canvAspectRatio
      }
    }
    Object.assign(canvas.style, newDim.map((k,v)=>v+"px"));
    Object.assign(canvas, newDim);
    var pos = {left: (vdim.width - newDim.width) / 2 + "px", top: vdim.top+"px"}
    Object.assign(canvas.style, pos);
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

    // detect the feature
    //ctx.drawImage(image, 0, 0);
    //console.log(Parallel);
    //new HAAR.Detector(haarcascade_frontalface_alt, Parallel)
    //  .image(image) // use the image
    //  .interval(40) // set detection interval for asynchronous detection (if not parallel)
    //  .complete(function(){  // onComplete callback
    //      var i, rect, l=this.objects.length;
    //      ///wait.style.display='none';
    //      ctx.strokeStyle="rgba(220,0,0,1)"; ctx.lineWidth=2;
    //      ctx.strokeRect(this.Selection.x, this.Selection.y, this.Selection.width, this.Selection.height);
    //      ctx.strokeStyle="rgba(75,221,17,1)"; ctx.lineWidth=2;
    //      for (i=0; i<l; i++)
    //      {
    //          rect=this.objects[i];
    //          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    //      }
    //      // provide info
    //      console.log('Selection Rectangle: ', this.Selection.toString());
    //      console.log('Detected Features (' + l +') :', this.objects.toString());
    //      console.log(l+" Objects found");
    //  })
    //  .detect(1, 1.25, 0.5, 1, true); // go
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