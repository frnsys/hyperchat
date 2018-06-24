import {render} from 'react-dom';
import Modal from 'react-modal';
import React, {Component} from 'react';
import AudioMeter from './AudioMeter';
import {ToastContainer, toast} from 'react-toastify';
import recorder from 'media-recorder-stream';
import ram from 'random-access-memory';
import hypercore from 'hypercore';
import hyperdiscovery from 'hyperdiscovery';

const feed = hypercore((fname) => {
  return ram();
});

feed.on('ready', () => {
  let id = feed.key.toString('hex');
  hyperdiscovery(feed, { live: true, port: 3300 })
  createApp(id);
});


function createApp(id) {
  let main = document.getElementById('main');
  Modal.setAppElement(main);
  render(<App id={id} />, main);
}

function makeVideoThumb(stream) {
  let mimeType = 'video/webm;codecs=vp9,opus' // TODO
  let el_player = document.createElement('video');
  el_player.autoplay = true;
  document.querySelector('#container').appendChild(el_player);
  let mediaSource = new MediaSource()

  el_player.src = window.URL.createObjectURL(mediaSource)
  el_player.addEventListener('error', (e) => {
    console.error(e.target.error);
  });

  mediaSource.addEventListener('sourceopen', function () {
    let sourceBuffer = mediaSource.addSourceBuffer(mimeType)
    sourceBuffer.mode = 'sequence'
    stream.on('data', (data) => {
      if (!sourceBuffer.updating) {
        sourceBuffer.appendBuffer(data);
      }
    });
  })
}

const videoBitRate = 600000;
const audioBitRate = 32000;

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
      localMuted: true, // TESTING
      settingsOpen: false
    }
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      let id = ev.target.value;
      let feed = hypercore((fname) => {
        return ram();
      }, id, {sparse: true});
      feed.on('ready', () => {
        console.log(`loaded feed ${id}`);
        let stream = feed.createReadStream({
          tail: true,
          live: true
        });

        hyperdiscovery(feed, { live: true, port: 3301 })
        makeVideoThumb(stream);
      });
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
      <div className='feed-id'>{this.props.id}</div>
      <input className='add-feed' name='add-feed' type='text' onKeyPress={this.onKeyPress.bind(this)}></input>
      <button onClick={() => this.setState({settingsOpen: true})}>Settings</button>
      <button onClick={() => this.setState({localMuted: !this.state.localMuted})}>{this.state.localMuted ? 'Unmute': 'Mute'}</button>
      <button onClick={() => this.setState({audioOnly: !this.state.audioOnly})}>{this.state.audioOnly ? 'Enable Video': 'Disable Video'}</button>
      <Preview audioSrc={this.state.audioSrc} videoSrc={this.state.videoSrc} audioSink={this.state.audioSink} muted={this.state.localMuted} audioOnly={this.state.audioOnly} />
    </div>;
  }
}

class Broadcaster extends Component {
  constructor(props) {
    super(props);
    this.state = {
      writing: false,
      recorder: null
    };
  }

  setRecorder(prevProps) {
    let mimeType = this.props.audioOnly ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp9,opus';
    if (this.props.stream && this.props.stream !== prevProps.stream) {
      let mediaRecorder = recorder(this.props.stream, {
        mimeType,
        videoBitsPerSecond: videoBitRate,
        audioBitsPerSecond: audioBitRate
      })

      if (this.state.recorder) {
        this.state.recorder.destroy();
      }

      mediaRecorder.on('data', (data) => {
        if (!this.state.writing) {
          this.setState({ writing: true });
          feed.append(data, (err) => {
            if (err) console.log('error appending to feed', err);
            this.setState({ writing: false });
            console.log(`appended block ${feed.length}`);
          });
        }
      })
      this.setState({ recorder: mediaRecorder });
    }
  }

  componentDidMount() {
    this.setRecorder();
  }

  componentDidUpdate(prevProps) {
    this.setRecorder(prevProps);
  }


  render() {
    return <div></div>;
  }
}


class Preview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stream: null,
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
          this.state.stream.getTracks().forEach((track) => track.stop());
        }
        this.video.current.srcObject = stream;
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
      <Broadcaster stream={this.state.stream} audioOnly={this.props.audioOnly} />
      <AudioMeter muted={this.props.muted} stream={this.state.stream} />
    </div>;
  }
}
