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
            recognition.stop(); // 타이머가 끝나면 음성 인식 중지
            startButton.disabled = false; // 버튼 다시 활성화
            timerElement.innerText = ""; // 타이머 텍스트 비우기
            sendTextToGPT(finalTranscript); // 수집된 텍스트를 GPT로 전송
        }
    }, 1000);
});

// 음성 인식 결과를 처리하는 함수
recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    finalTranscript += lastResult[0].transcript; // 음성 인식된 텍스트를 추가로 저장
    recognizedTextElement.innerText = finalTranscript; // 실시간으로 업데이트
};

// GPT API에 요청을 보내는 함수
async function fetchGPTResponse(text) {
    const urls = [
        `https://34.54.27.235:3000/gpt`,
    ];

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`${url} 요청 실패:`, error);
        }
    }

    throw new Error("모든 요청이 실패했습니다.");
}

async function sendTextToGPT(text) {
    if (!text) return; // 텍스트가 비어있으면 함수 종료

    try {
        const data = await fetchGPTResponse(text);

        // 받아온 데이터를 UI에 표시
        gptResponseElement.innerText = data.response;

        // emotionNum과 percent를 객체로 만들고 로컬스토리지에 저장
        const gptData = {
            gpt_emotion: data.emotionNum,
            gpt_score: data.percent
        };

        localStorage.setItem('gptData', JSON.stringify(gptData));

        console.log('Stored emotionNum:', data.emotionNum);
        console.log('Stored percent:', data.percent);

    } catch (error) {
        console.error("GPT 응답을 가져오는 데 실패했습니다.", error);
        gptResponseElement.innerText = "GPT 응답을 가져오는 데 실패했습니다.";
    }
}
