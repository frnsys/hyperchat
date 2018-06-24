import AudioMeter from './AudioMeter';
import React, {Component} from 'react';
import {notify} from 'react-notify-toast';
import {isDeviceId, handleError} from './util';

let focusedVideo = null;
document.addEventListener('mousemove', (ev) => {
  if (focusedVideo) {
    focusedVideo.component.setState({
      top: ev.clientY - focusedVideo.offset.top,
      left: ev.clientX - focusedVideo.offset.left
    });
  }
});

class Video extends Component {
  constructor(props) {
    super(props);
    this.state ={
      top: 0,
      left: 0
    };
    this.video = React.createRef();
  }

  setStream(prevStream) {
    let streamChanged = prevStream !== this.props.stream;
    if (prevStream && streamChanged) {
      prevStream.getTracks().forEach((track) => track.stop());
    }
    if (!prevStream || streamChanged) {
      try {
        this.video.current.srcObject = this.props.stream;
      } catch(err) {
        this.video.current.src = window.URL.createObjectURL(this.props.stream);
      }
    }
    this.video.current.muted = this.props.muted;
  }

  componentDidMount() {
    this.setStream();
  }

  componentDidUpdate(prevProps) {
    let prevStream = prevProps ? prevProps.stream : null;
    this.setStream(prevStream);
    if (isDeviceId(this.props.audioSink)) {
      this.video.current.setSinkId(this.props.audioSink).then(() => {
        notify.show(`Audio output changed to ${this.props.audioSink}`);
      }).catch(handleError);
    }
  }

  onMouseDown(ev) {
    // for dragging video windows
    if (this.props.draggable) {
      // hacky
      focusedVideo = {
        component: this,
        offset: {
          top: ev.clientY - this.state.top,
          left: ev.clientX - this.state.left
        }
      }
    }
  }

  render() {
    return <div className='video'
      onMouseDown={this.onMouseDown.bind(this)}
      onMouseUp={() => focusedVideo = null}
      style={{top: `${this.state.top}px`, left: `${this.state.left}px`}}>
      <video ref={this.video} autoPlay={true} onError={(e) => console.log(e.target.error)}></video>
      <AudioMeter muted={this.props.muted} stream={this.props.stream} />
    </div>;
  }
}

export default Video;
