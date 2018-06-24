import {render} from 'react-dom';
import Modal from 'react-modal';
import React, {Component} from 'react';
import {ToastContainer, toast} from 'react-toastify';

const state = {};
const devices = {
  audio: {
    input: [],
    output: []
  },
  video: {
    input: []
  }
}
navigator.mediaDevices.enumerateDevices().then((devs) => {
  devs.forEach((d) => {
    if (d.kind === 'audioinput') {
      devices.audio.input.push(d);
    } else if (d.kind === 'audiooutput') {
      devices.audio.output.push(d);
    } else if (d.kind === 'videoinput') {
      devices.video.input.push(d);
    }
  });
});

function handleError(err) {
  toast.error(err.message);
}

// simple check, not particularly robust though
function isDeviceId(id) {
  return typeof id === 'string';
}

const DeviceSelect = (props) => {
  return <div>
    <h2>{props.name}</h2>
    <select onChange={(ev) => props.onChange(ev.target.value)}>
      {props.devices.map((d) => {
        return <option value={d.deviceId} key={d.deviceId}>{d.label}</option>;
      })}
    </select>
  </div>;
}

const sampleSize = 128**2;
const sampleAvgInterval = 16;
const meterTicks = 6;

class AudioMeter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rms: 0
    }
  }

  componentDidUpdate(prevProps) {
    let stream = this.props.stream;
    if (stream && stream !== prevProps.stream) {
      // h/t tubertc
      let audioContext = new AudioContext();
      let mediaStreamSource = audioContext.createMediaStreamSource(stream);
      let processor = audioContext.createScriptProcessor(sampleSize, 1, 1);
      mediaStreamSource.connect(processor);
      processor.connect(audioContext.destination);
      processor.onaudioprocess = (ev) => {
        var buf = ev.inputBuffer;
        if (buf.numberOfChannels > 0) {
          var inputData = buf.getChannelData(0);
          var inputDataLength = inputData.length;
          var total = 0;

          for (var i = 0; i < inputDataLength; i += sampleAvgInterval) {
            total += Math.abs(inputData[i]);
          }

          var rms = Math.sqrt((sampleAvgInterval * total) / inputDataLength);
          this.setState({ rms });

          // TODO broadcast if not muted
        }
      }
    }
  }

  render() {
    let nTicks = Math.round(this.state.rms*meterTicks);
    return <div className='audiometer'>
      {this.props.muted ?
        <span className='audiometer-muted'>Muted</span> :
        [...Array(nTicks).keys()].map((k) => {
          return <span className='audiometer-tick' key={k}></span>
        })}
    </div>
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoSrc: true,
      audioSrc: true,
      audioSink: true,
      localMuted: false,
      settingsOpen: false
    }
  }

  render() {
    return <div>
      <ToastContainer />
      <Modal
        className='modal'
        isOpen={this.state.settingsOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => this.setState({settingsOpen: false})}>
        <h1>settings</h1>
        <DeviceSelect name='Audio Input' devices={devices.audio.input} onChange={(id) => this.setState({audioSrc: id})}/>
        <DeviceSelect name='Audio Output' devices={devices.audio.output} onChange={(id) => this.setState({audioSink: id})} />
        <DeviceSelect name='Video Input' devices={devices.video.input} onChange={(id) => this.setState({videoSrc: id})} />
      </Modal>
      <button onClick={() => this.setState({settingsOpen: true})}>Settings</button>
      <button onClick={() => this.setState({localMuted: !this.state.localMuted})}>{this.state.localMuted ? 'Unmute': 'Mute'}</button>
      <Preview audioSrc={this.state.audioSrc} videoSrc={this.state.videoSrc} audioSink={this.state.audioSink} muted={this.state.localMuted} />
    </div>;
  }
}

class Preview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stream: null
    };
    this.video = React.createRef();
  }

  setStream(prevProps) {
    // only re-build stream when necessary
    if (!prevProps || prevProps.videoSrc != this.props.videoSrc || prevProps.audioSrc != this.props.audioSrc) {
      let constraints = {
        video: this.props.videoSrc,
        audio: this.props.audioSrc
      };
      if (isDeviceId(this.props.audioSrc)) {
        constraints.audio = {deviceId: {exact: this.props.audioSrc}};
      }
      if (isDeviceId(this.props.videoSrc)) {
        constraints.video = {deviceId: {exact: this.props.videoSrc}};
      }

      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (this.state.stream) {
          console.log('killing old stream');
          this.state.stream.getTracks().forEach((track) => track.stop());
        }
        this.video.current.srcObject = stream;
        this.setState({ stream });
      }).catch(handleError);
    }
    this.video.current.muted = this.props.muted;
  }

  componentDidMount() {
    this.setStream();
  }

  componentDidUpdate(prevProps) {
    this.setStream(prevProps);
    if (isDeviceId(this.props.audioSink)) {
      this.video.current.setSinkId(this.props.audioSink).catch(handleError);
    }
  }

  render() {
    return <div className='preview'>
      <video ref={this.video} autoPlay={true}></video>
      <AudioMeter muted={this.props.muted} stream={this.state.stream} />
    </div>;
  }
}

let main = document.getElementById('main');
Modal.setAppElement(main);
render(<App />, main);
