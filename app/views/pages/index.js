import React from 'react';
import withHenri from '@usehenri/react/withHenri';
import PropTypes from 'prop-types';
import ss from 'socket.io-stream';
import snappy from 'snappyjs';

var mediaRecorder;
class Index extends React.Component {
  state = { text: '', isRecording: !1, timeDisplay: '' };

  startTime = 0;
  isReady = !1;
  audioContext = {};
  bufferSize = 1024 * 8;
  maxTime = 20000;
  mediaTrack = {};
  processor = {};
  recorder = {};
  updateInterval = 0;
  compress = false;

  componentDidMount() {
    try {
      (window.AudioContext = window.AudioContext || window.webkitAudioContext),
        (navigator.getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia);
    } catch (a) {
      this.setState({
        text: [{ text: `Essaie avec Chrome`, color: 'red' }],
      });
      this.controlsDisabled = this.isReady = !0;
      return;
    }
    navigator.getUserMedia && window.AudioContext
      ? (this.audioContext = new AudioContext())
      : null;

    this.props.socket.on('answers', data => {
      return this.setState({ text: data });
      if (Array.isArray(data) && data.length > 0) {
        console.log('good', data);
        this.setState({ text: data });
      }
      console.log('skipped', data);
    });
    this.isReady = true;
  }
  componentWillUnmount() {
    this.stop();
  }
  onClick = () => {
    // return this.setState({ text: `${this.state.text} Salut ca va` });
    if (this.state.isRecording) {
      return this.stop();
    }
    this.start();
  };
  start = () => {
    if (!this.isReady) {
      this.setState({ text: 'Lecteur non prêt' });
    }
    if (this.state.isRecording) {
      return;
    }
    this.props.socket.emit('status', 'start');
    this.setState({
      text: [],
      isRecording: true,
      timeDisplay: `00:00 / 00:${this.maxTime / 1e3}`,
    });
    this.startTime = Date.now();
    this.startStream();
  };
  stop = () => {
    setTimeout(() => {
      this.audioContext &&
        'running' == this.audioContext.state &&
        (this.processor && (this.processor.onaudioprocess = function() {}),
        (this.processor = {}));
      this.mediaTrack &&
        this.mediaTrack.stop &&
        (this.mediaTrack.stop(), (this.mediaTrack = {}));
      clearInterval(this.updateInterval);
      this.props.socket.emit('status', 'stop');
      this.setState({ isRecording: false, timeDisplay: '' });
      this.startTime = 0;
    }, 1500);
  };
  startStream = () => {
    navigator.getUserMedia(
      { audio: true },
      stream => {
        const ctx = this.audioContext.createMediaStreamSource(stream);
        this.processor = this.audioContext.createScriptProcessor(
          this.bufferSize,
          1,
          1
        );
        this.processor.onaudioprocess = sound => {
          this.processAudio(sound);
        };
        this.processor.connect(this.audioContext.destination);
        ctx.connect(this.processor);
        this.mediaTrack = stream.getTracks()[0];

        this.updateInterval = setInterval(() => {
          this.update();
        }, 500);
      },
      () => {
        this.setState({
          text: [{ text: `Veuillez autoriser le micro`, color: 'red' }],
        });
        this.stop();
      }
    );
  };
  update = () => {
    const elapsed = Date.now() - this.startTime;
    elapsed >= this.maxTime ? this.stop() : this.updateTime(elapsed);
  };
  updateTime = elapsed => {
    1e3 <= elapsed &&
      ((elapsed =
        1e4 > elapsed
          ? '0' + elapsed.toString().slice(0, -3)
          : elapsed.toString().slice(0, -3)),
      this.setState({
        timeDisplay: '00:' + elapsed + ' / 00:' + this.maxTime / 1e3,
      }));
  };
  processAudio = sound => {
    const { socket } = this.props;
    let a =
      sound.inputBuffer.getChannelData(0) || new Float32Array(this.bufferSize);
    for (var b = a.length, c = new Int16Array(b); b--; )
      c[b] = 32767 * Math.min(1, a[b]);
    // console.log(c, c.buffer);
    const data = this.compress ? snappy.compress(c.buffer) : c.buffer;
    socket.emit('message', data);
  };
  showText = () => {
    if (this.state.text && this.state.text.length > 0) {
      return this.state.text.map((val, i) => {
        return (
          <p key={i} style={{ color: val.color || 'black' }}>
            {' '}
            {val.text}
          </p>
        );
      });
    }
    return (
      <p style={{ color: 'lightgrey' }}>Appuyer sur le micro pour commencer</p>
    );
  };
  render() {
    const { isRecording, timeDisplay, text } = this.state;
    let size = getSize(text);
    return (
      <div>
        <button
          className={isRecording ? 'button recording' : 'button'}
          onClick={() => this.onClick()}
        >
          <span className={`icon-microphone${isRecording ? '' : '-slash'}`} />{' '}
          {timeDisplay}
        </button>
        <div className="wrapper">
          <h1 className="maintext" style={{ fontSize: `${size}vh` }}>
            {this.showText()}
          </h1>
        </div>
      </div>
    );
  }
}

const getSize = text => {
  let size = 11;
  if (text.length > 150 && text.length < 200) {
    size = 9;
  } else if (text.length >= 200 && text.length < 250) {
    size = 8;
  } else if (text.length >= 250 && text.length < 300) {
    size = 7;
  } else if (text.length >= 300 && text.length < 475) {
    size = 6;
  } else if (text.length >= 475 && text.length < 700) {
    size = 5;
  } else if (text.length >= 700 && text.length < 1000) {
    size = 4;
  } else if (text.length >= 1000 && text.length < 1300) {
    size = 3;
  } else if (text.length >= 1300 && text.length < 1700) {
    size = 2;
  }
  return size;
};

export default withHenri(Index);
