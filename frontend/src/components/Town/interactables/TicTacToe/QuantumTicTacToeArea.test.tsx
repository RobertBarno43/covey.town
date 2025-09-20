import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { mock, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { act } from 'react-dom/test-utils';
import QuantumTicTacToeAreaController from '../../../../classes/interactable/QuantumTicTacToeAreaController';
import PlayerController from '../../../../classes/PlayerController';
import TownController, * as TownControllerHooks from '../../../../classes/TownController';
import TownControllerContext from '../../../../contexts/TownControllerContext';
import { randomLocation } from '../../../../TestUtils';
import { GameArea, GameStatus, QuantumTicTacToeGameState } from '../../../../types/CoveyTownSocket';
import * as QuantumTicTacToeBoard from './QuantumTicTacToeBoard';
import QuantumTicTacToeArea from './QuantumTicTacToeArea';

const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  const mockUseToast = () => mockToast;
  return {
    ...ui,
    useToast: mockUseToast,
  };
});

const useInteractableAreaControllerSpy = jest.spyOn(
  TownControllerHooks,
  'useInteractableAreaController',
);

const boardComponentSpy = jest.spyOn(QuantumTicTacToeBoard, 'default');
boardComponentSpy.mockReturnValue(<div data-testid='board' />);

class MockQuantumTicTacToeAreaController extends QuantumTicTacToeAreaController {
  joinGame = jest.fn();

  mockIsPlayer = false;

  mockIsOurTurn = false;

  mockMoveCount = 0;

  mockWinner: PlayerController | undefined = undefined;

  mockWhoseTurn: PlayerController | undefined = undefined;

  mockStatus: GameStatus = 'WAITING_TO_START';

  mockX: PlayerController | undefined = undefined;

  mockO: PlayerController | undefined = undefined;

  mockXScore = 0;

  mockOScore = 0;

  mockIsActive = false;

  public constructor() {
    super(nanoid(), mock<GameArea<QuantumTicTacToeGameState>>(), mock<TownController>());
  }

  get isOurTurn() {
    return this.mockIsOurTurn;
  }

  get x(): PlayerController | undefined {
    return this.mockX;
  }

  get o(): PlayerController | undefined {
    return this.mockO;
  }

  get xScore(): number {
    return this.mockXScore;
  }

  get oScore(): number {
    return this.mockOScore;
  }

  get moveCount(): number {
    return this.mockMoveCount;
  }

  get winner(): PlayerController | undefined {
    return this.mockWinner;
  }

  get whoseTurn(): PlayerController | undefined {
    return this.mockWhoseTurn;
  }

  get status(): GameStatus {
    return this.mockStatus;
  }

  get isPlayer() {
    return this.mockIsPlayer;
  }

  public isActive(): boolean {
    return this.mockIsActive;
  }

  public mockReset() {
    this.mockIsPlayer = false;
    this.mockIsOurTurn = false;
    this.mockMoveCount = 0;
    this.mockWinner = undefined;
    this.mockWhoseTurn = undefined;
    this.mockStatus = 'WAITING_TO_START';
    this.mockX = undefined;
    this.mockO = undefined;
    this.mockXScore = 0;
    this.mockOScore = 0;
    this.mockIsActive = false;
    this.joinGame.mockReset();
    mockToast.mockClear();
  }
}

describe('QuantumTicTacToeArea', () => {
  let ourPlayer: PlayerController;
  const townController = mock<TownController>();
  Object.defineProperty(townController, 'ourPlayer', { get: () => ourPlayer });
  const gameAreaController = new MockQuantumTicTacToeAreaController();
  let joinGameResolve: () => void;
  let joinGameReject: (err: Error) => void;

  function renderArea() {
    return render(
      <ChakraProvider>
        <TownControllerContext.Provider value={townController}>
          <QuantumTicTacToeArea interactableID={nanoid()} />
        </TownControllerContext.Provider>
      </ChakraProvider>,
    );
  }

  beforeEach(() => {
    ourPlayer = new PlayerController('player x', 'player x', randomLocation());
    mockReset(townController);
    gameAreaController.mockReset();
    useInteractableAreaControllerSpy.mockReturnValue(gameAreaController);
    gameAreaController.joinGame.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          joinGameResolve = resolve;
          joinGameReject = reject;
        }),
    );
  });

  describe('Game update listeners', () => {
    it('Registers exactly two listeners when mounted: one for gameUpdated and one for gameEnd', () => {
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();

      renderArea();
      expect(addListenerSpy).toBeCalledTimes(2);
      expect(addListenerSpy).toHaveBeenCalledWith('gameUpdated', expect.any(Function));
      expect(addListenerSpy).toHaveBeenCalledWith('gameEnd', expect.any(Function));
    });

    it('Removes the listeners when the component is unmounted', () => {
      const removeListenerSpy = jest.spyOn(gameAreaController, 'removeListener');
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();
      removeListenerSpy.mockClear();

      const renderData = renderArea();
      expect(addListenerSpy).toBeCalledTimes(2);
      const addedListeners = addListenerSpy.mock.calls;
      renderData.unmount();
      expect(removeListenerSpy).toBeCalledTimes(2);
      const removedListeners = removeListenerSpy.mock.calls;
      expect(removedListeners).toEqual(expect.arrayContaining(addedListeners));
    });
  });

  describe('Player and score display', () => {
    it("Displays players' usernames and scores", () => {
      gameAreaController.mockX = new PlayerController(nanoid(), 'Player X', randomLocation());
      gameAreaController.mockO = new PlayerController(nanoid(), 'Player O', randomLocation());
      gameAreaController.mockXScore = 5;
      gameAreaController.mockOScore = 3;
      renderArea();

      const playerList = screen.getByLabelText('list of players in the game');
      expect(
        within(playerList).getByText(`X: ${gameAreaController.x?.userName} (Score: 5)`),
      ).toBeInTheDocument();
      expect(
        within(playerList).getByText(`O: ${gameAreaController.o?.userName} (Score: 3)`),
      ).toBeInTheDocument();
    });

    it('Displays "(No player yet!)" when players are not present', () => {
      renderArea();
      const playerList = screen.getByLabelText('list of players in the game');
      expect(within(playerList).getByText('X: (No player yet!) (Score: 0)')).toBeInTheDocument();
      expect(within(playerList).getByText('O: (No player yet!) (Score: 0)')).toBeInTheDocument();
    });

    it('Updates player and score display on gameUpdated event', () => {
      renderArea();
      const playerList = screen.getByLabelText('list of players in the game');
      expect(within(playerList).getByText('X: (No player yet!) (Score: 0)')).toBeInTheDocument();

      act(() => {
        gameAreaController.mockX = new PlayerController(nanoid(), 'New Player X', randomLocation());
        gameAreaController.mockXScore = 1;
        gameAreaController.emit('gameUpdated');
      });

      expect(
        within(playerList).getByText(`X: ${gameAreaController.x?.userName} (Score: 1)`),
      ).toBeInTheDocument();
    });
  });

  describe('Game status text', () => {
    it('Displays "Game not yet started" when status is WAITING_TO_START', () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderArea();
      expect(screen.getByText('Game not yet started', { exact: false })).toBeInTheDocument();
    });

    it("Displays whose turn it is when game is IN_PROGRESS and it's our turn", () => {
      gameAreaController.mockStatus = 'IN_PROGRESS';
      gameAreaController.mockMoveCount = 1;
      gameAreaController.mockWhoseTurn = ourPlayer;
      renderArea();
      expect(
        screen.getByText('Game in progress, 1 moves in, currently your turn', { exact: false }),
      ).toBeInTheDocument();
    });

    it("Displays whose turn it is when game is IN_PROGRESS and it's not our turn", () => {
      const otherPlayer = new PlayerController(nanoid(), 'Other Player', randomLocation());
      gameAreaController.mockStatus = 'IN_PROGRESS';
      gameAreaController.mockMoveCount = 2;
      gameAreaController.mockWhoseTurn = otherPlayer;
      renderArea();
      expect(
        screen.getByText(`Game in progress, 2 moves in, currently ${otherPlayer.userName}'s turn`, {
          exact: false,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('Join Game Button', () => {
    it('Is shown if the game is over', () => {
      gameAreaController.mockStatus = 'OVER';
      renderArea();
      expect(screen.getByText('Join New Game')).toBeInTheDocument();
    });

    it('Calls joinGame on the controller when clicked', async () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderArea();
      const button = screen.getByText('Join New Game');
      fireEvent.click(button);
      expect(gameAreaController.joinGame).toHaveBeenCalled();
    });

    it('Displays a toast with an error if joinGame throws an error', async () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      const errorMessage = 'Test Error';
      renderArea();
      const button = screen.getByText('Join New Game');
      fireEvent.click(button);
      act(() => {
        joinGameReject(new Error(errorMessage));
      });
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error joining game',
            description: `Error: ${errorMessage}`,
            status: 'error',
          }),
        );
      });
    });
  });

  describe('Game End Toasts', () => {
    it('Displays a "You won!" toast when our player wins', () => {
      gameAreaController.mockWinner = ourPlayer;
      renderArea();
      act(() => {
        gameAreaController.emit('gameEnd');
      });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'You won!', status: 'success' }),
      );
    });

    it('Displays a "You lost :(" toast when our player loses', () => {
      gameAreaController.mockWinner = new PlayerController(nanoid(), 'Winner', randomLocation());
      renderArea();
      act(() => {
        gameAreaController.emit('gameEnd');
      });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'You lost :(', status: 'error' }),
      );
    });

    it('Displays a tie game toast when there is no winner', () => {
      gameAreaController.mockWinner = undefined;
      renderArea();
      act(() => {
        gameAreaController.emit('gameEnd');
      });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Game ended in a tie', status: 'info' }),
      );
    });
  });
});
