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
    <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
    <link rel="manifest" href="/icons/manifest.json">
    <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#efbcbb">
    <link rel="shortcut icon" href="/icons/favicon.ico">
    <meta name="msapplication-config" content="/icons/browserconfig.xml">
    <meta name="theme-color" content="#efbcbb">
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
