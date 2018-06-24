import {notify} from 'react-notify-toast';

function handleError(err) {
  notify.show(err.message);
}

// simple check, not particularly robust though
function isDeviceId(id) {
  return typeof id === 'string';
}

export {handleError, isDeviceId};
