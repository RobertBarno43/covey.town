import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { act } from 'react-dom/test-utils';
import QuantumTicTacToeAreaController, {
  TicTacToeCell,
} from '../../../../classes/interactable/QuantumTicTacToeAreaController';
import TownController from '../../../../classes/TownController';
import { GameArea, QuantumTicTacToeGameState } from '../../../../types/CoveyTownSocket';
import * as TicTacToeBoard from '../TicTacToe/TicTacToeBoard';
import QuantumTicTacToeBoard from './QuantumTicTacToeBoard';

const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  const mockUseToast = () => mockToast;
  return {
    ...ui,
    useToast: mockUseToast,
  };
});

const ticTacToeBoardSpy = jest.spyOn(TicTacToeBoard, 'default');

class MockQuantumTicTacToeAreaController extends QuantumTicTacToeAreaController {
  makeMove = jest.fn<Promise<void>, [board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2]>();

  mockBoards: { A: TicTacToeCell[][]; B: TicTacToeCell[][]; C: TicTacToeCell[][] } = {
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

  mockIsPlayer = false;

  mockIsOurTurn = false;

  constructor() {
    const mockTownController = mock<TownController>();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockTownController.ourPlayer.id = 'our_player_id';
    super(
      nanoid(),
      mock<GameArea<QuantumTicTacToeGameState>>(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockTownController,
    );
  }

  get boards() {
    return this.mockBoards;
  }

  get isOurTurn() {
    return this.mockIsOurTurn;
  }

  get isPlayer() {
    return this.mockIsPlayer;
  }

  public mockReset() {
    this.mockBoards = {
      A: [
        ['X', 'O', undefined],
        [undefined, 'X', undefined],
        [undefined, undefined, 'O'],
      ],
      B: [
        [undefined, 'X', undefined],
        ['O', undefined, 'X'],
        [undefined, 'O', undefined],
      ],
      C: [
        ['O', undefined, 'X'],
        [undefined, 'O', undefined],
        ['X', undefined, undefined],
      ],
    };
    this.makeMove.mockReset();
    mockToast.mockClear();
    ticTacToeBoardSpy.mockClear();
  }
}

describe('QuantumTicTacToeBoard', () => {
  let gameAreaController: MockQuantumTicTacToeAreaController;

  beforeEach(() => {
    gameAreaController = new MockQuantumTicTacToeAreaController();
    gameAreaController.mockReset();
  });

  function renderBoard() {
    return render(
      <ChakraProvider>
        <QuantumTicTacToeBoard gameAreaController={gameAreaController} />
      </ChakraProvider>,
    );
  }

  it('renders three TicTacToeBoard components', () => {
    renderBoard();
    expect(ticTacToeBoardSpy).toHaveBeenCalledTimes(3);
  });

  it('renders the board titles', () => {
    renderBoard();
    expect(screen.getByText('Board A')).toBeInTheDocument();
    expect(screen.getByText('Board B')).toBeInTheDocument();
    expect(screen.getByText('Board C')).toBeInTheDocument();
  });

  it('passes the correct board state to each TicTacToeBoard', () => {
    renderBoard();
    const boardAController = ticTacToeBoardSpy.mock.calls[0][0].gameAreaController;
    const boardBController = ticTacToeBoardSpy.mock.calls[1][0].gameAreaController;
    const boardCController = ticTacToeBoardSpy.mock.calls[2][0].gameAreaController;

    expect(boardAController.board).toEqual(gameAreaController.mockBoards.A);
    expect(boardBController.board).toEqual(gameAreaController.mockBoards.B);
    expect(boardCController.board).toEqual(gameAreaController.mockBoards.C);
  });

  it('forwards makeMove calls to the main controller', async () => {
    gameAreaController.mockIsPlayer = true;
    gameAreaController.mockIsOurTurn = true;
    renderBoard();

    const boardAController = ticTacToeBoardSpy.mock.calls[0][0].gameAreaController;
    await boardAController.makeMove(1, 1);
    expect(gameAreaController.makeMove).toHaveBeenCalledWith('A', 1, 1);

    const boardBController = ticTacToeBoardSpy.mock.calls[1][0].gameAreaController;
    await boardBController.makeMove(2, 0);
    expect(gameAreaController.makeMove).toHaveBeenCalledWith('B', 2, 0);

    const boardCController = ticTacToeBoardSpy.mock.calls[2][0].gameAreaController;
    await boardCController.makeMove(0, 2);
    expect(gameAreaController.makeMove).toHaveBeenCalledWith('C', 0, 2);
  });

  it('updates sub-boards when the main controller emits boardChanged', () => {
    renderBoard();
    const boardAController = ticTacToeBoardSpy.mock.calls[0][0].gameAreaController;
    const boardBController = ticTacToeBoardSpy.mock.calls[1][0].gameAreaController;
    const boardCController = ticTacToeBoardSpy.mock.calls[2][0].gameAreaController;

    const boardAChangedSpy = jest.fn();
    const boardBChangedSpy = jest.fn();
    const boardCChangedSpy = jest.fn();

    boardAController.addListener('boardChanged', boardAChangedSpy);
    boardBController.addListener('boardChanged', boardBChangedSpy);
    boardCController.addListener('boardChanged', boardCChangedSpy);

    act(() => {
      gameAreaController.emit('boardChanged', gameAreaController.boards);
    });

    expect(boardAChangedSpy).toHaveBeenCalledWith(gameAreaController.boards.A);
    expect(boardBChangedSpy).toHaveBeenCalledWith(gameAreaController.boards.B);
    expect(boardCChangedSpy).toHaveBeenCalledWith(gameAreaController.boards.C);
  });
});
