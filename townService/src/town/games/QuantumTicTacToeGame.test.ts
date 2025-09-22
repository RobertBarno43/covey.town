import { createPlayerForTesting } from '../../TestUtils';
import {
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';

/**
 * Test suite for QuantumTicTacToeGame class
 * Tests all aspects of quantum tic-tac-toe functionality including joining, leaving,
 * move validation, collision detection, and multi-board scoring
 */
describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });

    it('should add the second player as O and start the game', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
      expect(game.state.moves).toHaveLength(0);
    });

    it('should reject a third player once both seats are filled', () => {
      game.join(player1);
      game.join(player2);
      const player3 = createPlayerForTesting();
      expect(() => game.join(player3)).toThrowError();
    });
  });

  describe('_leave', () => {
    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });

      it('should set the game to OVER and declare the other player the winner', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
      });

      it('should set the game to OVER and declare the other player the winner (O leaves)', () => {
        game.leave(player2);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });

      it('should not allow the forfeiting player to rejoin after leaving (game OVER)', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(() => game.join(player1)).toThrowError();
      });
    });
  });

  describe('applyMove', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    /**
     * Helper function to make a move on the quantum tic-tac-toe game
     *
     * @param player The player making the move
     * @param board The board to place the piece on ('A', 'B', or 'C')
     * @param row The row to place the piece (0-2)
     * @param col The column to place the piece (0-2)
     */
    const makeMove = (
      player: Player,
      board: 'A' | 'B' | 'C',
      row: 0 | 1 | 2,
      col: 0 | 1 | 2,
    ): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
    });
    describe('Additional comprehensive tests', () => {
  describe('publiclyVisible state management', () => {
    it('should properly track publiclyVisible squares after collisions', () => {
      makeMove(player1, 'A', 1, 1); // X places
      expect(game.state.publiclyVisible.A[1][1]).toBe(false);
      
      makeMove(player2, 'A', 1, 1); // O collides
      expect(game.state.publiclyVisible.A[1][1]).toBe(true);
      expect(game.state.publiclyVisible.A[0][0]).toBe(false); // Other squares remain hidden
      expect(game.state.publiclyVisible.B[1][1]).toBe(false); // Other boards unaffected
    });

    it('should throw an error if a player tries to play on their own already occupied square', () => {
      makeMove(player1, 'A', 0, 0); // X occupies
      expect(game.state.moves).toHaveLength(1);
      makeMove(player2, 'B', 0, 0); // O moves elsewhere

      // Second attempt by same player on same square should fail
      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError();

      // Ensure no additional move was recorded
      expect(game.state.moves).toHaveLength(2);
    });

    it('should allow X (first player) to make the first move', () => {
      // This should not throw an error
      expect(() => makeMove(player1, 'A', 0, 0)).not.toThrowError();
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A._board[0][0]).toBe('X');
    });

    it('should not allow O (second player) to make the first move', () => {
      expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should track turns correctly across multiple boards', () => {
      // Player1 (X) moves on board A
      makeMove(player1, 'A', 0, 0);
      // Now should be Player2's turn
      expect(() => makeMove(player1, 'B', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      // Player2 (O) moves on board B
      makeMove(player2, 'B', 0, 0);
      // Now should be Player1's turn again
      expect(() => makeMove(player2, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      // Player1 (X) moves on board C
      makeMove(player1, 'C', 0, 0);

      // Verify board states
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A._board[0][0]).toBe('X');
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B._board[0][0]).toBe('O');
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C._board[0][0]).toBe('X');
    });

    it('should maintain correct turn order during an entire game sequence', () => {
      // Full game sequence alternating turns
      makeMove(player1, 'A', 0, 0); // X
      makeMove(player2, 'B', 0, 0); // O
      makeMove(player1, 'A', 0, 1); // X
      makeMove(player2, 'B', 0, 1); // O
      makeMove(player1, 'A', 0, 2); // X wins board A

      // Verify turn order is preserved after a board win
      expect(game.state.xScore).toBe(1);
      expect(() => makeMove(player1, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      makeMove(player2, 'B', 0, 2); // O wins board B
      expect(game.state.oScore).toBe(1);

      // Verify correct turn after both players have won a board
      expect(() => makeMove(player2, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      makeMove(player1, 'C', 0, 0); // X
      makeMove(player2, 'C', 1, 1); // O

      // Test attempts to play out of turn mid-game
      expect(() => makeMove(player2, 'C', 2, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should validate that the correct player makes the winning move', () => {
      // X is about to win on board A
      makeMove(player1, 'A', 0, 0); // X
      makeMove(player2, 'B', 0, 0); // O
      makeMove(player1, 'A', 0, 1); // X
      makeMove(player2, 'B', 0, 1); // O

      // O shouldn't be able to make the winning move for X
      expect(() => makeMove(player2, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      // X completes their win
      makeMove(player1, 'A', 0, 2); // X wins board A
      expect(game.state.xScore).toBe(1);

      // Now should be O's turn
      expect(() => makeMove(player1, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should prevent a player from making consecutive moves on different boards', () => {
      makeMove(player1, 'A', 0, 0); // X on board A

      // X shouldn't be able to immediately play on another board
      expect(() => makeMove(player1, 'B', 1, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      expect(() => makeMove(player1, 'C', 2, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      // O should be able to play now
      makeMove(player2, 'B', 1, 1); // O on board B

      // O shouldn't be able to make another move
      expect(() => makeMove(player2, 'C', 2, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      expect(() => makeMove(player2, 'A', 1, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should maintain turn order even after attempting invalid moves', () => {
      // Player1's turn
      expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      makeMove(player1, 'A', 0, 0); // X makes valid move

      // Player2's turn
      expect(() => makeMove(player1, 'B', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      makeMove(player2, 'A', 0, 0); // O attempts move on X's position (collision)

      // @ts-expect-error - accessing private property for testing
      expect(game._games.A._board[0][0]).toBe('X');

      // Now it's Player1's turn again
      expect(() => makeMove(player2, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      makeMove(player1, 'C', 0, 0); // X makes valid move
    });

    it('should not allow moves on a board that has been won', () => {
      // First, make moves to win board A for player X (horizontal top row)
      makeMove(player1, 'A', 0, 0); // X
      makeMove(player2, 'B', 0, 0); // O
      makeMove(player1, 'A', 0, 1); // X
      makeMove(player2, 'B', 0, 1); // O
      makeMove(player1, 'A', 0, 2); // X wins board A

      // Verify board A is won by X
      expect(game.state.xScore).toBe(1);

      // Try to make a move on board A (which is already won)
      // Player 2's turn
      expect(() => makeMove(player2, 'A', 1, 0)).toThrowError(); // Should fail - board A is won

      // Player 2 should still be able to play on other boards
      makeMove(player2, 'B', 0, 2); // O plays on board B

      // Player 1's turn - try board A again
      expect(() => makeMove(player1, 'A', 1, 1)).toThrowError(); // Should fail - board A is won

      // Player 1 should still be able to play on other boards
      makeMove(player1, 'C', 0, 0); // X plays on board C
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });

      it('should award O a point when O gets three-in-a-row', () => {
        // O gets a horizontal top row on board B
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 1, 0); // X (filler)
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 2, 2); // X (filler)
        makeMove(player2, 'B', 0, 2); // O wins board B

        expect(game.state.oScore).toBe(1);
        expect(game.state.xScore).toBe(0);
      });

      it('should allow X to accumulate two separate board wins for two points', () => {
        // Win board A
        makeMove(player1, 'A', 0, 0);
        makeMove(player2, 'B', 0, 0);
        makeMove(player1, 'A', 0, 1);
        makeMove(player2, 'B', 1, 0);
        makeMove(player1, 'A', 0, 2); // XScore = 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);

        // Start filling C in a way X wins (vertical in column 0)
        makeMove(player2, 'B', 2, 0); // O
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'C', 1, 1); // O
        makeMove(player1, 'C', 1, 0); // X
        makeMove(player2, 'C', 2, 2); // O
        makeMove(player1, 'C', 2, 0); // X vertical win column 0 on C

        expect(game.state.status).toBe('OVER');
        expect(game.state.xScore).toBe(2);
        expect(game.state.oScore).toBe(1);
        expect(game.state.winner).toBe(player1.id);
      });

      it('should allow O to accumulate two separate board wins for two points', () => {
        // O wins board B (top row)
        makeMove(player1, 'A', 0, 0); // X filler (safe)
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 1, 2); // X filler (safe)
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 2, 1); // X filler (safe)
        makeMove(player2, 'B', 0, 2); // O completes top row on B -> oScore = 1

        expect(game.state.oScore).toBe(1);
        expect(game.state.xScore).toBe(0);

        // O wins board C (vertical column 0)
        makeMove(player1, 'A', 0, 1); // X filler (no line)
        makeMove(player2, 'C', 0, 0); // O
        makeMove(player1, 'A', 0, 2); // X win A
        makeMove(player2, 'C', 1, 0); // O
        makeMove(player1, 'C', 2, 2); // X filler
        makeMove(player2, 'C', 2, 0); // O completes column 0 on C -> oScore = 2

        expect(game.state.status).toBe('OVER');
        expect(game.state.oScore).toBe(2);
        expect(game.state.xScore).toBe(1);
        expect(game.state.winner).toBe(player2.id);
      });

      it('should end in a tie (1-1) after the last board is filled with no additional wins', () => {
        // X wins Board A (top row)
        makeMove(player1, 'A', 0, 0); // 1 X
        makeMove(player2, 'B', 0, 0); // 2 O
        makeMove(player1, 'A', 0, 1); // 3 X
        makeMove(player2, 'B', 0, 1); // 4 O
        makeMove(player1, 'A', 0, 2); // 5 X -> XScore = 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);

        // O wins Board B (complete the same top row)
        makeMove(player2, 'B', 0, 2); // 6 O -> OScore = 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);

        // Fill Board C completely as a draw (no 3-in-a-row for either)
        // Turn order after move 6 (O just moved) goes back to X
        makeMove(player1, 'C', 0, 0); // 7 X
        makeMove(player2, 'C', 1, 1); // 8 O
        makeMove(player1, 'C', 0, 2); // 9 X
        makeMove(player2, 'C', 2, 0); // 10 O
        makeMove(player1, 'C', 1, 0); // 11 X
        makeMove(player2, 'C', 0, 1); // 12 O
        makeMove(player1, 'C', 2, 2); // 13 X
        makeMove(player2, 'C', 1, 2); // 14 O
        makeMove(player1, 'C', 2, 1); // 15 X (Board C now full, no winner)

        // Scores remain tied
        expect(game.state.status).toBe('OVER');
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);
        expect(game.state.winner).toBeUndefined();
        expect(() => makeMove(player2, 'C', 0, 1)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
        expect(() => makeMove(player1, 'C', 1, 2)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      });
    });
  });
});
