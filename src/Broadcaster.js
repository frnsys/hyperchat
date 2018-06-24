import React, {Component} from 'react';
import recorder from 'media-recorder-stream';

const videoBitRate = 600000;
const audioBitRate = 32000;


class Broadcaster extends Component {
  constructor(props) {
    super(props);
    this.state = {
      writing: false,
      recorder: null
    };
  }

  setRecorder(prevStream) {
    if (this.props.stream && this.props.stream !== prevStream) {
      let mediaRecorder = recorder(this.props.stream, {
        mimeType: this.props.mimeType,
        videoBitsPerSecond: videoBitRate,
        audioBitsPerSecond: audioBitRate
      })

      // destroy existing recorder, if there is one
      if (this.state.recorder) {
        this.state.recorder.destroy();
      }

      // stream to feed
      mediaRecorder.on('data', (data) => {
        if (!this.state.writing) {
          this.setState({ writing: true });
          this.props.feed.append(data, (err) => {
            if (err) console.log('error appending to feed', err);
            this.setState({ writing: false });
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
    let prevStream = prevProps ? prevProps.stream : null;
    this.setRecorder(prevStream);
  }

  render() {
    return <div></div>;
  }
}

export default Broadcaster;
