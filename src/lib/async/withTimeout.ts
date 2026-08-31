/**
 * 주어진 작업이 `ms` 안에 끝나지 않으면 `fallback` 으로 대체합니다.
 *
 * 배경: 서버 컴포넌트에서 Supabase 조회가 (무료 플랜 콜드스타트·커넥션 한계 등으로)
 * 오래 매달리면 페이지 전체가 응답 없이 멈춰 버립니다. 핵심 조회는 fallback 을
 * "빈 값"으로 두어 로그인 화면으로 되돌리거나 부분 렌더링이 되도록 하고,
 * 부가 조회는 빈 목록으로 대체해 홈 화면이 어떻게든 뜨게 만듭니다.
 *
 * - Supabase 클라이언트 호출은 보통 reject 하지 않고 `{ data, error }` 로 resolve 하지만,
 *   혹시 reject 하더라도 여기서 fallback 으로 흡수해 unhandled rejection 을 막습니다.
 */
export async function withTimeout<T, F = T>(
  operation: PromiseLike<T>,
  ms: number,
  fallback: F,
): Promise<T | F> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<F>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  const settled = Promise.resolve(operation).catch(() => fallback);
  try {
    return await Promise.race([settled, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 홈 화면 진입 시 Supabase 조회에 적용하는 기본 제한 시간(ms). */
export const HOME_QUERY_TIMEOUT_MS = 8000;
