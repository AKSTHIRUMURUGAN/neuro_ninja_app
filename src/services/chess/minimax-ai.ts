import { Chess, Move } from 'chess.js';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional bonuses: center control (d4, e4, d5, e5)
const CENTER_BONUS: Record<string, number> = {
  d4: 25,
  e4: 25,
  d5: 25,
  e5: 25,
  c4: 15,
  f4: 15,
  c5: 15,
  f5: 15,
  d3: 10,
  e3: 10,
  d6: 10,
  e6: 10,
};

function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    // If it's white's turn and checkmate, black wins -> return -infinity
    return game.turn() === 'w' ? -999999 : 999999;
  }
  if (game.isDraw()) {
    return 0;
  }

  let totalScore = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type] || 0;
      const squareKey = `${String.fromCharCode(97 + c)}${8 - r}`;
      const center = CENTER_BONUS[squareKey] || 0;

      if (piece.color === 'w') {
        totalScore += val + center;
      } else {
        totalScore -= val + center;
      }
    }
  }

  return totalScore;
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Pruning
    }
    return minEval;
  }
}

export function getBestAIMove(
  game: Chess,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy bot: occasional random move
  if (difficulty === 'easy' && Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
  const isWhite = game.turn() === 'w';

  let bestMove: Move | null = null;
  let bestValue = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const boardValue = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();

    if (isWhite) {
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }

  return bestMove || moves[0];
}
