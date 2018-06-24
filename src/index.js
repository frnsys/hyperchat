import {render} from 'react-dom';
import Modal from 'react-modal';
import React, {Component} from 'react';
import AudioMeter from './lib/AudioMeter';
import {ToastContainer, toast} from 'react-toastify';
import recorder from 'media-recorder-stream';
import hyperdrive from 'hyperdrive';
import hyperdiscovery from 'hyperdiscovery';



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

function objectChanged(prev, obj) {
  return JSON.stringify(prev) !== JSON.stringify(obj);
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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoSrc: true,
      audioSrc: true,
      audioSink: true,
      audioOnly: false,
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
      <button onClick={() => this.setState({audioOnly: !this.state.audioOnly})}>{this.state.audioOnly ? 'Enable Video': 'Disable Video'}</button>
      <Preview audioSrc={this.state.audioSrc} videoSrc={this.state.videoSrc} audioSink={this.state.audioSink} muted={this.state.localMuted} audioOnly={this.state.audioOnly} />
    </div>;
  }
}

class Preview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stream: null,
      recorder: null,
      constraints: null
    };
    this.video = React.createRef();
  }

  setStream(prevProps) {
    // only re-build stream when necessary
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
    if (this.props.audioOnly) {
      constraints.video = false;
    }
    if (!this.state.constraints ||
      objectChanged(this.state.constraints.audio, constraints.audio) ||
      objectChanged(this.state.constraints.video, constraints.video)) {
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (this.state.stream) {
          console.log('killing old stream');
          this.state.stream.getTracks().forEach((track) => track.stop());
        }
        console.log(this.state.recorder);
        if (this.state.recorder) {
          console.log('killing old recorder');
          this.state.recorder.destroy();
        }

        this.video.current.srcObject = stream;

        let mimeType = this.props.audioOnly ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp9,opus';
        let mediaRecorder = recorder(stream, {
          mimeType,
          videoBitsPerSecond: 600000,
          audioBitsPerSecond: 32000
        })

        // this.setState({ stream, constraints, recorder: mediaRecorder });
        this.setState({ stream, constraints });
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
      this.video.current.setSinkId(this.props.audioSink).then(() => {
        toast.success(`Audio output changed to ${this.props.audioSink}`);
      }).catch(handleError);
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
