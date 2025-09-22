import { assert } from 'console';
import InvalidParametersError, {
  GAME_NOT_IN_PROGRESS_MESSAGE,
  GAME_ID_MISSMATCH_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import GameArea from './GameArea';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';

/**
 * A QuantumTicTacToeGameArea is a GameArea that hosts a QuantumTicTacToeGame.
 * It manages player interactions, game state updates, and maintains a history of completed games.
 *
 * @see QuantumTicTacToeGame
 * @see GameArea
 */
export default class QuantumTicTacToeGameArea extends GameArea<QuantumTicTacToeGame> {
  /**
   * Returns the type of this interactable area
   *
   * @returns The string identifier for this area type
   */
  protected getType(): InteractableType {
    return 'QuantumTicTacToeArea';
  }

  /**
   * Updates the game area state when the underlying game state changes.
   * Records completed games in the history and notifies listeners of state changes.
   *
   * @param updatedState The new game instance state
   */
  private _stateUpdated(updatedState: GameInstance<QuantumTicTacToeGameState>): void {
    if (updatedState.state.status === 'OVER') {
      // Record the game outcome if it hasn't been recorded yet
      const gameID = this._game?.id;
      if (gameID && !this._history.find(eachResult => eachResult.gameID === gameID)) {
        const { x, o, xScore, oScore } = updatedState.state;
        if (x && o) {
          const xName = this._occupants.find(eachPlayer => eachPlayer.id === x)?.userName || x;
          const oName = this._occupants.find(eachPlayer => eachPlayer.id === o)?.userName || o;
          this._history.push({
            gameID,
            scores: {
              [xName]: xScore,
              [oName]: oScore,
            },
          });
        }
      }
    }
    this._emitAreaChanged();
  }

  /**
   * Handles a command from a player in this game area.
   *
   * Supported commands:
   * - JoinGame: Joins the current game or creates a new one if none is in progress
   * - GameMove: Applies a move to the current game
   * - LeaveGame: Removes the player from the current game
   *
   * If the command is successful, calls this._emitAreaChanged to notify listeners.
   * If the command fails, the error is propagated to the caller.
   *
   * @param command The command to execute
   * @param player The player executing the command
   * @returns The result of the command execution
   * @throws InvalidParametersError if the command is invalid or cannot be executed
   */
  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
    player: Player,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'GameMove') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }

      const quantumMove = command.move as QuantumTicTacToeMove;
      assert(quantumMove.gamePiece === 'X' || quantumMove.gamePiece === 'O', 'Invalid game piece');
      assert(
        quantumMove.board === 'A' || quantumMove.board === 'B' || quantumMove.board === 'C',
        'Invalid board',
      );

      game.applyMove({
        gameID: command.gameID,
        playerID: player.id,
        move: quantumMove,
      });
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    if (command.type === 'JoinGame') {
      let game = this._game;

      // Create a new game if none exists or the current game is over
      if (!game || game.state.status === 'OVER') {
        game = new QuantumTicTacToeGame();
        this._game = game;
      }

      game.join(player);
      this._stateUpdated(game.toModel());
      return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
    }

    if (command.type === 'LeaveGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this.game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }

      game.leave(player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
