module.exports = function (body, data, refresh = false) {
  const refreshEl = refresh ?
    `<noscript>
      <meta http-equiv="refresh" content="1" />
    </noscript>` : '';
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Luaus!</title>
    <link rel="stylesheet" href="/style.css" />
    <script src="/socket.io/socket.io.js"></script>
    <script src="/app.js" defer></script>
    ${refreshEl}
    <div data-root>
      ${body}
    </div>
    <div id="connection-status">You've lost connection with the internet. Reconnecting...</div>
    <script>var initialData = '${JSON.stringify(data)}'</script>
  `;
}
