import { Chess, Square, PieceSymbol } from 'chess.js';

export interface ChessPuzzle {
  id: string;
  fen: string;
  turn: 'w' | 'b';
  objective: string;
  solution: string[]; // SAN moves e.g. ['Qh7#'] or ['Qxf7#']
  difficulty: 'easy' | 'medium' | 'hard';
  theme: string;
}

// 25 Curated classic tactical puzzles (Mate in 1, Mate in 2, Forks & Pins)
export const TACTICAL_PUZZLES: ChessPuzzle[] = [
  // Easy: Mate-in-1
  {
    id: 'm1_01',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    turn: 'w',
    objective: 'White to move: Deliver Scholar Checkmate in 1!',
    solution: ['Qxf7#'],
    difficulty: 'easy',
    theme: "Scholar's Mate",
  },
  {
    id: 'm1_02',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    turn: 'w',
    objective: 'White to move: Back-Rank Checkmate in 1!',
    solution: ['Re8#'],
    difficulty: 'easy',
    theme: 'Back-Rank Mate',
  },
  {
    id: 'm1_03',
    fen: 'r1b1k2r/pppp1Npp/8/4p3/2Bn3q/6n1/PPPP3P/RNBQ2KR b kq - 1 9',
    turn: 'b',
    objective: 'Black to move: Deliver Checkmate with your Queen!',
    solution: ['Qf2#'],
    difficulty: 'easy',
    theme: 'Attacking King',
  },
  {
    id: 'm1_04',
    fen: '5rk1/5ppp/8/8/8/2B5/5PPP/1Q4K1 w - - 0 1',
    turn: 'w',
    objective: 'White to move: Battery Checkmate on h7!',
    solution: ['Qxh7#'],
    difficulty: 'easy',
    theme: 'Queen-Bishop Battery',
  },
  {
    id: 'm1_05',
    fen: 'rnbqkbnr/ppppp2p/5p2/6p1/4P3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    turn: 'w',
    objective: "White to move: Deliver Fool's Mate in 1!",
    solution: ['Qh5#'],
    difficulty: 'easy',
    theme: "Fool's Mate",
  },
  {
    id: 'm1_06',
    fen: '3r2k1/p4ppp/8/3Q4/8/8/PPP2PPP/4R1K1 w - - 0 1',
    turn: 'w',
    objective: 'White to move: Deflection Back-Rank Mate!',
    solution: ['Qxd8#'],
    difficulty: 'easy',
    theme: 'Deflection Back-Rank',
  },
  {
    id: 'm1_07',
    fen: 'r4rk1/1pp2ppp/p7/4q3/3n4/8/PPP2PPP/R1BQR1K1 b - - 0 1',
    turn: 'b',
    objective: 'Black to move: Smothered Knight Checkmate!',
    solution: ['Ne2#'],
    difficulty: 'easy',
    theme: 'Knight Infiltration',
  },
  {
    id: 'm1_08',
    fen: 'r1b2rk1/ppp2ppp/8/8/8/2B2Q2/PPP2PPP/R3R1K1 w - - 0 1',
    turn: 'w',
    objective: 'White to move: Queen Infiltration Mate on g7!',
    solution: ['Qg3', 'Qxg7#'],
    difficulty: 'easy',
    theme: 'Corner Assault',
  },
  // Medium: Mate-in-1 / Mate-in-2 & Royal Tactics
  {
    id: 'm2_01',
    fen: 'r1b3kr/ppp2ppp/8/8/8/B7/P4PPP/4R1K1 w - - 0 1',
    turn: 'w',
    objective: 'White to move: Solve the 1-move Back-Rank Lock!',
    solution: ['Re8#'],
    difficulty: 'medium',
    theme: 'Bishop Cover Back-Rank',
  },
  {
    id: 'm2_02',
    fen: 'r2qkb1r/pp2nppp/3p4/2pNN3/2BnP3/3P4/PPP2PPP/R1BbK2R w KQkq - 0 8',
    turn: 'w',
    objective: 'White to move: Smothered Mate on f6 with your Knight!',
    solution: ['Nf6#'],
    difficulty: 'medium',
    theme: 'Légal Trap',
  },
  {
    id: 'm2_03',
    fen: '6k1/pp3ppp/8/2b5/8/8/PPP2PPP/R1B1r1K1 w - - 0 1',
    turn: 'w',
    objective: 'Black has delivered back-rank mate: can White escape?',
    solution: ['Bf1'],
    difficulty: 'medium',
    theme: 'Interference Defense',
  },
  {
    id: 'm2_04',
    fen: 'r4rk1/ppp2ppp/2n5/3p4/3Pn3/2P2N2/PP1NBPPP/R2Q1RK1 b - - 0 10',
    turn: 'b',
    objective: 'Black to move: Win the pinned knight!',
    solution: ['Nxd2'],
    difficulty: 'medium',
    theme: 'Tactical Exchange',
  },
  {
    id: 'm2_05',
    fen: 'r1bqkb1r/pppp1ppp/8/4n3/4n3/2N5/PPPPBPPP/R1BQK1NR w KQkq - 0 5',
    turn: 'w',
    objective: 'White to move: Remove defender on e4!',
    solution: ['Nxe4'],
    difficulty: 'medium',
    theme: 'Free Piece Capture',
  },
  {
    id: 'm2_06',
    fen: 'r1b1k2r/pppp1ppp/2n5/4p3/2B1P2q/3P4/PPP2bPP/RNBQK1NR w KQkq - 0 6',
    turn: 'w',
    objective: 'White King must move to safety!',
    solution: ['Kd2'],
    difficulty: 'medium',
    theme: 'King Escape',
  },
  // Hard: Complex Combos
  {
    id: 'm3_01',
    fen: 'r1b2rk1/2p2ppp/p7/1p6/3P3q/1BP2QP1/PP3P1b/RNB1R2K b - - 0 16',
    turn: 'b',
    objective: 'Black to move: Discovered check with the Bishop!',
    solution: ['Bxg3+'],
    difficulty: 'hard',
    theme: 'Discovered Double Attack',
  },
  {
    id: 'm3_02',
    fen: 'r1b1kb1r/pppp1ppp/8/4N3/3qn3/8/PPPPBPPP/RNBQK2R w KQkq - 1 6',
    turn: 'w',
    objective: 'Black threatens Qxf2#! Defend with Knight or Bishop!',
    solution: ['Nd3'],
    difficulty: 'hard',
    theme: 'Critical Mate Defense',
  },
  {
    id: 'm3_03',
    fen: '6k1/5p1p/p5p1/1p6/8/PP3P2/3r2PP/4R1K1 b - - 0 25',
    turn: 'b',
    objective: 'Black Rook to centralize on d3!',
    solution: ['Rd3'],
    difficulty: 'hard',
    theme: 'Active Endgame Rook',
  },
];

export class ChessService {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  getFen(): string {
    return this.game.fen();
  }

  getTurn(): 'w' | 'b' {
    return this.game.turn();
  }

  isCheck(): boolean {
    return this.game.inCheck();
  }

  isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  isDraw(): boolean {
    return this.game.isDraw();
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  getLegalMoves(square: Square): Square[] {
    const moves = this.game.moves({ square, verbose: true });
    return moves.map((m) => m.to as Square);
  }

  makeMove(from: Square, to: Square, promotion: PieceSymbol = 'q') {
    try {
      const move = this.game.move({
        from,
        to,
        promotion,
      });
      return move;
    } catch {
      return null;
    }
  }

  reset(fen?: string) {
    if (fen) {
      this.game.load(fen);
    } else {
      this.game.reset();
    }
  }

  getBoard() {
    return this.game.board();
  }

  getCapturedPieces(): { w: PieceSymbol[]; b: PieceSymbol[] } {
    const startingPieces = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
    };

    const currentWCount: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBCount: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const board = this.game.board();
    for (const row of board) {
      for (const cell of row) {
        if (!cell || cell.type === 'k') continue;
        if (cell.color === 'w') {
          currentWCount[cell.type] = (currentWCount[cell.type] || 0) + 1;
        } else {
          currentBCount[cell.type] = (currentBCount[cell.type] || 0) + 1;
        }
      }
    }

    const capturedW: PieceSymbol[] = [];
    const capturedB: PieceSymbol[] = [];

    (Object.keys(startingPieces) as PieceSymbol[]).forEach((p) => {
      const diffW = startingPieces[p as keyof typeof startingPieces] - (currentWCount[p] || 0);
      for (let i = 0; i < diffW; i++) capturedW.push(p);

      const diffB = startingPieces[p as keyof typeof startingPieces] - (currentBCount[p] || 0);
      for (let i = 0; i < diffB; i++) capturedB.push(p);
    });

    return { w: capturedW, b: capturedB };
  }
}

export function getRandomPuzzle(difficulty?: 'easy' | 'medium' | 'hard'): ChessPuzzle {
  const filtered = difficulty
    ? TACTICAL_PUZZLES.filter((p) => p.difficulty === difficulty)
    : TACTICAL_PUZZLES;
  const list = filtered.length > 0 ? filtered : TACTICAL_PUZZLES;
  return list[Math.floor(Math.random() * list.length)];
}
