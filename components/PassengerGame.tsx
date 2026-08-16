'use client';

// PASSENGER: ROAD OF DEATH — 메인 게임 컴포넌트
// CHAPTER 1 (TITLE → ROAD → ACCIDENT → CAMPER → MOTEL)
// CHAPTER 2 (LOBBY → CORRIDOR → 201/204 → BASEMENT)
// CHAPTER 3 (BACK ROAD → FINAL ROAD → ending A/B/C)
//
// useReducer로 GameState 관리, 모든 액션에서 saveGame 호출.
// PassengerAudio 합성 ambient, 모달 기반 다이얼로그/퍼즐/케이스파일.

import React, { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react';
import {
  GameState, GameAction, LocationId, ItemId, PuzzleId, DialogueId, ClueEntry, Chapter,
} from '@/lib/passenger-game/types';
import {
  ITEMS, LOCATIONS, DIALOGUES, PUZZLES,
} from '@/lib/passenger-game/data';
import { PassengerAudio } from '@/lib/passenger-game/audio';
import { saveGame, loadGame, clearGame, hasSave } from '@/lib/passenger-game/save';

// ----- 초기 상태 -----
function makeInitialState(): GameState {
  return {
    chapter: 1,
    location: 'title',
    inventory: [],
    clues: [],
    solvedPuzzles: [],
    triggeredObjects: [],
    flags: {},
    passengerThreat: 0,
    currentTime: '23:47',
    gameStartedAt: Date.now(),
    gameOver: null,
    ending: null,
    soundEnabled: true,
  };
}

// ----- reducer -----
function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_NEW_GAME': {
      return {
        ...makeInitialState(),
        soundEnabled: state.soundEnabled,
        location: 'road',
        chapter: 1,
      };
    }
    case 'LOAD_GAME':
      return { ...action.state };
    case 'MOVE': {
      const nextLoc = LOCATIONS[action.to];
      const nextChapter = nextLoc ? nextLoc.chapter : state.chapter;
      return {
        ...state,
        location: action.to,
        chapter: nextChapter,
        currentTime: tickTime(state.currentTime),
        passengerThreat: Math.min(100, state.passengerThreat + 2),
      };
    }
    case 'TRIGGER_OBJECT': {
      if (state.triggeredObjects.includes(action.objectId)) return state;
      return {
        ...state,
        triggeredObjects: [...state.triggeredObjects, action.objectId],
        passengerThreat: Math.min(100, state.passengerThreat + 1),
        currentTime: tickTime(state.currentTime),
      };
    }
    case 'PICK_ITEM': {
      if (state.inventory.includes(action.item)) return state;
      return { ...state, inventory: [...state.inventory, action.item] };
    }
    case 'USE_ITEM':
      return { ...state, passengerThreat: Math.min(100, state.passengerThreat + 1) };
    case 'COMBINE':
      return state;
    case 'SOLVE_PUZZLE': {
      if (state.solvedPuzzles.includes(action.puzzleId)) return state;
      return { ...state, solvedPuzzles: [...state.solvedPuzzles, action.puzzleId] };
    }
    case 'ADD_CLUE': {
      if (state.clues.some(c => c.id === action.clue.id)) return state;
      return { ...state, clues: [...state.clues, action.clue] };
    }
    case 'SET_FLAG':
      return { ...state, flags: { ...state.flags, [action.key]: action.value } };
    case 'TICK_TIME':
      return { ...state, currentTime: tickTime(state.currentTime) };
    case 'PASSENGER_TICK':
      return { ...state, passengerThreat: Math.min(100, state.passengerThreat + 1) };
    case 'GAME_OVER':
      return { ...state, gameOver: action.reason };
    case 'SET_ENDING':
      return { ...state, ending: action.ending };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'RESET':
      return { ...makeInitialState(), soundEnabled: state.soundEnabled };
    default:
      return state;
  }
}

function tickTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  let total = h * 60 + m + 3;
  if (total >= 24 * 60) total -= 24 * 60;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ----- 모달 타입 -----
type ModalState =
  | { kind: 'none' }
  | { kind: 'dialogue'; id: DialogueId }
  | { kind: 'puzzle'; id: PuzzleId }
  | { kind: 'inspect'; objectId: string; text: string }
  | { kind: 'casefile' }
  | { kind: 'gameover' };

// ----- 메인 컴포넌트 -----
export function PassengerGame() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [puzzleInput, setPuzzleInput] = useState('');
  const [puzzleError, setPuzzleError] = useState('');
  const [threatFlash, setThreatFlash] = useState(false);
  const [chaseTriggered, setChaseTriggered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<PassengerAudio | null>(null);
  const dialogueStepRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    audioRef.current = new PassengerAudio();
    return () => { audioRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.setEnabled(state.soundEnabled);
    if (state.soundEnabled) {
      const loc = LOCATIONS[state.location];
      audioRef.current.start(loc.ambient);
    } else {
      audioRef.current.stop();
    }
  }, [state.soundEnabled, state.location]);

  const enterLocation = useCallback((to: LocationId, skipDialogue = false) => {
    const loc = LOCATIONS[to];
    if (!loc) return;
    dispatch({ type: 'MOVE', to });
    audioRef.current?.start(loc.ambient);
    audioRef.current?.beep('click');
    if (!skipDialogue && loc.openingDialogue && DIALOGUES[loc.openingDialogue]) {
      setTimeout(() => {
        dialogueStepRef.current = 0;
        setModal({ kind: 'dialogue', id: loc.openingDialogue! });
      }, 400);
    }
  }, []);

  // 저장
  useEffect(() => {
    if (!mounted) return;
    if (state.location === 'title') return;
    saveGame(state);
  }, [state, mounted]);

  // 위협도 100% → chase (CHAPTER 1에서만)
  useEffect(() => {
    if (!mounted) return;
    if (chaseTriggered) return;
    if (state.passengerThreat >= 100 && !state.gameOver && state.chapter === 1) {
      setChaseTriggered(true);
      audioRef.current?.start('tension');
      audioRef.current?.beep('pulse');
      setTimeout(() => {
        setModal({ kind: 'dialogue', id: 'chase_begin' });
        setTimeout(() => {
          dispatch({ type: 'GAME_OVER', reason: 'caught' });
          dispatch({ type: 'SET_ENDING', ending: 'A' });
          setModal({ kind: 'gameover' });
        }, 3000);
      }, 500);
    } else if (state.passengerThreat >= 50 && state.passengerThreat < 51) {
      audioRef.current?.beep('whisper');
      setThreatFlash(true);
      setTimeout(() => setThreatFlash(false), 1200);
    }
  }, [state.passengerThreat, state.gameOver, state.chapter, mounted, chaseTriggered]);

  // 새 게임/이어하기/리셋 시 chase 플래그 리셋
  useEffect(() => {
    if (state.location === 'title' || state.gameOver) {
      setChaseTriggered(false);
    }
  }, [state.location, state.gameOver]);

  // ----- 오브젝트 클릭 -----
  const onObjectClick = (objId: string) => {
    if (modal.kind !== 'none') return;
    const loc = LOCATIONS[state.location];
    if (!loc) return;
    const obj = loc.objects.find(o => o.id === objId);
    if (!obj) return;

    if (obj.oneShot && state.triggeredObjects.includes(obj.id)) return;

    if (obj.requiresItem && !state.inventory.includes(obj.requiresItem)) {
      audioRef.current?.beep('locked');
      setModal({ kind: 'inspect', objectId: obj.id, text: `${obj.inspectText}\n\n(필요한 아이템이 없다)` });
      return;
    }

    // 모텔 출입문 특수 처리: old_key 사용 + 로비로 이동
    if (obj.id === 'motel_door' && state.inventory.includes('old_key')) {
      dispatch({ type: 'TRIGGER_OBJECT', objectId: obj.id });
      dispatch({ type: 'SET_FLAG', key: 'enter_motel', value: true });
      audioRef.current?.beep('pickup');
      // 인벤토리에서 old_key 제거
      const clue: ClueEntry = {
        id: 'enter_motel', category: 'motel',
        text: '모텔 안으로 들어섰다.',
        foundAt: Date.now(),
      };
      dispatch({ type: 'ADD_CLUE', clue });
      enterLocation('motel_lobby');
      return;
    }

    // 201호 문 특수 처리: 열림 + 이동
    if (obj.id === 'corridor_201') {
      dispatch({ type: 'SET_FLAG', key: 'room_201_open', value: true });
      enterLocation('room_201');
      return;
    }

    // 백로드 차 특수: gasoline 사용 → 시동 가능
    if (obj.id === 'back_car' && state.inventory.includes('gasoline')) {
      dispatch({ type: 'TRIGGER_OBJECT', objectId: obj.id });
      audioRef.current?.beep('pickup');
      const clue: ClueEntry = {
        id: 'car_ready', category: 'escape',
        text: '차에 기름을 넣었다. 도주 준비 완료.',
        foundAt: Date.now(),
      };
      dispatch({ type: 'ADD_CLUE', clue });
      setModal({ kind: 'inspect', objectId: obj.id, text: '시동이 걸릴 준비가 됐다. 어느 쪽으로 갈까?' });
      return;
    }

    if (obj.triggersPuzzle) {
      audioRef.current?.beep('click');
      setModal({ kind: 'puzzle', id: obj.triggersPuzzle });
      return;
    }

    if (obj.givesItem) {
      dispatch({ type: 'TRIGGER_OBJECT', objectId: obj.id });
      dispatch({ type: 'PICK_ITEM', item: obj.givesItem });
      audioRef.current?.beep('pickup');
      const item = ITEMS[obj.givesItem];
      const clue: ClueEntry = {
        id: `item_${obj.givesItem}`,
        category: 'misc',
        text: `아이템 획득: ${item?.name || obj.givesItem}`,
        foundAt: Date.now(),
      };
      dispatch({ type: 'ADD_CLUE', clue });
      setModal({ kind: 'inspect', objectId: obj.id, text: `${obj.inspectText}\n\n→ ${item?.name || obj.givesItem} 획득` });
      return;
    }

    if (obj.revealsClue) {
      dispatch({ type: 'TRIGGER_OBJECT', objectId: obj.id });
      audioRef.current?.beep('whisper');
      const clue: ClueEntry = {
        id: obj.revealsClue,
        category: 'passenger',
        text: obj.inspectText,
        foundAt: Date.now(),
      };
      dispatch({ type: 'ADD_CLUE', clue });
      setModal({ kind: 'inspect', objectId: obj.id, text: obj.inspectText });
      return;
    }

    audioRef.current?.beep('click');
    if (obj.oneShot) dispatch({ type: 'TRIGGER_OBJECT', objectId: obj.id });
    setModal({ kind: 'inspect', objectId: obj.id, text: obj.inspectText });
  };

  // ----- 인벤토리 클릭 -----
  const onInventoryClick = (itemId: ItemId) => {
    audioRef.current?.beep('click');
    const item = ITEMS[itemId];
    if (!item) return;
    setModal({ kind: 'inspect', objectId: `item_${itemId}`, text: `${item.name}\n\n${item.description}` });
  };

  // ----- 퍼즐 정답 제출 -----
  const submitPuzzle = (optionLabel?: string) => {
    if (modal.kind !== 'puzzle') return;
    const p = PUZZLES[modal.id];
    if (!p) return;

    // choice 타입은 optionLabel로 분기
    if (p.type === 'choice' && p.id === 'final_choice') {
      audioRef.current?.beep('click');
      const isTruth = (optionLabel || '').includes('진실');
      if (isTruth) {
        dispatch({ type: 'SOLVE_PUZZLE', puzzleId: p.id, answer: 'truth' });
        const clue: ClueEntry = {
          id: 'choice_truth', category: 'truth',
          text: '진실을 선택했다. 매디의 눈을 정면으로 마주한다.',
          foundAt: Date.now(),
        };
        dispatch({ type: 'ADD_CLUE', clue });
        setModal({ kind: 'dialogue', id: 'ch3_truth_reveal' });
        setTimeout(() => {
          dispatch({ type: 'GAME_OVER', reason: 'truth' });
          dispatch({ type: 'SET_ENDING', ending: 'C' });
          setModal({ kind: 'gameover' });
        }, 100);
      } else {
        dispatch({ type: 'SOLVE_PUZZLE', puzzleId: p.id, answer: 'escape' });
        const clue: ClueEntry = {
          id: 'choice_escape', category: 'escape',
          text: '도망을 선택했다. 차에 탄다.',
          foundAt: Date.now(),
        };
        dispatch({ type: 'ADD_CLUE', clue });
        setModal({ kind: 'dialogue', id: 'ch3_escape_run' });
        setTimeout(() => {
          dispatch({ type: 'GAME_OVER', reason: 'escaped' });
          dispatch({ type: 'SET_ENDING', ending: 'B' });
          setModal({ kind: 'gameover' });
        }, 100);
      }
      return;
    }

    // item_use 타입: 인벤토리에 답 아이템이 있는지 확인
    if (p.type === 'item_use') {
      if (state.inventory.includes(p.answer as ItemId)) {
        dispatch({ type: 'SOLVE_PUZZLE', puzzleId: p.id, answer: p.answer });
        audioRef.current?.beep('pickup');
        const clue: ClueEntry = {
          id: `puzzle_${p.id}`,
          category: 'misc',
          text: `퍼즐 해결: ${p.prompt.split('\n')[0]}`,
          foundAt: Date.now(),
        };
        dispatch({ type: 'ADD_CLUE', clue });

        // room_204_lock 해결 시: 204호로 이동
        if (p.id === 'room_204_lock') {
          enterLocation('room_204');
          return;
        }
        // camper_battery 해결 시: 라디오 켜짐 → 잡음 단서 + 무전기 다이얼로그
        if (p.id === 'camper_battery') {
          setModal({ kind: 'dialogue', id: 'radio_on' });
          return;
        }
        setModal({ kind: 'none' });
      } else {
        audioRef.current?.beep('locked');
        setPuzzleError('인벤토리에 필요한 아이템이 없다.');
      }
      return;
    }

    // combination 타입: 텍스트 입력 비교
    const correct = puzzleInput.trim().toLowerCase() === p.answer.toLowerCase();
    if (correct) {
      dispatch({ type: 'SOLVE_PUZZLE', puzzleId: p.id, answer: p.answer });
      audioRef.current?.beep('pickup');
      if (p.reward) {
        dispatch({ type: 'PICK_ITEM', item: p.reward });
        const clue: ClueEntry = {
          id: `puzzle_reward_${p.id}`,
          category: 'misc',
          text: `퍼즐 해결로 ${ITEMS[p.reward]?.name || p.reward} 획득`,
          foundAt: Date.now(),
        };
        dispatch({ type: 'ADD_CLUE', clue });
      }
      const clue: ClueEntry = {
        id: `puzzle_${p.id}`,
        category: 'misc',
        text: `퍼즐 해결: ${p.prompt.split('\n')[0]}`,
        foundAt: Date.now(),
      };
      dispatch({ type: 'ADD_CLUE', clue });

      // basement_code 해결 시: 지하로
      if (p.id === 'basement_code') {
        dispatch({ type: 'SET_FLAG', key: 'basement_open', value: true });
        setModal({ kind: 'none' });
        setPuzzleInput('');
        enterLocation('basement');
        return;
      }
      // motel_safe 해결 시: 인벤토리에 old_key 추가됨, 그대로
      setModal({ kind: 'none' });
      setPuzzleInput('');
      setPuzzleError('');
    } else {
      audioRef.current?.beep('locked');
      setPuzzleError('…아닌 것 같다. 다시 보자.');
      setPuzzleInput('');
    }
  };

  const onNewGame = () => {
    clearGame();
    setChaseTriggered(false);
    dispatch({ type: 'START_NEW_GAME' });
    enterLocation('road');
  };

  const onContinue = () => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: 'LOAD_GAME', state: saved });
      audioRef.current?.start(LOCATIONS[saved.location]?.ambient || 'road');
    }
  };

  const onResetAll = () => {
    if (!confirm('진행 중인 게임을 모두 삭제할까?')) return;
    clearGame();
    setChaseTriggered(false);
    dispatch({ type: 'RESET' });
    setModal({ kind: 'none' });
  };

  // ----- 배경 -----
  const bgClass = useMemo(() => {
    const loc = LOCATIONS[state.location];
    if (!loc) return 'bg-black';
    switch (loc.background) {
      case 'road-night':         return 'bg-gradient-to-b from-black via-midnight-950 to-black';
      case 'accident-night':     return 'bg-gradient-to-b from-black via-red-950/30 to-black';
      case 'camper-interior':    return 'bg-gradient-to-b from-amber-950/40 via-midnight-900 to-black';
      case 'camper-exterior':    return 'bg-gradient-to-b from-midnight-900 via-black to-midnight-900';
      case 'motel-interior':     return 'bg-gradient-to-b from-yellow-950/30 via-midnight-950 to-black';
      case 'motel-corridor':     return 'bg-gradient-to-b from-midnight-900 via-black to-amber-950/20';
      case 'motel-room':         return 'bg-gradient-to-b from-amber-950/20 via-midnight-900 to-black';
      case 'motel-basement':     return 'bg-gradient-to-b from-black via-red-950/40 to-black';
      case 'back-road':          return 'bg-gradient-to-b from-midnight-950 via-black to-midnight-900';
      case 'final-road':         return 'bg-gradient-to-b from-red-950/50 via-black to-black';
      default:                   return 'bg-black';
    }
  }, [state.location]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-blood-500">
        <div className="text-sm tracking-widest">PASSENGER 로딩중…</div>
      </div>
    );
  }

  // 타이틀 화면
  if (state.location === 'title' && state.gameOver === null) {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center text-blood-100 px-4`}>
        <div className="text-center max-w-xl">
          <div className="text-xs tracking-[0.4em] text-blood-500 mb-3">FULL GAME · 3 CHAPTERS</div>
          <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight text-blood-300">PASSENGER</h1>
          <div className="text-xl md:text-2xl text-midnight-300 mb-8 tracking-widest">ROAD OF DEATH</div>
          <p className="text-sm text-midnight-400 mb-10 leading-relaxed">
            늦은 밤, 캠핑커플 매디와 타일러.<br />
            라디오에서 흘러나온 이상한 방송.<br />
            도로 위에서 발견한 사고.<br />
            그리고 — 보이지 않는 손님.
          </p>

          <div className="flex flex-col gap-3 w-72 mx-auto">
            <button
              onClick={onNewGame}
              className="px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white font-bold rounded transition"
            >
              새 게임
            </button>
            {hasSave() && (
              <button
                onClick={onContinue}
                className="px-6 py-3 border border-blood-700/60 text-blood-200 hover:bg-blood-900/40 rounded transition"
              >
                이어서 하기
              </button>
            )}
            <button
              onClick={() => setModal({ kind: 'casefile' })}
              className="px-6 py-3 border border-midnight-700 text-midnight-200 hover:bg-midnight-900 rounded transition"
            >
              CASE FILE (단서)
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
              className="px-6 py-2 text-xs text-midnight-400 hover:text-blood-300"
            >
              🔊 사운드: {state.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="mt-12 text-[10px] text-midnight-600 tracking-widest">
            ⚠ 15세 이상 권장 · CHAPTER 1~3 풀 게임
          </div>
        </div>
      </div>
    );
  }

  // 엔딩 / 게임오버
  if (state.gameOver) {
    const ending = state.ending;
    const title = ending === 'A' ? '엔딩 A — 잡혔다'
      : ending === 'B' ? '엔딩 B — 도주'
      : ending === 'C' ? '엔딩 C — 진실'
      : '엔딩';
    const kicker = ending === 'A' ? 'YOU WERE CAUGHT'
      : ending === 'B' ? 'YOU ESCAPED'
      : ending === 'C' ? 'YOU SAW THE TRUTH'
      : 'ENDING';
    const body = ending === 'A'
      ? '"지금 뒤는 돌아보지 마!"\n\n창밖으로 손이 창문을 두드린다.\n당신은 그것이 누구인지 영영 알 수 없다.'
      : ending === 'B'
      ? '그 모텔에서 빠져나왔다. 라디오 잡음은 아직도 귓가를 맴돈다. 빈 뒷좌석의 온기는 식지 않았다.'
      : ending === 'C'
      ? '부적이 빛났다. 매디의 몸에서 그 무언가가 떠올랐다. "고마워. 이제 보내줘." 당신은 매디를 다시 볼 수 있었다.'
      : '';
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center text-blood-100 px-4`}>
        <div className="max-w-xl text-center">
          <div className="text-xs tracking-[0.4em] text-blood-500 mb-3">{kicker}</div>
          <h1 className="text-3xl md:text-5xl font-black mb-6 text-blood-300">{title}</h1>
          <div className="text-sm text-midnight-300 mb-8 leading-relaxed whitespace-pre-line">
            {body}
          </div>
          <div className="flex flex-col gap-2 w-64 mx-auto">
            <button
              onClick={onNewGame}
              className="px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white rounded transition"
            >
              다시 시작
            </button>
            <button
              onClick={() => setModal({ kind: 'casefile' })}
              className="px-4 py-2 text-xs text-midnight-300 hover:text-blood-300 border border-midnight-700 rounded"
            >
              📁 엔딩 단서 보기
            </button>
            <button
              onClick={onResetAll}
              className="px-4 py-2 text-xs text-midnight-500 hover:text-blood-500"
            >
              저장 데이터 삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 화면
  const loc = LOCATIONS[state.location];
  if (!loc) {
    return <div className="p-8 text-blood-500">위치를 찾을 수 없다.</div>;
  }

  return (
    <div className={`min-h-screen ${bgClass} text-blood-100 relative overflow-hidden`}>
      {threatFlash && (
        <div className="pointer-events-none fixed inset-0 bg-blood-700/10 z-40 animate-pulse" />
      )}

      {/* 상단 HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-xs">
          <div className="px-2 py-0.5 border border-blood-700/50 text-blood-500 text-[10px] tracking-widest">
            CH {state.chapter}
          </div>
          <div className="text-blood-400 tracking-widest">{loc.name}</div>
          <div className="text-midnight-500">·</div>
          <div className="text-midnight-300 font-mono">{state.currentTime}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ kind: 'casefile' })}
            className="text-xs px-3 py-1.5 border border-blood-700/50 text-blood-300 hover:bg-blood-900/40 rounded"
          >
            📁 CASE
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
            className="text-xs px-2 py-1.5 text-midnight-300 hover:text-blood-300"
          >
            {state.soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* 위협도 바 */}
      <div className="absolute top-12 left-0 right-0 z-20 px-4">
        <div className="h-1 bg-midnight-800 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blood-700 to-blood-500 transition-all duration-500"
            style={{ width: `${state.passengerThreat}%` }}
          />
        </div>
        <div className="text-[10px] text-midnight-500 mt-1 text-right tracking-widest">
          패신저 위협: {state.passengerThreat}%
        </div>
      </div>

      <div className="relative w-full h-screen">
        <BackgroundLayer location={state.location} threat={state.passengerThreat} chapter={state.chapter} />

        <div className="absolute inset-0">
          {loc.objects.map(obj => {
            const triggered = state.triggeredObjects.includes(obj.id);
            const locked = obj.requiresItem && !state.inventory.includes(obj.requiresItem);
            return (
              <button
                key={obj.id}
                onClick={() => onObjectClick(obj.id)}
                className={`absolute group transition-all
                  ${triggered && obj.oneShot ? 'opacity-30' : 'opacity-100'}
                  hover:scale-105 active:scale-95
                `}
                style={{
                  left: `${obj.x}%`,
                  top: `${obj.y}%`,
                  width: `${obj.w}%`,
                  height: `${obj.h}%`,
                }}
                title={obj.name}
              >
                <DecorIcon kind={obj.decor || 'shadow'} locked={!!locked} />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-midnight-300 group-hover:text-blood-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {obj.name}
                </span>
              </button>
            );
          })}
        </div>

        {loc.exits.length > 0 && (
          <div className="absolute bottom-32 right-4 z-20 flex flex-col gap-2">
            {loc.exits
              .filter(ex => !ex.requiresFlag || state.flags[ex.requiresFlag])
              .map(ex => (
                <button
                  key={ex.to}
                  onClick={() => enterLocation(ex.to)}
                  className="px-4 py-2 bg-midnight-900/80 border border-blood-700/40 text-blood-200 text-xs rounded hover:bg-blood-900/60 transition"
                >
                  → {ex.label}
                </button>
              ))}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-3 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-3xl mx-auto">
            {state.inventory.length === 0 && (
              <div className="text-xs text-midnight-600 italic px-2 py-3">아직 아무것도 없다…</div>
            )}
            {state.inventory.map(id => {
              const item = ITEMS[id];
              if (!item) return null;
              return (
                <button
                  key={id}
                  onClick={() => onInventoryClick(id)}
                  className="flex-shrink-0 w-14 h-14 bg-midnight-900/90 border border-blood-700/40 hover:border-blood-500 rounded flex flex-col items-center justify-center text-xs"
                  title={item.name}
                >
                  <div className="text-xl">{item.icon}</div>
                  <div className="text-[8px] text-midnight-300 mt-0.5 truncate w-full px-1">{item.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {modal.kind === 'inspect' && (
        <Modal onClose={() => setModal({ kind: 'none' })}>
          <div className="text-blood-200 text-sm leading-relaxed whitespace-pre-line">
            {modal.text}
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={() => setModal({ kind: 'none' })}
              className="px-4 py-2 text-xs bg-blood-700 hover:bg-blood-600 text-white rounded"
            >
              닫기
            </button>
          </div>
        </Modal>
      )}

      {modal.kind === 'puzzle' && PUZZLES[modal.id] && (
        <Modal onClose={() => { setModal({ kind: 'none' }); setPuzzleInput(''); setPuzzleError(''); }}>
          <div className="text-blood-300 text-xs tracking-widest mb-2">퍼즐 · CHAPTER {PUZZLES[modal.id].chapter}</div>
          <div className="text-blood-100 text-sm leading-relaxed mb-4 whitespace-pre-line">
            {PUZZLES[modal.id].prompt}
          </div>

          {PUZZLES[modal.id].type === 'choice' && PUZZLES[modal.id].options && (
            <div className="flex flex-col gap-2">
              {PUZZLES[modal.id].options!.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => submitPuzzle(opt)}
                  className="px-4 py-3 bg-blood-900/40 border border-blood-700/50 hover:border-blood-500 text-left text-sm text-blood-100 rounded transition"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {PUZZLES[modal.id].type === 'item_use' && (
            <div className="text-xs text-midnight-400">
              인벤토리에서 적절한 아이템을 자동으로 사용했다.
            </div>
          )}

          {PUZZLES[modal.id].type === 'combination' && (
            <input
              type="text"
              value={puzzleInput}
              onChange={e => setPuzzleInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitPuzzle(); }}
              placeholder="정답 입력"
              autoFocus
              className="w-full px-3 py-2 bg-black border border-blood-700/50 text-blood-100 rounded text-sm font-mono focus:outline-none focus:border-blood-500"
            />
          )}

          {puzzleError && (
            <div className="mt-2 text-xs text-blood-500">{puzzleError}</div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => { setModal({ kind: 'none' }); setPuzzleInput(''); setPuzzleError(''); }}
              className="px-3 py-1.5 text-xs text-midnight-400 hover:text-blood-300"
            >
              취소
            </button>
            {PUZZLES[modal.id].type === 'combination' && (
              <button
                onClick={() => submitPuzzle()}
                className="px-4 py-1.5 text-xs bg-blood-700 hover:bg-blood-600 text-white rounded"
              >
                확인
              </button>
            )}
          </div>
        </Modal>
      )}

      {modal.kind === 'dialogue' && DIALOGUES[modal.id] && (
        <DialogueModal
          dialogue={DIALOGUES[modal.id]}
          onClose={() => {
            const dlg = DIALOGUES[modal.id];
            if (dlg && dlg.next && dlg.next !== state.location) {
              enterLocation(dlg.next);
            } else {
              setModal({ kind: 'none' });
            }
          }}
        />
      )}

      {modal.kind === 'casefile' && (
        <Modal onClose={() => setModal({ kind: 'none' })}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-blood-300 text-sm tracking-widest">CASE FILE</div>
            <div className="text-[10px] text-midnight-500">
              {state.clues.length}개 단서 · CH {state.chapter}
            </div>
          </div>
          {state.clues.length === 0 ? (
            <div className="text-xs text-midnight-500 italic py-8 text-center">
              아직 발견한 단서가 없다…
            </div>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {state.clues.map(c => (
                <li key={c.id} className="text-xs border-l-2 border-blood-700/60 pl-3 py-1">
                  <div className="text-[10px] text-blood-500 uppercase tracking-widest">{c.category}</div>
                  <div className="text-midnight-200 mt-0.5">{c.text}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-right">
            <button
              onClick={onResetAll}
              className="text-[10px] text-midnight-600 hover:text-blood-500"
            >
              저장 데이터 삭제
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ----- 모달 -----
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-midnight-950 border border-blood-700/50 rounded-lg max-w-md w-full p-5 shadow-2xl shadow-blood-900/40 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ----- 다이얼로그 모달 -----
function DialogueModal({ dialogue, onClose }: { dialogue: typeof DIALOGUES[keyof typeof DIALOGUES]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const line = dialogue.lines[step];
  if (!line) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <button onClick={onClose} className="px-6 py-3 bg-blood-700 text-white rounded">계속</button>
      </div>
    );
  }
  const isLast = step >= dialogue.lines.length - 1;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={() => isLast ? onClose() : setStep(s => s + 1)}
    >
      <div
        className="bg-midnight-950/95 border border-blood-700/60 rounded-lg max-w-xl w-full p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-xs text-blood-500 tracking-widest mb-1">{line.speaker}</div>
        <div className="text-blood-100 text-sm md:text-base leading-relaxed mb-4 min-h-[3em]">
          {line.text}
        </div>
        <div className="flex items-center justify-between text-xs text-midnight-500">
          <div>{step + 1} / {dialogue.lines.length}</div>
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            className="px-4 py-1.5 bg-blood-700 hover:bg-blood-600 text-white rounded"
          >
            {isLast ? '닫기' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- 장식 아이콘 -----
function DecorIcon({ kind, locked }: { kind: string; locked: boolean }) {
  const base = 'w-full h-full flex items-center justify-center';
  const lockedStyle = locked ? 'opacity-60 grayscale' : '';
  const map: Record<string, React.ReactNode> = {
    tree: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🌲</div></div>,
    rock: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪨</div></div>,
    sign: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪧</div></div>,
    shadow: <div className={`${base} ${lockedStyle}`}><div className="text-3xl animate-pulse">👤</div></div>,
    shadow_female: <div className={`${base} ${lockedStyle}`}><div className="text-3xl animate-pulse">🧍‍♀️</div></div>,
    door: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🚪</div></div>,
    window: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪟</div></div>,
    window_back: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🌑</div></div>,
    mirror: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪞</div></div>,
    radio: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">📻</div></div>,
    bed: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🛏️</div></div>,
    box: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">📦</div></div>,
    fridge: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🧊</div></div>,
    table: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🗄️</div></div>,
    flashlight: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🔦</div></div>,
    phone: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">📱</div></div>,
    key: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🗝️</div></div>,
    note: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">📝</div></div>,
    van: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🚐</div></div>,
    wreck: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">💥</div></div>,
    man: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🧍</div></div>,
    cabinet: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🗄️</div></div>,
    carpet: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🟫</div></div>,
    painting: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🖼️</div></div>,
    stairs: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪜</div></div>,
    candle: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🕯️</div></div>,
    basin: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🚰</div></div>,
    corpse: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">💀</div></div>,
    altar: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">⛩️</div></div>,
    pendant: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">⏳</div></div>,
    chair: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🪑</div></div>,
    couch: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🛋️</div></div>,
    lever: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🎚️</div></div>,
    final_car: <div className={`${base} ${lockedStyle}`}><div className="text-3xl">🚙</div></div>,
  };
  return map[kind] || <div className={base}><div className="w-2 h-2 bg-blood-700 rounded-full" /></div>;
}

// ----- 배경 분위기 -----
function BackgroundLayer({ location, threat, chapter }: { location: LocationId; threat: number; chapter: Chapter }) {
  if (location === 'title') return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-16 right-12 w-16 h-16 rounded-full bg-yellow-100/20 blur-sm" />
      <div className="absolute top-20 right-16 w-12 h-12 rounded-full bg-yellow-50/40" />

      {(location === 'road' || location === 'accident' || location === 'back_road' || location === 'final_road') && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-midnight-900/40 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1/3 bg-midnight-700/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1/3 flex flex-col justify-around items-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-1 h-3 bg-yellow-100/30" />
            ))}
          </div>
        </>
      )}

      {location === 'camper' && (
        <>
          <div className="absolute top-1/3 left-0 right-0 h-1 bg-amber-900/40" />
          <div className="absolute top-2/3 left-0 right-0 h-1 bg-amber-900/40" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
        </>
      )}

      {(location === 'motel' || location === 'motel_lobby' || location === 'room_201' || location === 'room_204') && (
        <>
          <div className="absolute top-1/4 right-8 w-24 h-24 bg-yellow-700/15 rounded-full blur-2xl" />
          <div className="absolute bottom-1/3 left-8 w-32 h-1 bg-yellow-700/30" />
        </>
      )}

      {location === 'motel_corridor' && (
        <>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-yellow-700/10" />
          <div className="absolute top-1/4 left-0 right-0 h-px bg-midnight-800" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-midnight-800" />
        </>
      )}

      {location === 'basement' && (
        <>
          <div className="absolute inset-0 bg-red-950/20" />
          <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-red-900/30 rounded-full blur-3xl animate-pulse" />
        </>
      )}

      {/* 패신저 실루엣 */}
      {threat >= 50 && (location === 'road' || location === 'accident') && (
        <div className="absolute animate-pulse" style={{ top: '40%', left: `${50 + Math.sin(Date.now() / 1500) * 20}%` }}>
          <div className="text-6xl opacity-30">🧍</div>
        </div>
      )}

      {chapter >= 2 && threat >= 30 && (location === 'motel_lobby' || location === 'motel_corridor' || location === 'basement') && (
        <div className="absolute animate-pulse" style={{ top: '20%', right: `${10 + Math.sin(Date.now() / 2000) * 15}%` }}>
          <div className="text-5xl opacity-25">🧍‍♀️</div>
        </div>
      )}

      {chapter === 3 && location === 'final_road' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[12rem] opacity-20 animate-pulse">🧍‍♀️</div>
        </div>
      )}

      {threat >= 75 && (
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80" />
      )}
    </div>
  );
}
