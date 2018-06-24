import {toast} from 'react-toastify';

function handleError(err) {
  toast.error(err.message);
}

// simple check, not particularly robust though
function isDeviceId(id) {
  return typeof id === 'string';
}

export {handleError, isDeviceId};
