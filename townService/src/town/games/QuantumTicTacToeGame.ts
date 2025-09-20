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
      Object.values(this._games).forEach(game => game.join(player));
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };
      Object.values(this._games).forEach(game => game.join(player));
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
    Object.values(this._games).forEach(game => {
      try {
        game.leave(player);
      } catch (e) {
        // ignore if player not in subgame
      }
    });

    // Handles case where the game has not started yet
    if (this.state.o === undefined) {
      this.state = {
        ...this.state,
        x: undefined,
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
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
  }

  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    if (move.move.gamePiece === 'X' && move.playerID !== this.state.x) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    if (move.move.gamePiece === 'O' && move.playerID !== this.state.o) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Check if it's the player's turn - use _moveCount instead of moves.length
    // because moves.length doesn't include collision attempts
    if (move.move.gamePiece === 'X' && this._moveCount % 2 === 1) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    } else if (move.move.gamePiece === 'O' && this._moveCount % 2 === 0) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    const targetGame = this._games[move.move.board];
    if (targetGame.state.status === 'OVER' && targetGame.state.winner) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    }

    // Check if this player has already made a move to this exact position
    const existingMoveByPlayer = this.state.moves.find(
      m =>
        m.board === move.move.board &&
        m.col === move.move.col &&
        m.row === move.move.row &&
        m.gamePiece === move.move.gamePiece,
    );

    if (existingMoveByPlayer) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    this._validateMove(move);

    const { board, row, col, gamePiece } = move.move;

    // Always increment move count for turn tracking (even for collisions)
    this._moveCount++;

    // Check for collision - if there's already ANY move here
    const existingMove = this.state.moves.find(
      m => m.board === board && m.col === col && m.row === row,
    );

    if (existingMove) {
      // Collision! Make square publicly visible, but don't record the move
      this.state = {
        ...this.state,
        publiclyVisible: {
          ...this.state.publiclyVisible,
          [board]: this.state.publiclyVisible[board].map((boardRow, r) =>
            boardRow.map((cell, c) => (r === row && c === col ? true : cell)),
          ),
        },
      };
      // Still need to check for wins and game end after collision
      this._checkForWins();
      this._checkForGameEnding();
      return; // Turn is used up but no move recorded
    }

    // No collision - record the move and apply to sub-game
    this.state = {
      ...this.state,
      moves: [...this.state.moves, move.move],
    };

    // Apply to sub-game only if no collision occurred
    const targetGame = this._games[board];
    if (targetGame.state.status === 'IN_PROGRESS') {
      const subGameMove = {
        gameID: targetGame.id,
        playerID: move.playerID,
        move: {
          gamePiece,
          row: row as 0 | 1 | 2,
          col: col as 0 | 1 | 2,
        },
      };
      targetGame.applyMove(subGameMove);
    }

    this._checkForWins();
    this._checkForGameEnding();
  }

  private _checkForWins(): void {
    const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    let xWins = 0;
    let oWins = 0;

    for (const board of boards) {
      const game = this._games[board];
      if (game.state.status === 'OVER' && game.state.winner) {
        if (game.state.winner === this.state.x) {
          xWins++;
        } else if (game.state.winner === this.state.o) {
          oWins++;
        }
      }
    }

    // Update scores
    this._xScore = xWins;
    this._oScore = oWins;
    this.state = {
      ...this.state,
      xScore: xWins,
      oScore: oWins,
    };
  }

  private _countBoardWins(player: 'X' | 'O'): number {
    const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    let count = 0;
    const playerID = player === 'X' ? this.state.x : this.state.o;

    for (const board of boards) {
      const game = this._games[board];
      if (game.state.status === 'OVER' && game.state.winner === playerID) {
        count++;
      }
    }
    return count;
  }

  private _checkForGameEnding(): void {
    const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    let hasAvailableMove = false;

    for (const board of boards) {
      const game = this._games[board];

      // If the board isn't won, check if it has available moves
      if (!(game.state.status === 'OVER' && game.state.winner)) {
        const boardMoves = this.state.moves.filter(m => m.board === board);
        if (boardMoves.length < 9) {
          hasAvailableMove = true;
          break;
        }
      }
    }

    if (!hasAvailableMove) {
      this.state.status = 'OVER';

      if (this._xScore > this._oScore) {
        this.state.winner = this.state.x;
      } else if (this._oScore > this._xScore) {
        this.state.winner = this.state.o;
      } else {
        this.state.winner = undefined;
      }
    }
  }
}
