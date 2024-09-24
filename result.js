// 1. 가중치 설정 (상단에서 수정 가능)
const faceWeight = 6; // 표정 데이터 가중치
const gptWeight = 4;  // 음성 데이터 가중치

// 2. 로컬 스토리지에서 데이터를 가져옴
const gptData = JSON.parse(localStorage.getItem('gptData'));
const faceData = JSON.parse(localStorage.getItem('faceData'));

// 3. gpt_score와 face_score 값을 숫자로 변환
const gptScore = parseFloat(gptData.gpt_score);
const faceScore = parseFloat(faceData.face_score);

// 4. 가중 평균 계산 (설정된 가중치 사용)
const weightedAverageScore = ((faceScore * faceWeight) + (gptScore * gptWeight)) / (faceWeight + gptWeight);

// 5. 최종 감정 결정 로직
let finalEmotion = '';
if (gptData.gpt_emotion === faceData.face_emotion) {
    // 두 감정이 일치하면 그 감정을 최종 감정으로 설정
    finalEmotion = gptData.gpt_emotion;
} else {
    // 감정이 다를 경우, 가중치에 따른 점수가 더 높은 감정을 선택
    finalEmotion = faceScore * faceWeight > gptScore * gptWeight ? faceData.face_emotion : gptData.gpt_emotion;
}

// 6. 최종 결과
const finalResult = {
    emotion: finalEmotion,
    weightedAverageScore: weightedAverageScore.toFixed(2) // 가중 평균 점수 (소수점 2자리)
};

// 7. 최종 감정 분석 결과 출력
console.log(`최종 감정: ${finalEmotion}, 가중 평균 점수: ${finalResult.weightedAverageScore}`);

// 8. 로컬 스토리지에 최종 감정 분석 결과 저장
localStorage.setItem('finalEmotionResult', JSON.stringify(finalResult));
console.log(finalResult);


