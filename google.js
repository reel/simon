Polymer({
  is: 'sp-app',
  properties: {
    audioContext: {
      type: Object,
    },
    bufferSize: {
      type: Number,
      readOnly: !0,
      value: 4096,
    },
    controlsDisabled: {
      type: Boolean,
      value: !1,
    },
    checkRecorder: {
      type: Number,
      value: 0,
    },
    fallbackUrl: {
      type: String,
      readOnly: !0,
      value: 'https://speech.googleapis.com/v1/speech:syncrecognize',
    },
    fallbackProxyUrl: {
      type: String,
      readOnly: !0,
      value: 'https://cxl-services.appspot.com/proxy',
    },
    isRecording: {
      type: Boolean,
      value: !1,
      observer: 'isRecordingChanged_',
    },
    isReady: {
      type: Boolean,
      value: !1,
    },
    language: {
      type: String,
      value: 'en-US',
    },
    maxRecordTime: {
      type: Number,
      value: 5e4,
    },
    mediaTrack: {
      type: Object,
    },
    processor: {
      type: Object,
    },
    recorder: {
      type: Object,
    },
    recorderLib: {
      type: String,
      readOnly: !0,
      value: '/_static/js/recorder-bundle.js',
    },
    recorderWorkerLib: {
      type: String,
      readOnly: !0,
      value: '/_static/js/recorderWorker-bundle.js',
    },
    startTime: {
      type: Number,
    },
    socket: {
      type: Object,
    },
    streamingAvailable: {
      type: Boolean,
    },
    timeDisplay: {
      type: String,
      value: '00:00',
    },
    tempResult: {
      type: String,
      value: '',
    },
    updateInterval: {
      type: Number,
    },
    serverUrl: {
      type: String,
      value: 'cloudspeech.goog',
    },
  },
  listeners: {
    'sp-analytics-triggered': 'handleAnalyticsEvent_',
  },
  ready: function() {
    try {
      (window.AudioContext = window.AudioContext || window.webkitAudioContext),
        (navigator.getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia);
    } catch (a) {
      this.$.resultStack.addResult('Your browser is not currently supported.');
      this.controlsDisabled = this.isReady = !0;
      return;
    }
    navigator.getUserMedia && window.AudioContext
      ? ((this.audioContext = new AudioContext()), this.checkServer_())
      : (this.$.resultStack.addResult(
          'Your browser is not currently supported.'
        ),
        (this.controlsDisabled = this.isReady = !0));
  },
  camelCase_: function(a) {
    return a && -1 != a.indexOf('-')
      ? a.toLowerCase().replace(/-+(.)?/g, function(a, c) {
          return c ? c.toUpperCase() : '';
        })
      : a;
  },
  checkServer_: function() {
    var a = this,
      b = new XMLHttpRequest();
    b.onload = function() {
      200 <= b.status &&
        400 > b.status &&
        ((a.streamingAvailable = !0),
        (a.isReady = !0),
        (a.controlsDisabled = !1));
    };
    b.onerror = function() {
      a.initFallback_();
    };
    b.open('GET', '//' + this.serverUrl + '/status', !0);
    b.send();
  },
  escape_: function(a) {
    return a
      ? a
          .replace(/\\/g, '\\\\')
          .replace(/,/g, '\\,')
          .replace(/=/g, '\\=')
      : a;
  },
  initFallback_: function() {
    var a = this;
    if (!this.checkRecorder && !window.Recorder) {
      var b = document.createElement('script');
      b.src = this.recorderLib;
      document.head.appendChild(b);
      this.checkRecorder = setInterval(function() {
        window.Recorder &&
          ((a.isReady = !0),
          (a.controlsDisabled = !1),
          (a.maxRecordTime = 3e4),
          clearInterval(a.checkRecorder));
      }, 200);
      this.streamingAvailable = !1;
    }
  },
  stringifyMetaData_: function(a) {
    if (a) {
      var b = [];
      for (c in a) b.push(c);
      b.sort();
      var c = [];
      for (var d = 0; d < b.length; d++) {
        var k = b[d],
          g = a[k];
        g &&
          'object' != typeof g &&
          ((k = this.camelCase_(this.escape_(k))),
          (g = this.escape_('' + g)),
          c.push(k + '=' + g));
      }
      return c.join(',');
    }
  },
  processAudio_: function(a) {
    a = a.inputBuffer.getChannelData(0) || new Float32Array(this.bufferSize);
    for (var b = a.length, c = new Int16Array(b); b--; )
      c[b] = 32767 * Math.min(1, a[b]);
    1 !== this.socket.readyState
      ? this.showErrorState_(1)
      : this.socket.send(c.buffer);
  },
  startRecording_: function() {
    var a = this;
    this.controlsDisabled = !0;
    this.timeDisplay = '00:00 / 00:' + this.maxRecordTime / 1e3;
    this.startTime = Date.now();
    this.streamingAvailable
      ? this.startStreaming_()
      : (this.startFallback_(),
        (this.updateInterval = setInterval(function() {
          a.updateApp_();
        }, 500)));
    this.fire('sp-analytics-triggered', {
      type: 'speech-api',
      name: 'recordStarted',
    });
  },
  startFallback_: function() {
    var a = this;
    this.tempResult = 'Recording...';
    navigator.getUserMedia(
      {
        audio: {
          mandatory: {
            googEchoCancellation: 'false',
            googAutoGainControl: 'false',
            googNoiseSuppression: 'false',
            googHighpassFilter: 'false',
          },
          optional: [],
        },
      },
      function(b) {
        var c = a.audioContext.createMediaStreamSource(b);
        a.mediaTrack = b.getTracks()[0];
        a.recorder = new window.Recorder(c, {
          numChannels: 1,
          workerPath: a.recorderWorkerLib,
        });
        a.recorder.clear();
        a.recorder.record();
      },
      function() {
        a.showErrorState_(2);
      }
    );
  },
  startStreaming_: function() {
    var a = this;
    this.tempResult = '';
    this.socket = new WebSocket('wss://' + this.serverUrl + '/ws');
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = function() {
      a.socket.send(
        JSON.stringify({
          rate: a.audioContext.sampleRate,
          language: a.language,
          format: 'LINEAR16',
        })
      );
      navigator.getUserMedia(
        {
          audio: !0,
        },
        function(b) {
          var c = a.audioContext.createMediaStreamSource(b);
          a.processor = a.audioContext.createScriptProcessor(
            a.bufferSize,
            1,
            1
          );
          a.processor.onaudioprocess = function(b) {
            a.processAudio_(b);
          };
          a.processor.connect(a.audioContext.destination);
          c.connect(a.processor);
          a.mediaTrack = b.getTracks()[0];
          a.updateInterval = setInterval(function() {
            a.updateApp_();
          }, 500);
        },
        function() {
          a.$.resultStack.addResult(
            'Cannot access the demo. You will receive this error if\n                                            you do not have a microphone connected or if your\n                                            browser is not authorized to access your microphone.\n                                            Verify that your browser has access to your microphone\n                                            and try again.'
          );
          a.stopRecording_();
        }
      );
    };
    this.socket.onmessage = function(b) {
      b = JSON.parse(b.data);
      b.isFinal
        ? (a.$.resultStack.addResult(b.text.trim()), (a.tempResult = ''))
        : b.text.length >= a.tempResult.length && (a.tempResult = b.text);
    };
    this.socket.onclose = function(b) {
      1006 === b.code ? a.showErrorState_(3) : (a.controlsDisabled = !1);
    };
    this.socket.onerror = function() {
      a.showErrorState_(4);
    };
  },
  isRecordingChanged_: function(a, b) {
    'undefined' !== typeof b &&
      (this.isRecording ? this.startRecording_() : this.stopRecording_());
  },
  stopRecording_: function() {
    var a = Date.now() - this.startTime;
    this.isRecording = !1;
    clearInterval(this.updateInterval);
    this.timeDisplay = '00:00 / 00:' + this.maxRecordTime / 1e3;
    this.streamingAvailable ? this.stopStreaming_() : this.stopFallback_();
    this.fire('sp-analytics-triggered', {
      type: 'speech-api',
      name: 'recordStopped',
      metadata: {
        recordingTime: a,
      },
    });
  },
  stopStreaming_: function() {
    var a = this;
    setTimeout(function() {
      a.audioContext &&
        'running' == a.audioContext.state &&
        (a.processor && (a.processor.onaudioprocess = function() {}),
        (a.processor = {}));
      a.socket &&
        1 == a.socket.readyState &&
        (a.socket && a.socket.close(), (a.socket = {}));
      '' !== a.tempResult &&
        (a.$.resultStack.addResult(a.tempResult), (a.tempResult = ''));
      a.mediaTrack &&
        a.mediaTrack.stop &&
        (a.mediaTrack.stop(), (a.mediaTrack = {}));
    }, 1500);
    clearInterval(this.updateInterval);
    this.timeDisplay = '00:00 / 00:' + this.maxRecordTime / 1e3;
  },
  stopFallback_: function() {
    var a = this;
    this.tempResult = 'Processing...';
    setTimeout(function() {
      a.recorder.stop();
      a.mediaTrack &&
        a.mediaTrack.stop &&
        (a.mediaTrack.stop(), (a.mediaTrack = {}));
      a.recorder.exportWAV(function(b) {
        var c = new FileReader();
        c.onload = function(b) {
          b = b.target.result;
          a.sendAudio_(
            btoa(b),
            a.language,
            'LINEAR16',
            a.audioContext.sampleRate
          );
        };
        c.readAsBinaryString(b);
      });
    }, 500);
  },
  sendAudio_: function(a, b, c, d) {
    var k = this,
      g =
        this.fallbackProxyUrl + '?url=' + encodeURIComponent(this.fallbackUrl);
    a = JSON.stringify({
      config: {
        encoding: c,
        sampleRate: d,
        languageCode: b,
        maxAlternatives: 1,
      },
      audio: {
        content: a,
      },
    });
    var n = new XMLHttpRequest();
    n.onload = function() {
      if (200 <= n.status && 400 > n.status) {
        var a = JSON.parse(n.responseText);
        k.controlsDisabled = !1;
        k.tempResult = '';
        k.recorder = {};
        a.results
          ? ((a = a.results.map(function(a) {
              return a.alternatives[0].transcript;
            })),
            k.$.resultStack.addResult(a.join('')))
          : k.$.resultStack.addResult('No Speech Detected');
      } else k.$.resultStack.addResult('Service unavailable');
    };
    n.open('POST', g, !0);
    n.send(a);
  },
  showErrorState_: function(a) {
    this.isRecording && this.stopRecording_();
    this.$.resultStack.addResult(
      'Demo not currently available, please try again in a few\n                                     moments.'
    );
    this.$.resultStack.disableStack();
    console.log('Error code ' + a);
  },
  updateApp_: function() {
    var a = Date.now() - this.startTime;
    a >= this.maxRecordTime
      ? this.stopRecording_()
      : 1e3 <= a &&
        ((a =
          1e4 > a
            ? '0' + a.toString().slice(0, -3)
            : a.toString().slice(0, -3)),
        (this.timeDisplay = '00:' + a + ' / 00:' + this.maxRecordTime / 1e3));
  },
});
