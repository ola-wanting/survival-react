import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine.js';
import AssetLoader from './game/AssetLoader.js';

export default function App() {
  const canvasRef = useRef(null);
  const joystickBaseRef = useRef(null);
  const joystickHandleRef = useRef(null);
  const gameRef = useRef(null);

  const [images, setImages] = useState(null);

  const [screen, setScreen] = useState('start');
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number.parseInt(localStorage.getItem('survivalHighScore') || '0', 10);
  });
  const [activePowerUps, setActivePowerUps] = useState({
    shield: false,
    speed: false,
    time: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const loader = new AssetLoader();
      const loadedImages = await loader.loadAll();

      if (cancelled) return;
      setImages(loadedImages);

      if (!canvasRef.current || !joystickBaseRef.current || !joystickHandleRef.current) return;

      const game = new GameEngine({
        canvas: canvasRef.current,
        joystickBase: joystickBaseRef.current,
        joystickHandle: joystickHandleRef.current,
        images: loadedImages,
        onScoreChange: setScore,
        onHighScoreChange: setHighScore,
        onFinalScoreChange: setFinalScore,
        onScreenChange: setScreen,
        onPowerUpsChange: setActivePowerUps,
      });

      gameRef.current = game;
    }

    init();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  const startGame = () => {
    gameRef.current?.startGame();
  };

  return (
    <div className="game-container">
      <canvas ref={canvasRef} id="gameCanvas" />

      <div className="ui-overlay">
        <div className="score-display">
          時間: <span>{score}</span>
        </div>
        <div className="high-score">
          最高秒: <span>{highScore}</span>
        </div>
      </div>

      {screen === 'game-over' && (
        <div className="game-over-screen">
          <h1>ゲームオーバー</h1>
          <p><span>{finalScore}</span>秒耐えました！</p>
          <button type="button" onClick={startGame}>もう一度プレイ</button>
        </div>
      )}

      {screen === 'start' && (
        <div className="start-screen">
          <h1>生存チャレンジ</h1>
          <p>長く耐えるほど秒数が上がる！</p>
          <p className="controls">バーチャルスティックで移動</p>
          <button type="button" onClick={startGame}>ゲームスタート</button>
        </div>
      )}

      <div className="joystick-container" id="joystickContainer">
        <div className="joystick-base" ref={joystickBaseRef}>
          <div className="joystick-handle" ref={joystickHandleRef} />
        </div>
      </div>

      <div className="power-up-indicator">
        {activePowerUps.shield && (
          images?.activeShieldIndicator ? (
            <img src={images.activeShieldIndicator.src} alt="シールド" className="power-up-img" />
          ) : (
            <span className="power-up-item power-up-shield">シールド</span>
          )
        )}
        {activePowerUps.speed && (
          images?.activeSpeedIndicator ? (
            <img src={images.activeSpeedIndicator.src} alt="加速" className="power-up-img" />
          ) : (
            <span className="power-up-item power-up-speed">加速</span>
          )
        )}
        {activePowerUps.time && (
          images?.activeTimeStopIndicator ? (
            <img src={images.activeTimeStopIndicator.src} alt="時間停止" className="power-up-img" />
          ) : (
            <span className="power-up-item power-up-time">時間停止</span>
          )
        )}
      </div>
    </div>
  );
}