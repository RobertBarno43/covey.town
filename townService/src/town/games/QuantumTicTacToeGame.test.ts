import { createPlayerForTesting } from '../../TestUtils';
import {
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';

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
    });
  });

  describe('applyMove', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
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

    describe('scoring and game end', () => {
      it('should end the game and declare X the winner', () => {
        // X wins board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X wins board A -> 1 point

        // X wins board B
        makeMove(player2, 'C', 0, 0); // O
        makeMove(player1, 'B', 1, 0); // X
        makeMove(player2, 'C', 0, 1); // O
        makeMove(player1, 'B', 1, 1); // X
        makeMove(player2, 'C', 0, 2); // O
        makeMove(player1, 'B', 1, 2); // X wins board B -> 2 points, game ends

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.xScore).toBe(2);
      });
      it('should end the game and declare O the winner', () => {
        // O wins board A
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // O
        makeMove(player1, 'C', 0, 2); // X
        makeMove(player2, 'A', 0, 1); // O
        makeMove(player1, 'C', 1, 1); // X
        makeMove(player2, 'A', 0, 2); // O -> wins A

        // O wins board B
        makeMove(player1, 'C', 2, 1); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'C', 1, 0); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'B', 2, 2); // X
        makeMove(player2, 'B', 0, 2); // O -> wins B

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
        expect(game.state.oScore).toBe(2);
      });
      it('should end the game and declare tie when players have 1 point each and last board is tied', () => {
        // X wins board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 1, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'A', 1, 1); // O
        makeMove(player1, 'A', 0, 2); // X wins A -> 1 point

        // O wins board B
        makeMove(player2, 'B', 1, 0); // O
        makeMove(player1, 'B', 0, 0); // X
        makeMove(player2, 'B', 1, 1); // O
        makeMove(player1, 'B', 0, 1); // X
        makeMove(player2, 'B', 1, 2); // O wins B -> 1 point

        // ties board C
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'C', 0, 1); // O
        makeMove(player1, 'C', 1, 0); // X
        makeMove(player2, 'C', 1, 1); // O
        makeMove(player1, 'C', 2, 1); // X
        makeMove(player2, 'C', 2, 0); // O
        makeMove(player1, 'C', 2, 2); // X
        makeMove(player2, 'C', 1, 2); // O
        makeMove(player1, 'C', 0, 2); // X

        // After all boards are resolved, scores are equal -> tie
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBeUndefined();
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);
      });
      it('should end the game and declare tie when all tie', () => {
        // board A tie
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 1); // O
        makeMove(player1, 'A', 1, 0); // X
        makeMove(player2, 'A', 1, 1); // O
        makeMove(player1, 'A', 2, 1); // X
        makeMove(player2, 'A', 2, 0); // O
        makeMove(player1, 'A', 2, 2); // X
        makeMove(player2, 'A', 1, 2); // O
        makeMove(player1, 'A', 0, 2); // X

        // board B tie
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'B', 0, 1); // X
        makeMove(player2, 'B', 1, 0); // O
        makeMove(player1, 'B', 1, 1); // X
        makeMove(player2, 'B', 2, 1); // O
        makeMove(player1, 'B', 2, 0); // X
        makeMove(player2, 'B', 2, 2); // O
        makeMove(player1, 'B', 1, 2); // X
        makeMove(player2, 'B', 0, 2); // O

        // ties board C
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'C', 0, 1); // O
        makeMove(player1, 'C', 1, 0); // X
        makeMove(player2, 'C', 1, 1); // O
        makeMove(player1, 'C', 2, 1); // X
        makeMove(player2, 'C', 2, 0); // O
        makeMove(player1, 'C', 2, 2); // X
        makeMove(player2, 'C', 1, 2); // O
        makeMove(player1, 'C', 0, 2); // X

        // After all boards are resolved, scores are equal -> tie
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBeUndefined();
        expect(game.state.xScore).toBe(0);
        expect(game.state.oScore).toBe(0);
      });

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
    });
    describe('should test point distribution', () => {
      it('should award a points when seperate player gets three-in-a-row on diffrent boards ', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
        makeMove(player2, 'B', 0, 2); // O -> scores 1 point
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);
      });
    });
    describe('QuantumTicTacToeGame turn order', () => {
      it('should enforce alternating turns between X and O', () => {
        // First move should succeed for player1 (X)
        makeMove(player1, 'A', 0, 0); // X goes first

        // Player1 should NOT be allowed to play twice in a row
        expect(() => makeMove(player1, 'A', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

        // Player2 (O) should now be able to play
        makeMove(player2, 'B', 0, 0);

        // After player2 moves, player1 can move again
        makeMove(player1, 'A', 0, 1);

        // Again, player1 cannot take another turn immediately
        expect(() => makeMove(player1, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

        // Player2 can move again
        makeMove(player2, 'B', 0, 1);

        // Assert no scores yet (turn order shouldn’t affect scoring)
        expect(game.state.xScore).toBe(0);
        expect(game.state.oScore).toBe(0);
      });
    });
    describe('QuantumTicTacToeGame collisions', () => {
      it("should skip the player's turn if they try to play in a taken square", () => {
        makeMove(player1, 'B', 0, 0); // X claims B00
        expect(game.state.moves).toHaveLength(1);

        // O tries to play the same spot → collision
        makeMove(player2, 'B', 0, 0); // should NOT throw, just skip O's turn
        expect(game.state.moves).toHaveLength(1); // still only one recorded move

        // Next move should be X's turn (O lost their turn)
        expect(() => makeMove(player2, 'B', 1, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        makeMove(player1, 'B', 1, 0); // should succeed
      });
    });
    describe('QuantumTicTacToeGame same-square prevention', () => {
      it('should not allow moves on a board that has been won', () => {
        // X wins board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X wins board A

        // Board A should now be considered won
        expect((game as any)._isBoardWon('A')).toBe(true);

        // Any further move on board A should throw an error
        expect(() => makeMove(player2, 'A', 1, 0)).toThrowError('Board position is not empty');
        expect(() => makeMove(player1, 'A', 2, 2)).toThrowError('Board position is not empty');
      });

      it('should throw an error if a player tries to play on their own piece', () => {
        // X plays first
        makeMove(player1, 'A', 0, 0);

        // O plays somewhere else so turn comes back to X
        makeMove(player2, 'B', 0, 0);

        // Now it's X's turn again -> X tries to play on the same square -> should throw
        expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
      });
    });
    // Add these comprehensive collision and turn tests to your QuantumTicTacToeGame.test.ts

    describe('Collision mechanics detailed tests', () => {
      it('should make square publicly visible when collision occurs', () => {
        makeMove(player1, 'A', 1, 1); // X plays A(1,1)
        expect(game.state.publiclyVisible.A[1][1]).toBe(false); // Not public yet

        makeMove(player2, 'A', 1, 1); // O collides at A(1,1)
        expect(game.state.publiclyVisible.A[1][1]).toBe(true); // Now publicly visible
        expect(game.state.moves.length).toBe(1); // Only X's move recorded
      });

      it('should handle multiple collisions correctly', () => {
        // X plays A(0,0)
        makeMove(player1, 'A', 0, 0);
        expect(game.state.moves.length).toBe(1);

        // O collides at A(0,0) - O loses turn
        makeMove(player2, 'A', 0, 0);
        expect(game.state.moves.length).toBe(1); // Still only 1 move
        expect(game.state.publiclyVisible.A[0][0]).toBe(true);

        // Now it's X's turn again (O lost their turn)
        makeMove(player1, 'B', 0, 0);
        expect(game.state.moves.length).toBe(2);

        // O can play again
        makeMove(player2, 'B', 0, 1);
        expect(game.state.moves.length).toBe(3);

        // X collides with O at B(0,1) - X loses turn
        makeMove(player1, 'B', 0, 1);
        expect(game.state.moves.length).toBe(3); // Still only 3 moves
        expect(game.state.publiclyVisible.B[0][1]).toBe(true);

        // Now it's O's turn again (X lost their turn)
        makeMove(player2, 'C', 0, 0);
        expect(game.state.moves.length).toBe(4);
      });

      it('should not allow same player to play on their own piece', () => {
        makeMove(player1, 'A', 2, 2); // X plays A(2,2)
        makeMove(player2, 'B', 1, 1); // O plays B(1,1)

        // X tries to play on their own piece - should throw error
        expect(() => makeMove(player1, 'A', 2, 2)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);

        // O tries to play on their own piece - should throw error
        expect(() => makeMove(player2, 'B', 1, 1)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
      });

      it('should handle collision after game has progressed', () => {
        // Set up some game state first
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'C', 1, 1); // X
        makeMove(player2, 'C', 2, 2); // O

        expect(game.state.moves.length).toBe(6);

        // Now X tries to collide with O's piece at C(2,2)
        makeMove(player1, 'C', 2, 2);
        expect(game.state.moves.length).toBe(6); // No new move recorded
        expect(game.state.publiclyVisible.C[2][2]).toBe(true);

        // Now it should be O's turn (X lost their turn)
        makeMove(player2, 'A', 1, 0);
        expect(game.state.moves.length).toBe(7);
      });
    });

    describe('Turn order enforcement detailed tests', () => {
      it('should strictly alternate turns between X and O', () => {
        // X goes first
        makeMove(player1, 'A', 0, 0);

        // X cannot go twice
        expect(() => makeMove(player1, 'A', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

        // O can go
        makeMove(player2, 'B', 0, 0);

        // O cannot go twice
        expect(() => makeMove(player2, 'B', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

        // X can go again
        makeMove(player1, 'A', 0, 1);

        // Pattern continues...
        expect(() => makeMove(player1, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        makeMove(player2, 'B', 0, 1);
      });

      it('should maintain turn order even after collisions', () => {
        makeMove(player1, 'A', 1, 1); // X's turn
        makeMove(player2, 'A', 1, 1); // O collides, loses turn

        // Should be X's turn again since O lost their turn
        makeMove(player1, 'B', 0, 0);

        // Now O can play
        makeMove(player2, 'B', 0, 1);

        // X's turn
        makeMove(player1, 'C', 0, 0);

        // O collides with X's piece - O loses turn
        makeMove(player2, 'C', 0, 0);

        // Should be X's turn again
        expect(() => makeMove(player2, 'C', 0, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        makeMove(player1, 'A', 0, 0);
      });

      it('should validate turn even on won boards', () => {
        // X wins board A quickly
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X wins A

        // Now O should try to play on won board A - should fail with board won error
        expect(() => makeMove(player2, 'A', 1, 0)).toThrowError(BOARD_POSITION_NOT_EMPTY_MESSAGE);

        // But if X tries to play out of turn, should get turn error first
        expect(() => makeMove(player1, 'B', 1, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });

      it('should track move count correctly with collisions', () => {
        // Normal sequence: move counts 0, 1, 2, 3...
        makeMove(player1, 'A', 0, 0); // Move count: 1, X's move
        makeMove(player2, 'B', 0, 0); // Move count: 2, O's move
        makeMove(player1, 'A', 0, 1); // Move count: 3, X's move

        // O collides - move count should increment but no move recorded
        makeMove(player2, 'A', 0, 1); // Move count: 4, collision
        expect(game.state.moves.length).toBe(3); // Still only 3 recorded moves

        // Should be X's turn now (move count 4 % 2 === 0, so X's turn)
        makeMove(player1, 'C', 0, 0); // Move count: 5
        expect(game.state.moves.length).toBe(4);

        // O's turn (move count 5 % 2 === 1, so O's turn)
        makeMove(player2, 'C', 0, 1);
        expect(game.state.moves.length).toBe(5);
      });
    });

    describe('Collision and turn interaction edge cases', () => {
      it('should handle rapid collisions between same players', () => {
        makeMove(player1, 'A', 1, 1); // X plays
        makeMove(player2, 'A', 1, 1); // O collides, loses turn

        // X plays again (got turn back)
        makeMove(player1, 'B', 1, 1);
        makeMove(player2, 'B', 1, 1); // O collides again, loses turn again

        // X should get turn back again
        makeMove(player1, 'C', 1, 1);
        expect(game.state.moves.length).toBe(3); // Only successful moves
        expect(game.state.publiclyVisible.A[1][1]).toBe(true);
        expect(game.state.publiclyVisible.B[1][1]).toBe(true);
      });

      it('should handle collision on different boards', () => {
        makeMove(player1, 'A', 0, 0); // X on A
        makeMove(player2, 'B', 0, 0); // O on B
        makeMove(player1, 'C', 0, 0); // X on C
        makeMove(player2, 'A', 0, 0); // O collides on A

        expect(game.state.publiclyVisible.A[0][0]).toBe(true);
        expect(game.state.publiclyVisible.B[0][0]).toBe(false);
        expect(game.state.publiclyVisible.C[0][0]).toBe(false);

        // Should be X's turn (O lost turn from collision)
        makeMove(player1, 'B', 1, 1);
        expect(game.state.moves.length).toBe(4);
      });

      it('should maintain game integrity with mixed collisions and regular play', () => {
        // Complex sequence: moves, collisions, wins
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // Collision! O loses turn
        makeMove(player1, 'A', 0, 1); // X continues (got turn back)
        makeMove(player2, 'B', 0, 0); // O plays normally
        makeMove(player1, 'A', 0, 2); // X wins board A!

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
        expect(game.state.publiclyVisible.A[0][0]).toBe(true); // From collision

        // Game should continue normally
        makeMove(player2, 'B', 0, 1); // O continues
        makeMove(player1, 'B', 0, 1); // X collides, loses turn
        makeMove(player2, 'B', 0, 2); // O wins board B

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);
        expect(game.state.status).toBe('IN_PROGRESS'); // Game continues
      });
    });
  });
});
