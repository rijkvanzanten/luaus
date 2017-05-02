module.exports = function (body) {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Minor WOT</title>
    <link rel="stylesheet" href="/style.css" />
    <script src="/app.js" defer></script>
    <div data-root>
      ${body}
    </div>
  `;
}
