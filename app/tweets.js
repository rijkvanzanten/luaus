module.exports = {
  startGame(gameName) {
    const messages = [
      `Game ${gameName} is about to begin! #luaus_live`,
      `${gameName} has begun, best of luck to everyone! #luaus_live`,
      `The tournament on ${gameName} has begun! #luaus_live`,
      `Who will be the winner of ${gameName}? Results follow soon! #luaus_live`,
      `Wanted to join ${gameName}? Too bad; they just started! #luaus_live`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  },
  endGame(winner, gameName) {
    const messages = [
      `${winner} is the grand winner of ${gameName}! #luaus_live`,
      `${winner} just beat everyone in the ${gameName} luau! #luaus_live`,
      `Victory to ${winner}, the winner of ${gameName}! #luaus_live`,
      `All hail ${winner}! #luaus_live`,
      `${winner}! ${winner}! ${winner}! #luaus_live`,
      `Ever thought ${winner} could be the winner of ${gameName}? Me neither! #luaus_live`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  },
  newGame(gameName) {
    const messages = [
      `Come and join ${gameName}! #luaus_live`,
      `${gameName} is the most fresh! #luaus_live`,
      `I bet you will not win in ${gameName}! #luaus_live`,
      `Do you have what it takes to win? Join ${gameName}! #luaus_live`,
      `Join ${gameName}! #luaus_live`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
