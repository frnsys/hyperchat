import App from './App';
import React from 'react';
import Modal from 'react-modal';
import {render} from 'react-dom';
import hypercore from 'hypercore';
import hyperdiscovery from 'hyperdiscovery';
import ram from 'random-access-memory';

const feed = hypercore((fname) => {
  return ram();
});

feed.on('ready', () => {
  let id = feed.key.toString('hex');
  hyperdiscovery(feed, { live: true, port: 3300 })
  let main = document.getElementById('main');
  Modal.setAppElement(main);
  render(<App id={id} feed={feed} />, main);
});
