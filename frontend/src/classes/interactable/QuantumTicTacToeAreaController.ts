import _ from 'lodash';
import {
  GameArea,
  GameStatus,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
  TicTacToeGridPosition,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';

export type TicTacToeCell = 'X' | 'O' | undefined;
export type QuantumTicTacToeEvents = GameEventTypes & {
  boardChanged: (board: {
    A: TicTacToeCell[][];
    B: TicTacToeCell[][];
    C: TicTacToeCell[][];
  }) => void;
  turnChanged: (isOurTurn: boolean) => void;
};

/**
 * This class is responsible for managing the state of the Quantum Tic Tac Toe game, and for sending commands to the server
 */
export default class QuantumTicTacToeAreaController extends GameAreaController<
  QuantumTicTacToeGameState,
  QuantumTicTacToeEvents
> {
  protected _boards: { A: TicTacToeCell[][]; B: TicTacToeCell[][]; C: TicTacToeCell[][] } = {
    A: [
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ],
    B: [
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ],
    C: [
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ],
  };

  /**
   * Returns the current state of all three boards.
   *
   * Each board is a 3x3 array of TicTacToeCell, which is either 'X', 'O', or undefined.
   *
   * The 2-dimensional array is indexed by row and then column, so board[0][0] is the top-left cell,
   * and board[2][2] is the bottom-right cell
   */
  get boards(): { A: TicTacToeCell[][]; B: TicTacToeCell[][]; C: TicTacToeCell[][] } {
    return this._boards;
  }

  /**
   * Returns the player with the 'X' game piece, if there is one, or undefined otherwise
   */
  get x(): PlayerController | undefined {
    const x = this._model.game?.state.x;
    if (x) {
      return this.occupants.find(eachOccupant => eachOccupant.id === x);
    }
    return undefined;
  }

  /**
   * Returns the player with the 'O' game piece, if there is one, or undefined otherwise
   */
  get o(): PlayerController | undefined {
    const o = this._model.game?.state.o;
    if (o) {
      return this.occupants.find(eachOccupant => eachOccupant.id === o);
    }
    return undefined;
  }

  /**
   * Returns the current score for the X player
   */
  get xScore(): number {
    return this._model.game?.state.xScore || 0;
  }

  /**
   * Returns the current score for the O player
   */
  get oScore(): number {
    return this._model.game?.state.oScore || 0;
  }

  /**
   * Returns the number of moves that have been made in the game
   */
  get moveCount(): number {
    return this._model.game?.state.moves.length || 0;
  }

  /**
   * Returns the winner of the game, if there is one
   */
  get winner(): PlayerController | undefined {
    const winner = this._model.game?.state.winner;
    if (winner) {
      return this.occupants.find(eachOccupant => eachOccupant.id === winner);
    }
    return undefined;
  }

  /**
   * Returns the player whose turn it is, if the game is in progress
   * Returns undefined if the game is not in progress
   */
  get whoseTurn(): PlayerController | undefined {
    const x = this.x;
    const o = this.o;
    if (!x || !o || this.status !== 'IN_PROGRESS') {
      return undefined;
    }
    if (this.moveCount % 2 === 0) {
      return x;
    } else if (this.moveCount % 2 === 1) {
      return o;
    } else {
      throw new Error('Invalid move count');
    }
  }

  get isOurTurn(): boolean {
    return this.whoseTurn?.id === this._townController.ourPlayer.id;
  }

  /**
   * Returns true if the current player is a player in this game
   */
  get isPlayer(): boolean {
    return this._model.game?.players.includes(this._townController.ourPlayer.id) || false;
  }

  /**
   * Returns the game piece of the current player, if the current player is a player in this game
   *
   * Throws an error PLAYER_NOT_IN_GAME_ERROR if the current player is not a player in this game
   */
  get gamePiece(): 'X' | 'O' {
    if (this.x?.id === this._townController.ourPlayer.id) {
      return 'X';
    } else if (this.o?.id === this._townController.ourPlayer.id) {
      return 'O';
    }
    throw new Error(PLAYER_NOT_IN_GAME_ERROR);
  }

  /**
   * Returns the status of the game.
   * Defaults to 'WAITING_TO_START' if the game is not in progress
   */
  get status(): GameStatus {
    const status = this._model.game?.state.status;
    if (!status) {
      return 'WAITING_TO_START';
    }
    return status;
  }

  /**
   * Returns true if the game is in progress
   */
  public isActive(): boolean {
    return this.status === 'IN_PROGRESS';
  }

  /**
   * Updates the internal state of this QuantumTicTacToeAreaController to match the new model.
   *
   * Calls super._updateFrom, which updates the occupants of this game area and
   * other common properties (including this._model).
   *
   * If any board has changed, emits a 'boardChanged' event with the new boards. If no boards have changed,
   * does not emit the event.
   *
   * If the turn has changed, emits a 'turnChanged' event with true if it is our turn, and false otherwise.
   * If the turn has not changed, does not emit the event.
   */
  protected _updateFrom(newModel: GameArea<QuantumTicTacToeGameState>): void {
    const wasOurTurn = this.whoseTurn?.id === this._townController.ourPlayer.id;
    super._updateFrom(newModel);
    const newState = newModel.game;
    if (newState) {
      const newBoards: { A: TicTacToeCell[][]; B: TicTacToeCell[][]; C: TicTacToeCell[][] } = {
        A: [
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        B: [
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        C: [
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
      };

      const ourPlayerID = this._townController.ourPlayer.id;

      // First, apply all moves that we can see
      newState.state.moves.forEach(move => {
        const isOurMove =
          (move.gamePiece === 'X' && newState.state.x === ourPlayerID) ||
          (move.gamePiece === 'O' && newState.state.o === ourPlayerID);

        if (isOurMove) {
          newBoards[move.board][move.row][move.col] = move.gamePiece;
        }
      });

      // Then, handle publicly visible squares
      const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
      boards.forEach(board => {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            if (newState.state.publiclyVisible[board][row][col]) {
              // Find the first move to this position (the original move that becomes visible)
              const firstMove = newState.state.moves.find(
                m => m.board === board && m.row === row && m.col === col,
              );
              if (firstMove) {
                newBoards[board][row][col] = firstMove.gamePiece;
              }
            }
          }
        }
      });

      // Check if any board has changed and emit event if so
      if (!_.isEqual(newBoards, this._boards)) {
        this._boards = newBoards;
        this.emit('boardChanged', this._boards);
      }
    }

    // Check if turn has changed and emit event if so
    const isOurTurn = this.whoseTurn?.id === this._townController.ourPlayer.id;
    if (wasOurTurn !== isOurTurn) {
      this.emit('turnChanged', isOurTurn);
    }
  }

  /**
   * Sends a request to the server to make a move in the game
   *
   * If the game is not in progress, throws an error NO_GAME_IN_PROGRESS_ERROR
   *
   * @param board The board to make the move on ('A', 'B', or 'C')
   * @param row Row of the move
   * @param col Column of the move
   */
  public async makeMove(
    board: 'A' | 'B' | 'C',
    row: TicTacToeGridPosition,
    col: TicTacToeGridPosition,
  ) {
    const instanceID = this._instanceID;
    if (!instanceID || this._model.game?.state.status !== 'IN_PROGRESS') {
      throw new Error(NO_GAME_IN_PROGRESS_ERROR);
    }
    const move: QuantumTicTacToeMove = {
      gamePiece: this.gamePiece,
      board,
      row,
      col,
    };
    await this._townController.sendInteractableCommand(this.id, {
      type: 'GameMove',
      gameID: instanceID,
      move,
    });
  }
}
