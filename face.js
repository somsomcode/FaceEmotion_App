let faceapi;
let detections = [];
let expressionDataArray = []; // 30초 동안 감지된 표정 데이터를 저장할 배열
let countdown; // 타이머 변수

const video = document.getElementById("videoInput");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const expressionResultElement = document.getElementById("expressionResult");
const finalExpressionResultElement = document.getElementById("finalExpressionResult");
const timerElement = document.getElementById("timer"); // 타이머 요소

// 타이머 시간을 상단에서 설정
const TIMER_DURATION = 5; // 타이머 시간을 수정하려면 이 값을 변경

// 페이지 로드 시 카메라 자동 시작
window.onload = function() {
    startFaceRecognition();
};

// 버튼 이벤트 등록
startButton.addEventListener("click", handleStartRecognition);
stopButton.addEventListener("click", handleStopRecognition);

// 표정 인식 시작 핸들러
function handleStartRecognition() {
    startButton.disabled = true;
    stopButton.disabled = false;
    expressionDataArray = []; // 표정 데이터 배열 초기화
    startCountdown(); // 타이머 시작
}

// 표정 인식 중지 핸들러
function handleStopRecognition() {
    stopRecognition();
}

// 타이머 시작 함수 (TIMER_DURATION초 카운트다운)
function startCountdown() {
    let timeLeft = TIMER_DURATION;
    timerElement.innerText = timeLeft;

    countdown = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;

        if (timeLeft <= 0) {
            console.log("타이머 완료, stopRecognition 호출"); // 디버그 로그
            stopRecognition(); // 시간이 0이 되면 표정 인식 중지
        }
    }, 1000);
}

// 타이머를 정지하는 함수
function stopTimer() {
    if (countdown) {
        clearInterval(countdown);
        console.log("타이머가 정지되었습니다.");
    }
}

// 표정 인식을 중지하는 함수
function stopRecognition() {
    stopTimer(); // 타이머 정지
    updateButtonState(false); // 버튼 상태 업데이트
    handleEmotionAnalysis(); // 감정 분석 후 페이지 이동
}

// 버튼 상태를 업데이트하는 함수
function updateButtonState(isRunning) {
    startButton.disabled = isRunning;
    stopButton.disabled = !isRunning;
}

// 감정 분석 및 페이지 이동 처리 함수
async function handleEmotionAnalysis() {
    try {
        await analyzeFinalEmotion(); // 감정 분석
        console.log("감정 분석이 완료되었습니다.");
        redirectToNextPage("gpt.html", 1000); // 페이지 이동
    } catch (error) {
        console.error("감정 분석 중 오류 발생:", error);
    }
}

// 페이지 이동 처리 함수
function redirectToNextPage(url, delay = 1000) {
    setTimeout(() => {
        try {
            window.location.assign(url); // 페이지 이동
            console.log(`페이지 이동 중: ${url}`);
        } catch (error) {
            console.error("페이지 이동에 실패했습니다:", error);
        }
    }, delay);
}

// face-api.js 표정 인식 시작
async function startFaceRecognition() {
    try {
        video.srcObject = await navigator.mediaDevices.getUserMedia({
            video: {}
        });

        const faceOptions = {
            withLandmarks: true,
            withExpressions: true,
            withDescriptors: false,
            minConfidence: 0.5,
        };

        faceapi = ml5.faceApi(video, faceOptions, () => {
            detectFaces(); // 얼굴 인식 시작
        });
    } catch (error) {
        console.error("카메라 시작 실패:", error);
    }
}

// 표정 감지 함수
function detectFaces() {
    faceapi.detect((error, result) => {
        if (error) {
            console.error(error);
            return;
        }

        detections = result;
        if (detections.length > 0) {
            const expressions = detections[0].expressions;
            updateExpressionResults(expressions); // 표정 결과 업데이트
            expressionDataArray.push(expressions); // 표정 데이터를 배열에 저장
        }

        faceapi.detect(detectFaces); // 지속적인 감지
    });
}

// 표정 결과 업데이트 함수
function updateExpressionResults(expressions) {
    const expressionPercentages = {
        neutral: (expressions.neutral * 100).toFixed(2),
        happy: (expressions.happy * 100).toFixed(2),
        angry: (expressions.angry * 100).toFixed(2),
        sad: (expressions.sad * 100).toFixed(2),
        disgusted: (expressions.disgusted * 100).toFixed(2),
        surprised: (expressions.surprised * 100).toFixed(2),
        fearful: (expressions.fearful * 100).toFixed(2),
    };

    expressionResultElement.innerHTML = `
        Neutral: ${expressionPercentages.neutral}%<br>
        Happy: ${expressionPercentages.happy}%<br>
        Angry: ${expressionPercentages.angry}%<br>
        Sad: ${expressionPercentages.sad}%<br>
        Disgusted: ${expressionPercentages.disgusted}%<br>
        Surprised: ${expressionPercentages.surprised}%<br>
        Fearful: ${expressionPercentages.fearful}%
    `;
}

// 종합 감정 분석 함수 (가중치 3배 적용 후 100% 기준 정규화, 행복에 가중치 없음)
async function analyzeFinalEmotion() {
    const weightedExpressions = {
        neutral: 0,
        happy: 0,
        angry: 0,
        sad: 0,
        disgusted: 0,
        surprised: 0,
        fearful: 0,
    };

    // 표정 데이터 평균 계산 및 가중치 적용 (행복은 가중치 적용하지 않음)
    expressionDataArray.forEach((expressions) => {
        weightedExpressions.neutral += expressions.neutral; // neutral은 가중치 없음
        weightedExpressions.happy += expressions.happy; // happy는 가중치 없음
        weightedExpressions.angry += expressions.angry * 3; // 3배 가중치 적용
        weightedExpressions.sad += expressions.sad * 3; // 3배 가중치 적용
        weightedExpressions.disgusted += expressions.disgusted * 3; // 3배 가중치 적용
        weightedExpressions.surprised += expressions.surprised * 3; // 3배 가중치 적용
        weightedExpressions.fearful += expressions.fearful * 3; // 3배 가중치 적용
    });

    const totalFrames = expressionDataArray.length;

    // 각 표정 값의 평균을 계산
    for (let key in weightedExpressions) {
        weightedExpressions[key] = (weightedExpressions[key] / totalFrames);
    }

    // 가중치를 적용한 값들의 총합 계산 (정규화 준비)
    const totalWeightedSum = Object.values(weightedExpressions).reduce((acc, val) => acc + val, 0);

    // 100% 기준으로 정규화
    for (let key in weightedExpressions) {
        weightedExpressions[key] = (weightedExpressions[key] / totalWeightedSum) * 100;
    }

    // 최종 감정 결과 도출
    const finalExpression = Object.keys(weightedExpressions).reduce((a, b) =>
        weightedExpressions[a] > weightedExpressions[b] ? a : b
    );

    // 콘솔에 결과 출력
    console.log("Final Weighted Expressions:", weightedExpressions);
    console.log("Final Detected Emotion:", finalExpression);

    const expressionMapping = {
        neutral: 0,
        angry: 1,
        disgusted: 1,
        fearful: 2,
        happy: 3,
        sad: 4,
        surprised: 5
    };

    const mappedExpression = expressionMapping[finalExpression]; // 매핑된 숫자 값

    // 로컬 스토리지에 최종 표정 결과 저장
    const faceData = {
        face_emotion: mappedExpression, // 숫자로 변환된 표정 결과
        face_score: weightedExpressions[finalExpression].toFixed(2) // 퍼센트 값
    };

    localStorage.setItem('faceData', JSON.stringify(faceData)); // 로컬 스토리지에 저장
}
