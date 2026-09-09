import type { AxisId, ResultKey } from "@/domain/shared/ids";
import type { PoleSide } from "@/domain/assessment/model/definition";

/** docs/architecture.md 4.3 */
export interface CollaborationProfile {
  /** 함께할 때 잘 이어지는 점 */
  readonly naturalFit: readonly string[];
  /** 미리 맞춰 두면 좋은 점 */
  readonly needsTuning: readonly string[];
}

/**
 * 장면이 붙은 서술 한 줄 (contentVersion 3.0.0)
 *
 * `scene`은 "수업" "생활지도" "업무" "동료" "학부모" 같은 교직 장면 이름입니다.
 * 문구를 엔진이 모르게 두려고 라벨 자체를 콘텐츠가 소유합니다 (DEC-004와 같은 원칙).
 * 화면에서는 칩으로 표시해, 선생님이 필요한 장면만 골라 읽을 수 있게 합니다.
 */
export interface SceneNote {
  readonly scene: string;
  /**
   * 짧은 상황 제목 (DEC-054) — 예: "월요일 1교시", "길어지는 학년 회의"
   *
   * 읽는 사람이 제목만 훑어도 무슨 이야기인지 알 수 있게 합니다.
   * 문단만 늘어놓으면 눈이 걸릴 곳이 없어 "뭘 얘기하려는 거지?"가 됩니다.
   */
  readonly situation: string;
  /** 그 상황에서 실제로 일어나는 일. 추측형 어미를 쓰지 않습니다 (DEC-054) */
  readonly text: string;
}

/**
 * 줄글 보기의 성격 묘사 (DEC-069)
 *
 * `rhythm`은 히어로 요약 자리에 들어가는 세 문장이라, 검사에 5~10분을 들인 사람이
 * "이게 다야?"라고 느끼기 쉬웠습니다. 이 원고는 그 자리를 대신하는 것이 아니라
 * **줄글 보기에서만** 쓰이는 별도 원고입니다. 기존 보기는 이 필드를 읽지 않습니다.
 *
 * 유형별로 손으로 씁니다. 축 문장을 이어 붙여 만들면 네 축을 따로 읽는 것과 같아지고,
 * "내 얘기 같다"는 느낌은 그 조합에서만 나오는 구체적인 장면에서 생깁니다.
 */
export interface ResultPortrait {
  /**
   * 결과를 여는 문단들. 선생님이 교실에서 실제로 어떻게 움직이는지
   *
   * **구역마다 맡는 축이 정해져 있습니다** (DEC-069). 그러지 않으면 가장 눈에 띄는
   * 축 하나가 원고 전체를 먹고, 읽는 사람은 "이 검사가 그것만 봤나" 하고 느낍니다.
   *
   *   opening[0] 동료·혼자 + 계획·즉흥   opening[1] 관찰·앞날 + 기준·사정
   *   classroomSigns 네 축을 한 문장씩    fromKids 아이가 실제로 겪는 축
   *   drive 관찰·앞날 + 기준·사정         misread 동료·혼자
   *   whenTired 계획·즉흥 + 동료·혼자
   */
  readonly opening: readonly string[];
  /**
   * 교실에 들어가면 보이는 것 — **문항이 묻지 않은 것**을 적습니다 (DEC-069)
   *
   * 결과가 문항이 다룬 영역 안에만 머물면, 답한 사람은 자기가 방금 고른 것을
   * 다시 읽게 됩니다. "이건 체크한 적 없는데 맞네"가 나오려면 게시판 상태,
   * 서랍 안, 알림장 문체, 학기 초 첫 주처럼 **묻지 않은 자리**로 나가야 합니다.
   * 네 방향의 조합에서 실제로 따라 나오는 것만 적고, 지어내지 않습니다.
   */
  readonly classroomSigns: readonly string[];
  /**
   * 수업을 만들고 진행할 때 (DEC-074)
   *
   * 예전에는 네 축을 카드 한 장에 하나씩 늘어놓았습니다. 그러면 결과를 종합하지 않고
   * 코드 한 글자씩 해설하는 것이 됩니다. **아이와 수업을 이해하는 방식**과
   * **업무와 수업을 진행하는 방식**을 수업이라는 한 장면에서 함께 풀어 씁니다.
   */
  readonly inLessons: readonly string[];
  /**
   * 아이를 대할 때 (DEC-074)
   *
   * **결정을 내리는 방식**과 **생각을 정리하는 방식**이 아이와의 사이에서
   * 어떻게 만나는지를 한 장면으로 씁니다.
   */
  readonly withStudents: readonly string[];
  /**
   * 아이들이 느끼는 선생님 — 시점을 아이 쪽으로 옮깁니다 (DEC-069)
   *
   * 교사가 자기 결과에서 가장 알고 싶은 것은 "우리 반 아이들에게 나는 어떤 어른인가"입니다.
   * 문항은 교사 시점으로만 묻기 때문에, 이 답은 조합에서 추론해야만 나옵니다.
   *
   * **`axis-energy`를 여기에 옮겨 쓰지 않습니다.** 그 축은 문항 12개 가운데 11개가
   * 동료·혼자 장면이라, 어른들 사이에서의 모습만 잽니다. 동료와 말수가 적어도
   * 아이들과는 하루 종일 떠드는 선생님이 많습니다. 그 사람에게 "말수가 적은 선생님"이라고
   * 하면 결과가 통째로 틀린 것이 됩니다.
   */
  readonly fromKids: readonly string[];
  /**
   * 무엇을 중요하게 여기는가 — 행동이 아니라 **그 행동을 만드는 것**
   *
   * "무엇을 하는가"만 적으면 관찰 기록이 되고, 읽는 사람은 남 이야기로 읽습니다.
   * "왜 그렇게 하는가"가 붙어야 자기 이야기가 됩니다.
   */
  readonly drive: readonly string[];
  /**
   * 자주 받는 오해 — "이렇게 보이지만 실은 이렇습니다"
   *
   * 칭찬은 공감을 만들지 않습니다. **본인은 억울했지만 설명하지 못했던 것**을
   * 대신 말해 줄 때 "내 얘기 같다"가 됩니다. 그래서 오해를 먼저 적고 뒤집습니다.
   */
  readonly misread: readonly string[];
  /** 여유가 없을 때 먼저 나타나는 모습. 단점이 아니라 신호로 적습니다 */
  readonly whenTired: readonly string[];
}

/**
 * 선생님께 어울리는 학년 (DEC-076, 2026-09-09)
 *
 * AGENTS.md 6절의 "유형별 직업/업무 추천 금지"에 대한 **예외**입니다.
 * "이 학년을 맡아야 한다"는 배정 판단이 아니라, "이런 학년에서 특히 빛나요"라는
 * 가벼운 참고 태그로만 씁니다. 그래서 등급·우열로 읽히지 않게 이 문구만 씁니다.
 *
 * `grades`는 **학년군 단위**(1~2 · 3~4 · 5~6학년)만 씁니다. 네 축만으로 특정
 * 한 학년(예: "3학년")까지 집어내면 근거 없이 정확한 척하게 됩니다. 초등 교육과정이
 * 실제로 쓰는 학년군 구분과 맞춰, 있는 만큼만 말합니다.
 */
export interface GradeFit {
  /** 학년군 표기. "1~2학년" · "3~4학년" · "5~6학년" 셋만 씁니다 */
  readonly grades: string;
  /** 그 학년군과 잘 맞는 이유 한 문장. 이 유형의 특징에서 그대로 이어져야 합니다 */
  readonly reason: string;
}

export interface ResultProfile {
  /** 내부 식별자. 화면에 그대로 노출하지 않습니다. */
  readonly key: ResultKey;
  /** 축 → 방향 조합 */
  readonly poles: Readonly<Record<AxisId, PoleSide>>;
  readonly title: string;
  readonly oneLiner: string;
  /** 나의 교직 리듬 */
  readonly rhythm: string;
  /** 줄글 보기 전용 성격 묘사 (DEC-069). 없으면 줄글 보기가 rhythm으로 대신합니다 */
  readonly portrait?: ResultPortrait;
  /**
   * 강점이 되는 순간 — 수업 · 생활지도 · 상담 · 업무 네 장면을 하나씩 (DEC-074)
   *
   * 실제로 그렇게 한다는 서술이므로 **단정형**으로 씁니다.
   */
  readonly shiningMoments: readonly SceneNote[];
  /**
   * 여유가 줄었을 때 — 같은 네 장면 (DEC-074)
   *
   * 늘 그런 것이 아니라 **그럴 수 있다**는 신호이므로 문장을 `~수 있습니다`로 끝냅니다.
   * 단정하면 읽는 사람이 자기 결점을 통보받는 것처럼 느낍니다.
   * `realContent.test.ts`가 이 묶음만 따로 검사합니다.
   */
  readonly underPressure: readonly SceneNote[];
  /**
   * ⚠️ 아래 네 필드는 **줄글 보기에 나오지 않습니다** (DEC-074, 2026-09-06).
   *
   * 결과는 선생님 자신과 그 교실의 아이들·수업·업무만 다루기로 했습니다.
   * 동료와 일하는 방식과 내일의 행동 계획을 담던 카드 두 장을 뺐습니다.
   * 요약 보기·자세히 보기는 아직 이 필드들을 쓰므로 **데이터는 지우지 마세요.**
   *
   * 줄글 보기에 이 내용을 다시 넣으려 한다면 DEC-074를 먼저 읽어 주세요.
   */
  readonly withColleagues: readonly SceneNote[];
  readonly collaboration: CollaborationProfile;
  /** 내일 해 볼 것 — 성향 서술이 아니라 실제로 해 볼 수 있는 행동 */
  readonly nextSteps: readonly string[];
  /** 동료와 나눌 질문 — 연수 아이스브레이킹에 쓰입니다 */
  readonly talkingPoints: readonly string[];
  /** 선생님께 어울리는 학년 (DEC-076) */
  readonly gradeFit: GradeFit;
}
