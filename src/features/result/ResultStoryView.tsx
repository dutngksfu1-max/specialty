import type { ResultProfile, SceneNote } from "@/domain/assessment/result/profile";

/**
 * 줄글 보기 (DEC-069 · DEC-074)
 *
 * 요약 보기·자세히 보기와 **같은 데이터**를 읽고 배치만 다르게 합니다.
 * 두 보기의 컴포넌트는 한 줄도 건드리지 않으므로, 이 보기를 통째로 지워도
 * 기존 결과 화면은 그대로 남습니다.
 *
 * 지키는 것 다섯 가지.
 *
 * 1. **분류 이름과 강도 라벨을 쓰지 않습니다.** 처음 보는 사람에게 "몰입형"과
 *    "근소한 차이"는 자기 이야기가 아니라 외워야 할 낱말입니다.
 * 2. **순위 배지와 게이지를 쓰지 않습니다.** 읽을 순서를 알려 주는 대신 시선을 뺏습니다.
 * 3. **축을 하나씩 뜯어 설명하지 않습니다** (DEC-074). 네 방향을 따로 늘어놓으면
 *    결과를 종합하지 않고 코드 한 글자씩 해설하는 것이 됩니다. 네 방향은 아래 다섯
 *    구역에 이미 녹아 있습니다 — 구역마다 담당 축이 정해져 있기 때문입니다.
 * 4. **소제목을 명사구로 씁니다.** '자리에 따라 달라지는 것'처럼 무엇을 가리키는지
 *    알 수 없는 제목은 읽는 사람을 멈춰 세웁니다.
 * 5. **교실만 다룹니다** (DEC-074). 동료와 일하는 방식과 내일의 행동 계획은 뺐습니다.
 *    교사가 자기 결과에서 알고 싶은 것은 우리 반에서 자기가 어떤 어른인가입니다.
 */

/** 읽는 폭. 한 줄이 길어지면 다음 줄 첫 글자를 찾는 데 눈이 쓰입니다. */
const PROSE = "max-w-[40rem]";

function Card({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-h1 text-foreground sm:text-h1-lg">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/** 카드 안의 한 구역. 카드를 새로 만들지 않고 선으로만 나눕니다. */
function Block({
  title,
  children,
  first = false,
}: {
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly first?: boolean;
}) {
  return (
    <div className={`px-5 py-6 sm:px-7 sm:py-7 ${first ? "" : "border-t border-border"}`}>
      {title !== undefined && (
        <h3 className="text-h3 text-foreground sm:text-h3-lg">{title}</h3>
      )}
      <div className={title === undefined ? undefined : "mt-3"}>{children}</div>
    </div>
  );
}

/** 문단 묶음. 줄 간격과 문단 사이 여백을 본문 크기에 맞춰 벌립니다. */
function Prose({ paragraphs }: { readonly paragraphs: readonly string[] }) {
  return (
    <div className={`${PROSE} flex flex-col gap-4`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-body-lg text-foreground-body">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/**
 * 장면 묶음 — 카드 세 장이 아니라 한 구역 안의 문단 세 개
 *
 * 상황을 **문장의 첫머리로** 붙입니다. `상황 — 설명`처럼 하이픈으로 끊으면 항목 목록이
 * 되어 줄글 보기 안에서 혼자 표처럼 읽힙니다. 굵게만 남겨 구분감을 주고, 읽는 사람은
 * 한 문장으로 이어 읽습니다.
 *
 * ⚠️ `situation`은 **반드시 `~ 때`로 끝나야 합니다.** 여기서 `에는`을 붙여 문장을
 * 만들기 때문입니다. 조사를 코드에서 붙이다 `생활지도할 때에서도`처럼 깨진 적이 있어
 * `ResultStoryView.test.tsx`가 128개 전부를 검사합니다.
 */
function SceneProse({ items }: { readonly items: readonly SceneNote[] }) {
  return (
    <div className={`${PROSE} flex flex-col gap-4`}>
      {items.map((item) => (
        <p key={`${item.scene}-${item.situation}`} className="text-body-lg text-foreground-body">
          <strong className="font-semibold text-foreground">{item.situation}에는</strong>{" "}
          {item.text}
        </p>
      ))}
    </div>
  );
}

export function ResultStoryView({ profile }: { readonly profile: ResultProfile }) {
  const portrait = profile.portrait;

  /*
    성격 묘사가 없는 검사 패키지도 이 보기를 쓸 수 있어야 합니다.
    그때는 기존 필드로 대신 채우고, 없는 구역은 그리지 않습니다.
  */
  const opening = portrait?.opening ?? [profile.oneLiner, profile.rhythm];

  return (
    <div data-result-view="story" className="flex flex-col gap-6">
      <Card title="선생님은 이런 교사입니다">
        <Block first>
          <Prose paragraphs={opening} />
        </Block>

        {portrait !== undefined && (
          <>
            {/*
              읽는 순서를 사람이 궁금해하는 순서로 둡니다.
              내가 아이들에게 어떻게 보이는가 → 나는 무엇을 중요하게 여기는가 →
              그것이 교실에 어떻게 남는가 → 그래서 어떤 오해를 받는가.
              교실 신호를 먼저 보여 주면 아직 누구 이야기인지 모르는 채로 물건 목록을 읽습니다.
            */}
            <Block title="아이들이 느끼는 선생님">
              <Prose paragraphs={portrait.fromKids} />
            </Block>
            <Block title="무엇을 중요하게 여기는가">
              <Prose paragraphs={portrait.drive} />
            </Block>
            {/*
              문항이 묻지 않은 자리입니다. 게시판·서랍·알림장처럼 체크한 적 없는 곳에서
              네 방향의 조합이 실제로 만들어 내는 것을 보여 줍니다.
            */}
            <Block title="선생님 교실은 이렇습니다">
              <Prose paragraphs={portrait.classroomSigns} />
            </Block>
            <Block title="자주 듣는 오해">
              <Prose paragraphs={portrait.misread} />
            </Block>
          </>
        )}
      </Card>

      <Card title="교실에서 드러나는 모습">
        {/*
          네 방향을 하나씩 뜯어 설명하던 카드를 없애고 그 내용을 여기로 녹였습니다 (DEC-074).
          축 이름은 나오지 않고, 읽는 사람은 수업과 아이라는 두 장면만 봅니다.
            수업을 만들 때  — 아이와 수업을 이해하는 방식 + 업무와 수업을 진행하는 방식
            아이를 대할 때  — 결정을 내리는 방식 + 생각을 정리하는 방식
        */}
        {portrait !== undefined && (
          <>
            <Block first title="수업을 만들 때">
              <Prose paragraphs={portrait.inLessons} />
            </Block>
            <Block title="아이를 대할 때">
              <Prose paragraphs={portrait.withStudents} />
            </Block>
          </>
        )}
        <Block first={portrait === undefined} title="강점이 되는 순간">
          <SceneProse items={profile.shiningMoments} />
        </Block>
        <Block title="여유가 줄었을 때">
          {/*
            성격 묘사의 '여유가 없을 때'와 장면 목록을 한 구역에 둡니다.
            같은 이야기를 카드 두 곳에 나눠 실으면 읽는 사람이 두 번 읽고도 덜 남습니다.
          */}
          <div className="flex flex-col gap-4">
            {portrait !== undefined && <Prose paragraphs={portrait.whenTired} />}
            <SceneProse items={profile.underPressure} />
          </div>
        </Block>
      </Card>
    </div>
  );
}
