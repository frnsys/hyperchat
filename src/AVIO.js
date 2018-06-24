import Modal from 'react-modal';
import React, {Component} from 'react';
import {isDeviceId, handleError} from './util';

const devices = {
  audio: {
    input: [],
    output: []
  },
  video: {
    input: []
  }
};

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


class AVIO extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      videoSrc: true,
      audioSrc: true,
      audioSink: true,
      stream: null,
      constraints: null
    };
    this.video = React.createRef();
  }

  setStream() {
    // only re-build stream when necessary
    let constraints = {
      video: this.state.videoSrc,
      audio: this.state.audioSrc
    };
    if (isDeviceId(this.state.audioSrc)) {
      constraints.audio = {deviceId: {exact: this.state.audioSrc}};
    }
    if (isDeviceId(this.state.videoSrc)) {
      constraints.video = {deviceId: {exact: this.state.videoSrc}};
    }
    if (this.props.audioOnly) {
      constraints.video = false;
    }
    if (!this.state.constraints ||
      objectChanged(this.state.constraints.audio, constraints.audio) ||
      objectChanged(this.state.constraints.video, constraints.video)) {
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        this.props.onStreamChange(stream);
        this.setState({ stream, constraints });
      }).catch(handleError);
    }
  }

  componentDidMount() {
    this.setStream();
  }

  componentDidUpdate() {
    this.setStream();
  }

  render() {
    return <div>
      <button onClick={() => this.setState({open: true})}>A/V</button>
      <Modal
        className='modal'
        isOpen={this.state.open}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => this.setState({open: false})}>
        <h1>I/O Settings</h1>
        <DeviceSelect name='Audio Input' devices={devices.audio.input} onChange={(id) => this.setState({audioSrc: id})}/>
        <DeviceSelect name='Audio Output' devices={devices.audio.output} onChange={(id) => this.setState({audioSink: id})} />
        <DeviceSelect name='Video Input' devices={devices.video.input} onChange={(id) => this.setState({videoSrc: id})} />
      </Modal>
    </div>
  }
}

export default AVIO;
