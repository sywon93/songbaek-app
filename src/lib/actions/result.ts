// 서버 액션 결과 공통 타입. 프로덕션 Next.js 는 Server Action 에서 throw 된
// 에러 메시지를 가려버려(클라이언트에는 "Minified React error #441" 로만
// 전달됨) 사용자가 실패 원인을 볼 수 없으므로, 구체적인 안내가 필요한
// 액션은 throw 대신 이 형태로 결과를 돌려줍니다.
export type ActionResult = { ok: true } | { ok: false; message: string };

export const OK: ActionResult = { ok: true };
export const fail = (message: string): ActionResult => ({ ok: false, message });
