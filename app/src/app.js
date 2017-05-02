const socket = new WebSocket('ws://' + location.hostname + ':' + location.port);

socket.addEventListener('open', function () {
  console.log('socket opened');
});

if (document.querySelector('.index')) {
  console.log('Homepage');
} else if (document.querySelector('.controller')) {
  document.querySelector('form').addEventListener('submit', onButtonPress);

  /**
   * Send an update score request to the server
   */
  function onButtonPress(event) {
    socket.send(
      JSON.stringify({
        device: 'phone',
        action: 'UPDATE_SCORE',
        playerID: document.querySelector('input').value
      })
    );

    event.preventDefault();
  }
} else if (document.querySelector('.new-player')) {
  console.log('New Player');
}
