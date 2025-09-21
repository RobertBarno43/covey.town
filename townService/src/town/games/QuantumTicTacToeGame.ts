/* eslint-disable no-nested-ternary */
import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  public constructor() {
    super({
      moves: [],
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        B: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        C: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
      },
    });
    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };
    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
  }

  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
  }

  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Reset game if only one player
    if (this.state.o === undefined) {
      this.state = {
        moves: [],
        status: 'WAITING_TO_START',
        xScore: 0,
        oScore: 0,
        publiclyVisible: {
          A: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          B: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          C: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
        },
      };
      this._games = {
        A: new TicTacToeGame(),
        B: new TicTacToeGame(),
        C: new TicTacToeGame(),
      };
      this._xScore = 0;
      this._oScore = 0;
      this._moveCount = 0;
      return;
    }

    // Game over, other player wins - fix the status setting
    (this.state as any).status = 'OVER';
    this.state = {
      ...this.state,
      winner: this.state.x === player.id ? this.state.o : this.state.x,
    };
  }

  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    // Determine game piece from player ID
    let gamePiece: 'X' | 'O';
    if (move.playerID === this.state.x) {
      gamePiece = 'X';
    } else if (move.playerID === this.state.o) {
      gamePiece = 'O';
    } else {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Check if board is already won FIRST
    if (this._isBoardWon(move.move.board)) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    }

    // Check if this player already has a piece at this position SECOND
    const existingMoveByPlayer = this.state.moves.find(
      m =>
        m.board === move.move.board &&
        m.col === move.move.col &&
        m.row === move.move.row &&
        m.gamePiece === gamePiece,
    );

    if (existingMoveByPlayer) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    }

    // Check turn using move count LAST (accounts for collision attempts)
    if (gamePiece === 'X' && this._moveCount % 2 === 1) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    } else if (gamePiece === 'O' && this._moveCount % 2 === 0) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }
  }

  private _isBoardWon(board: 'A' | 'B' | 'C'): boolean {
    return this._getBoardWinner(board) !== undefined;
  }

  private _getBoardWinner(board: 'A' | 'B' | 'C'): 'X' | 'O' | undefined {
    const boardMoves = this.state.moves.filter(m => m.board === board);
    const grid: Array<Array<'X' | 'O' | undefined>> = [
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ];

    // Fill grid
    boardMoves.forEach(move => {
      grid[move.row][move.col] = move.gamePiece;
    });

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (grid[i][0] && grid[i][0] === grid[i][1] && grid[i][1] === grid[i][2]) {
        return grid[i][0];
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (grid[0][i] && grid[0][i] === grid[1][i] && grid[1][i] === grid[2][i]) {
        return grid[0][i];
      }
    }

    // Check diagonals
    if (grid[0][0] && grid[0][0] === grid[1][1] && grid[1][1] === grid[2][2]) {
      return grid[0][0];
    }
    if (grid[0][2] && grid[0][2] === grid[1][1] && grid[1][1] === grid[2][0]) {
      return grid[0][2];
    }

    return undefined;
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    // Determine game piece from player ID
    let gamePiece: 'X' | 'O';
    if (move.playerID === this.state.x) {
      gamePiece = 'X';
    } else if (move.playerID === this.state.o) {
      gamePiece = 'O';
    } else {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Create complete move with game piece
    const completeMove: GameMove<QuantumTicTacToeMove> = {
      ...move,
      move: {
        ...move.move,
        gamePiece,
      },
    };

    const { board, row, col } = completeMove.move;

    // Check for collision first (before incrementing move count)

    const existingMove = this.state.moves.find(
      m => m.board === board && m.col === col && m.row === row,
    );

    if (existingMove) {
      if (existingMove.gamePiece === gamePiece) {
        throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
      }
      // Collision! Make square publicly visible but don't record move
      // Still increment move count so turn switches (player loses their turn)
      this._moveCount++;
      this.state = {
        ...this.state,
        publiclyVisible: {
          ...this.state.publiclyVisible,
          [board]: this.state.publiclyVisible[board].map((boardRow, r) =>
            boardRow.map((cell, c) => (r === row && c === col ? true : cell)),
          ),
        },
      };
      return;
    }
    this._validateMove(completeMove);
    this._moveCount++;
    this.state = {
      ...this.state,
      moves: [...this.state.moves, completeMove.move],
    };

    // Update the corresponding sub-game for testing purposes
    this._updateSubGameBoard(board);

    this._checkForWins();
    this._checkForGameEnding();
  }

  private _updateSubGameBoard(board: 'A' | 'B' | 'C'): void {
    const targetGame = this._games[board];
    const boardMoves = this.state.moves.filter(m => m.board === board);

    // Manually set the sub-game state to match our moves
    // This bypasses the sub-game's turn validation entirely
    (targetGame as any).state = {
      moves: boardMoves.map(m => ({
        gamePiece: m.gamePiece,
        row: m.row,
        col: m.col,
      })),
      status: this._isBoardWon(board) ? 'OVER' : 'IN_PROGRESS',
      x: this.state.x,
      o: this.state.o,
      winner:
        this._getBoardWinner(board) === 'X'
          ? this.state.x
          : this._getBoardWinner(board) === 'O'
          ? this.state.o
          : undefined,
    };
  }

  private _checkForWins(): void {
    let xWins = 0;
    let oWins = 0;

    const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    for (const board of boards) {
      const winner = this._getBoardWinner(board);
      if (winner === 'X') {
        xWins++;
      } else if (winner === 'O') {
        oWins++;
      }
    }

    this._xScore = xWins;
    this._oScore = oWins;
    this.state = {
      ...this.state,
      xScore: xWins,
      oScore: oWins,
    };
  }

  private _checkForGameEnding(): void {
    const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    let hasAvailableMove = false;

    if (this._xScore >= 2 || this._oScore >= 2) {
      (this.state as any).status = 'OVER';
      this.state = {
        ...this.state,
        winner: this._xScore > this._oScore ? this.state.x : this.state.o,
      };
      return;
    }

    for (const board of boards) {
      if (!this._isBoardWon(board)) {
        // Count actual moves to this board, not including collision attempts
        const boardMoves = this.state.moves.filter(m => m.board === board);
        if (boardMoves.length < 9) {
          hasAvailableMove = true;
          break;
        }
      }
    }

    if (!hasAvailableMove) {
      (this.state as any).status = 'OVER';
      this.state = {
        ...this.state,
        winner:
          this._xScore > this._oScore
            ? this.state.x
            : this._oScore > this._xScore
            ? this.state.o
            : undefined, // This handles ties
      };
    }
  }
}
