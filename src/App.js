import React, { useEffect, useRef, useState } from 'react'
import './App.css';
import { Howl } from 'howler';
import soundURL from './assets/botayxuong.mp3';


var sound = new Howl({
  src: [soundURL]
});



const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENT = 0.8;

function App() {
  const video = useRef();
  const mobilenetModule = useRef();
  const classifier = useRef();
  const cantPlaySound = useRef(true);
  const [touched, setTouched] = useState(false)

  const init = async () => {
    console.log('init...')
    await setupCamera();

    console.log('Camera Success');

    const mobilenet = require('@tensorflow-models/mobilenet');
    const knnClassifier = require('@tensorflow-models/knn-classifier');

    // Create the classifier.
    classifier.current = knnClassifier.create();
    // Load the model.
    mobilenetModule.current = await mobilenet.load();


    console.log('setup done');
    console.log('Không chạm tay lên mặt và bấm Train 1');
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      } else {
        reject()
      }
    });
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy...`)
    for (let i = 0; i < TRAINING_TIME; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIME * 100)}%`);

      await training(label);
    }
  }

  /**
   * Bước 1: Train cho máy khuôn mặt không chạm
   * Bước 2: Train cho máy khuôn mặt chạm tay
   * Bước 3: Lấy hình ảnh hiện tại, phân tích và so sánh với data đã train trước đó
   * ==> Nếu mà matching với data khuôn mặt chạm tay ==> Cảnh báo
   * @param {*} label 
   * @returns 
   */

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label)
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    // console.log('Label: ', result.label);
    // console.log('Confidences: ', result.confidences);
    if (result.label === TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_CONFIDENT) {
      console.log('Touched');
      if (cantPlaySound.current) {
        cantPlaySound.current = false;
        sound.play();
      }
      setTouched(true);
    } else {
      console.log('Not touched')
      setTouched(false);
    }
    await sleep(200);

    run();
  }

  const sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    // Fires when the sound finishes playing.
    sound.on('end', function () {
      cantPlaySound.current = true;
    });

    //cleanup
    return () => {

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn" onClick={() => run()}>Run</button>
      </div>
    </div>


  );
}

export default App;
