import Video from './Video';
import AVIO from './AVIO';
import React, {Component} from 'react';
import Broadcaster from './Broadcaster';
import ram from 'random-access-memory';
import hypercore from 'hypercore';
import hyperdiscovery from 'hyperdiscovery';
import {clipboard} from 'electron';
import Notifications, {notify} from 'react-notify-toast';

const mimeType = 'video/webm;codecs=vp9,opus';

function shrinkId(id) {
  let front = id.substring(0, 6);
  let end = id.substring(id.length - 6);
  return `${front}...${end}`;
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stream: null,
      audioOnly: false,
      localMuted: true, // TESTING
      peers: {}
    }
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      let id = ev.target.value;
      // TODO synchronize room members with peers
      this.addPeer(id);
      ev.target.value = '';
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
      this.addPeerStream(id, stream);
    });
  }

  addPeerStream(id, stream) {
    let mediaSource = new MediaSource();

    mediaSource.addEventListener('sourceopen', function () {
      let sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      sourceBuffer.mode = 'sequence';
      stream.on('data', (data) => {
        if (!sourceBuffer.updating) {
          sourceBuffer.appendBuffer(data);
        }
      });
    });

    let peers = this.state.peers;
    peers[id] = mediaSource;
    this.setState({ peers });
  }

  copy() {
    clipboard.writeText(this.props.id);
    notify.show('Copied to clipboard');
  }

  onStreamChange(stream) {
    this.setState({ stream });
  }

  render() {
    return <div>
      <Notifications timeout={2000} />
      <div className='menu'>
        <input
          type='text'
          className='add-feed'
          name='add-feed'
          placeholder='Add peer'
          onKeyPress={this.onKeyPress.bind(this)}></input>
        <div>
          <AVIO onStreamChange={this.onStreamChange.bind(this)} audioOnly={this.state.audioOnly} />
          <button onClick={() => this.setState({localMuted: !this.state.localMuted})}>{this.state.localMuted ? 'Unmute': 'Mute'}</button>
          <button onClick={() => this.setState({audioOnly: !this.state.audioOnly})}>{this.state.audioOnly ? 'Enable Video': 'Disable Video'}</button>
          <div
            className='feed-id'
            onClick={this.copy.bind(this)}>{shrinkId(this.props.id)}</div>
        </div>
      </div>
      <div className='stage'>
        <Video stream={this.state.stream} muted={this.state.localMuted} draggable={false} />
      </div>
      <Broadcaster stream={this.state.stream} feed={this.props.feed} mimeType={mimeType} />
      <div className='peers'>
        {Object.keys(this.state.peers).map((id) => {
          return <Video key={id} stream={this.state.peers[id]} muted={true} draggable={true} />
        })}
      </div>
    </div>;
  }
}

export default App;
