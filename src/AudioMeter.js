import React, {Component} from 'react';

const sampleSize = 128**2;
const sampleAvgInterval = 16;
const meterTickSize = 0.05;

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
    let nTicks = Math.round(this.state.rms/meterTickSize);
    return <div className='audiometer'>
      {this.props.muted ?
        <span className='audiometer-muted'>Muted</span> :
        [...Array(nTicks).keys()].map((k) => {
          return <span className='audiometer-tick' key={k}></span>
        })}
    </div>
  }
}

export default AudioMeter;
