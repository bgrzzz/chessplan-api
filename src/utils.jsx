export function calculateRivalries(games) {
  const rivalries = {};

  games.forEach(game => {
    const opp = game.opponent;
    if (!opp || opp === "Anônimo") return;

    if (!rivalries[opp]) {
      rivalries[opp] = {
        name: opp,
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastGames: [],
        platform: game.platform
      };
    }

    rivalries[opp].total += 1;
    if (game.result === "win") rivalries[opp].wins += 1;
    else if (game.result === "loss") rivalries[opp].losses += 1;
    else rivalries[opp].draws += 1;

    // Guarda os últimos 3 PGNs para a IA analisar depois
    if (rivalries[opp].lastGames.length < 3) {
      rivalries[opp].lastGames.push(game.pgn);
    }
  });

  // Filtra apenas quem você enfrentou 2 ou mais vezes
  return Object.values(rivalries)
    .filter(r => r.total >= 2)
    .sort((a, b) => b.total - a.total);
}