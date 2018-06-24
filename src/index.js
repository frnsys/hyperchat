import {render} from 'react-dom';
import Modal from 'react-modal';
import Video from './Video';
import AVIO from './AVIO';
import React, {Component} from 'react';
import Broadcaster from './Broadcaster';
import {ToastContainer, toast} from 'react-toastify';
import ram from 'random-access-memory';
import hypercore from 'hypercore';
import hyperdiscovery from 'hyperdiscovery';
import {clipboard} from 'electron';

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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stream: null,
      audioOnly: false,
      localMuted: true, // TESTING
      settingsOpen: false
    }
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      let id = ev.target.value;
    }
  }

  addPeer(id) {
    let feed = hypercore((fname) => {
      return ram();
    }, id, {sparse: true});
    feed.on('ready', () => {
      let stream = feed.createReadStream({
        tail: true,
        live: true
      });

      hyperdiscovery(feed, { live: true, port: 3301 })
      makeVideoThumb(stream);
    });
  }

  copy(val) {
    clipboard.writeText(this.props.id);
  }

  onStreamChange(stream) {
    this.setState({ stream });
  }

  render() {
    return <div>
      <ToastContainer />
      <div className='feed-id' onClick={this.copy.bind(this)}>{this.props.id}</div>
      <input className='add-feed' name='add-feed' type='text' onKeyPress={this.onKeyPress.bind(this)}></input>
      <AVIO onStreamChange={this.onStreamChange.bind(this)} audioOnly={this.state.audioOnly} />
      <button onClick={() => this.setState({localMuted: !this.state.localMuted})}>{this.state.localMuted ? 'Unmute': 'Mute'}</button>
      <button onClick={() => this.setState({audioOnly: !this.state.audioOnly})}>{this.state.audioOnly ? 'Enable Video': 'Disable Video'}</button>
      <Video stream={this.state.stream} muted={this.state.localMuted} />
      <Broadcaster stream={this.state.stream} feed={feed} />
    </div>;
  }
}
