'use strict';
const UNITS = Object.freeze(['g', 'ml', '개', '공기', '장', '컵']);
const PRIVATE = /위전절|위절제|항암|수술|덤핑|진료|병원|환자|의사|약물|복약|통증|증상|구토|설사|혈당|체중|몸무게|혈액|알레르기|이름|연락처|전화|생일|주소|암호|비밀번호|오늘|어제|내일|아침에|점심에|저녁에|먹었|먹고|먹은|섭취|cancer|chemo|surgery|gastrect|patient|clinic|doctor|medicine|medication|symptom|glucose|diagnos|password|token|secret|https?|www|api.?key|ignore|instruction|system|prompt/i;
// This is a deliberately limited generic-food vocabulary, not a universal PII detector.
const WORDS = (`닭가슴살 닭다리살 닭안심 소고기 쇠고기 돼지고기 닭고기 오리고기 연어 고등어 참치 명태 대구 새우 오징어 멸치 삼치 갈치 광어 조기 장어 조개 홍합 굴 게 생선 살코기 안심 등심 목살 삼겹살 닭 계란 달걀 흰자 노른자 두부 순두부 연두부 콩 비지 된장 청국장 낫토 우유 두유 요구르트 요거트 그릭요거트 치즈 코티지 모차렐라 모짜렐라 리코타 체다 분유 유청 카제인 프로틴 단백질 파우더 쉐이크 셰이크 보충제 현미밥 잡곡밥 쌀밥 흰쌀밥 보리밥 밥 현미 잡곡 쌀 보리 귀리 오트밀 시리얼 빵 식빵 통밀 호밀 바게트 베이글 크래커 떡 떡국떡 국수 소면 우동 라면 파스타 스파게티 메밀 냉면 죽 미음 감자 고구마 옥수수 단호박 호박 바나나 사과 배 귤 오렌지 딸기 블루베리 키위 포도 복숭아 수박 멜론 망고 파인애플 자두 감 토마토 방울토마토 아보카도 당근 오이 상추 양배추 양상추 배추 시금치 브로콜리 콜리플라워 버섯 양송이 새송이 표고 양파 파 마늘 무 가지 피망 파프리카 콩나물 숙주 샐러드 해초 미역 김 다시마 김치 아몬드 호두 땅콩 캐슈넛 피스타치오 견과류 참깨 들깨 치아씨드 올리브유 들기름 참기름 식용유 버터 마가린 마요네즈 소스 드레싱 설탕 꿀 잼 초콜릿 코코아 커피 차 물 생수 보리차 녹차 홍차 주스 쥬스 음료 스포츠 이온 식혜 수정과 탄산수 소금 후추 간장 고추장 후무스 카레 스프 수프 국 탕 찌개 비빔밥 볶음밥 김밥 초밥 샌드위치 햄버거 피자 불고기 수육 제육 된장국 미역국 닭죽 전복죽 전복 닭곰탕 곰탕 설렁탕 사골 육수 단백 무지방 저지방 전지 무가당 무첨가 저당 무설탕 플레인 통 무염 구운 구이 삶은 삶기 찐 찜 데친 데침 생 날것 조리 볶은 볶음 튀긴 튀김 건조 말린 익힌 으깬 껍질 제거 포함 생것 냉동 냉장 훈제 통조림 물기 제거한 닭가슴 닭안심살 닭다리 닭날개 흰살 흰 식물성 동물성 완두 대두 검은콩 검정콩 병아리콩 렌틸콩 강낭콩 렌틸 팥 녹두 흑임자 쌀국수 토스트 잔치국수 비빔국수 건면 생면 닭가슴살소시지 소시지 햄 베이컨 곡물 누룽지 뮤즐리 그래놀라 소고기죽 야채죽 야채 채소 과일 과일주스 블랙 아이스 따뜻한 차가운 디카페인 더블 에스프레소 아메리카노 카페라떼 라떼
chicken breast beef pork fish salmon tuna egg eggs tofu milk soy yogurt greek cheese rice brown white oat oats oatmeal bread whole wheat potato sweet banana apple orange strawberry blueberry avocado tomato broccoli spinach carrot almond walnut peanut olive oil butter water tea coffee juice cooked boiled steamed grilled raw plain unsweetened low fat skim protein powder shake`).split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
const COUNT_WORDS = Object.freeze({한:1,하나:1,두:2,둘:2,세:3,셋:3,네:4,넷:4,다섯:5,여섯:6,반:0.5});
const QUANTITY = /(?<![\d.])((?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*\d+)?|하나|다섯|여섯|한|두|둘|세|셋|네|넷|반)\s*(그람|그램|밀리리터|g|ml|개|공기|장|컵)/gi;
function error(code, message, status=400) { const err = new Error(message); err.code=code;err.status=status;return err; }
function genericName(value) {
  if(typeof value!=='string')return false;
  const name=value.normalize('NFKC').trim();
  if(!name||name.length>80||PRIVATE.test(name)||!/^[가-힣A-Za-z\s-]+$/.test(name))return false;
  let rest=name.toLowerCase().replace(/[\s-]/g,'');
  for(const word of WORDS)rest=rest.split(word.toLowerCase()).join('');
  return rest.length===0;
}
function quantityValue(raw) {
  const compact=raw.replace(/\s+/g,'');
  if(Object.hasOwn(COUNT_WORDS,compact))return COUNT_WORDS[compact];
  if(compact.includes('/')) { const [a,b]=compact.split('/').map(Number);return b>0?a/b:NaN; }
  return Number(compact);
}
function canonicalUnit(raw) { const unit=raw.toLowerCase();return /^(그람|그램)$/.test(unit)?'g':unit==='밀리리터'?'ml':unit; }
function validateText(value) {
  if(typeof value!=='string'||!value.trim()||value.length>1200)throw error('text','음식 구절을 1~1,200자로 입력해 주세요.');
  const text=value.normalize('NFKC').trim();
  if(PRIVATE.test(text)||!(/^[가-힣A-Za-z0-9\s.,/;]+$/u.test(text))||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)||/\d{4}[./]\d/.test(text))throw error('private_text','음식명과 양만 전송할 수 있어요. 날짜·증상·개인 메모를 빼 주세요.');
  const fragments=text.split(/[,;\r\n]+/).map(v=>v.trim()).filter(Boolean);
  if(!fragments.length||fragments.length>20)throw error('items','한 번에 음식 20개까지 입력해 주세요.');
  const evidence=[];
  for(const fragment of fragments){
    const matches=[...fragment.matchAll(QUANTITY)];
    if(matches.length>1)throw error('ambiguous','음식을 쉼표로 나누고 각 음식의 양은 한 번만 적어 주세요.');
    const name=fragment.replace(QUANTITY,'').trim();
    if(!genericName(name))throw error('food_only','확인된 일반 음식명만 전송할 수 있어요. 이 항목은 직접 입력해 주세요.');
    const amount=matches.length?quantityValue(matches[0][1]):null;
    const unit=matches.length?canonicalUnit(matches[0][2]):null;
    if(amount!==null&&(!Number.isFinite(amount)||amount<=0||amount>10000))throw error('amount','음식 양을 확인해 주세요. 0보다 크고 10,000 이하의 값만 사용할 수 있어요.');
    evidence.push({name,amount,unit});
  }
  return {text,evidence};
}
function exactKeys(value, keys) {return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
function validateResult(value, evidence) {
  if(!exactKeys(value,['items'])||!Array.isArray(value.items)||value.items.length!==evidence.length)throw error('upstream_schema','음식 구조화 결과를 확인할 수 없어 적용하지 않았어요.',502);
  const used=new Set();
  const items=value.items.map(item=>{
    if(!exactKeys(item,['name','amount','unit'])||!genericName(item.name)||!(item.amount===null||typeof item.amount==='number'&&Number.isFinite(item.amount)&&item.amount>0&&item.amount<=10000)||!(item.unit===null||UNITS.includes(item.unit))||(item.amount===null)!==(item.unit===null))throw error('upstream_schema','음식 구조화 결과 형식이 맞지 않아 적용하지 않았어요.',502);
    const compact=item.name.toLowerCase().replace(/\s+/g,'');
    const index=evidence.findIndex((e,i)=>!used.has(i)&&e.name.toLowerCase().replace(/\s+/g,'')===compact&&e.amount===item.amount&&e.unit===item.unit);
    if(index<0)throw error('upstream_inference','원문에 없는 음식이나 양이 제안되어 적용하지 않았어요.',502);
    used.add(index);
    return {name:evidence[index].name,amount:item.amount,unit:item.unit};
  });
  return {items,warnings:items.some(item=>item.amount===null)?['양을 적지 않은 음식은 양과 단위를 직접 입력해 주세요.']:[]};
}
module.exports={UNITS,validateText,validateResult,error};
