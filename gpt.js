const startButton = document.getElementById('startButton');
const recognizedTextElement = document.getElementById('recognizedText');
const gptResponseElement = document.getElementById('gptResponse');
const timerElement = document.getElementById('timer'); // 타이머 요소
const userInput = document.getElementById('userInput');
const sendTextButton = document.getElementById('sendTextButton'); // 텍스트 전송 버튼

// 음성 인식 설정
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR"; // 한국어로 설정
recognition.continuous = true; // 연속 인식
recognition.interimResults = false; // 중간 결과는 표시하지 않음

let countdown; // 타이머 카운트다운 저장할 변수
let finalTranscript = ''; // 음성 인식된 최종 텍스트 저장 변수

// 음성 인식이 시작되면 호출되는 함수
startButton.addEventListener('click', () => {
    recognition.start();
    startButton.disabled = true; // 버튼 비활성화
    let timeLeft = 15; // 15초 설정
    timerElement.innerText = timeLeft; // 초기 타이머 값 설정

    // 1초마다 카운트다운
    countdown = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown); // 타이머 종료
        }
    }, 1000);

    setTimeout(() => {
        recognition.stop(); // 15초 후 음성 인식 중지
        startButton.disabled = false; // 버튼 다시 활성화
        clearInterval(countdown); // 타이머 종료
        
        // 수집된 텍스트를 한 번에 GPT로 전송
        sendTextToGPT(finalTranscript);
    }, 15000); // 15초
});

// 음성 인식 결과를 처리하는 함수
recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    finalTranscript += lastResult[0].transcript; // 음성 인식된 텍스트를 추가로 저장
    recognizedTextElement.innerText = finalTranscript; // 실시간으로 업데이트
};

// // 사용자 텍스트 입력 후 전송 버튼 클릭 이벤트
// sendTextButton.addEventListener('click', () => {
//     const userInputText = userInput.value.trim(); // 사용자 입력 텍스트 가져오기
//     if (userInputText) {
//         sendTextToGPT(userInputText); // 사용자가 입력한 텍스트를 GPT에 전송
//     }
// });

// GPT API에 요청을 보내는 함수 (서버에서 데이터 받아오기)
async function sendTextToGPT(text) {
    //http://localhost:3000
    try {
        const response = await fetch("http://34.47.112.24:3000/gpt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        // 요청이 성공하면 응답을 JSON 형식으로 변환
        const data = await response.json();

        // 받아온 데이터를 UI에 표시
        gptResponseElement.innerText = data.response;

        // emotionNum과 percent를 객체로 만들고 로컬스토리지에 저장
        const gptData = {
            gpt_emotion: data.emotionNum,
            gpt_score: data.percent
        };

        // JSON 형식으로 변환하여 로컬스토리지에 저장
        localStorage.setItem('gptData', JSON.stringify(gptData));

        // 콘솔에 저장된 값 확인
        console.log('Stored emotionNum:', data.emotionNum);
        console.log('Stored percent:', data.percent);

    } catch (error) {
        console.error("HTTP 요청 실패:", error);

        // HTTP 요청이 실패하면 HTTPS로 요청
        try {
            const response = await fetch("https://34.47.112.24:3000/gpt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            gptResponseElement.innerText = data.response;

            const gptData = {
                gpt_emotion: data.emotionNum,
                gpt_score: data.percent
            };

            localStorage.setItem('gptData', JSON.stringify(gptData));

            console.log('Stored emotionNum:', data.emotionNum);
            console.log('Stored percent:', data.percent);

        } catch (error) {
            console.error("HTTPS 요청 실패:", error);
            gptResponseElement.innerText = "GPT 응답을 가져오는 데 실패했습니다.";
        }
    }
}

