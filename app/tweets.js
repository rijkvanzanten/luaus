module.exports = {
  startGame(gameName) {
    const messages = [
      `Game ${gameName} is about to begin! #luaus`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  },
  endGame(winner, gameName) {
    const messages = [
      `${winner} is the grand winner of ${gameName}! #luaus`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  },
  newGame(gameName) {
    const messages = [
      `Come and join ${gameName}`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
