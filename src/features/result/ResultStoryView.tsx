import type { AssessmentAxis, AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResolvedAxisNarrative } from "@/domain/assessment/result/narrative";
import type { ResultProfile, SceneNote } from "@/domain/assessment/result/profile";
import type { AssessmentSignals, AxisContextSplit } from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AXIS_DISPLAY_LEVEL_MAX, axisDisplayLevel } from "@/features/result/AxisBar";

/**
 * 줄글 보기 (DEC-069)
 *
 * 요약 보기·자세히 보기와 **같은 데이터**를 읽고 배치만 다르게 합니다.
 * 두 보기의 컴포넌트는 한 줄도 건드리지 않으므로, 이 보기를 통째로 지워도
 * 기존 결과 화면은 그대로 남습니다.
 *
 * 다르게 하는 것은 다섯 가지입니다.
 *
 * 1. **축 이름을 제목으로 세웁니다.** 예전에는 축 이름이 13px 회색으로 가장 작고
 *    방향 문장이 가장 컸습니다. 그래서 "이 카드가 무엇에 대한 이야기인지"가 사라졌습니다.
 * 2. **분류 이름과 강도 라벨을 뺍니다.** 처음 보는 사람에게 "몰입형"과 "근소한 차이"는
 *    자기 이야기가 아니라 외워야 할 낱말입니다. 기울기는 눈금이 말합니다 (DEC-068은
 *    "차이의 크기는 게이지가 담당한다"이지, 라벨을 반드시 적으라는 뜻이 아닙니다).
 * 3. **순위 배지를 뺍니다.** '가장 도드라짐'은 읽을 순서를 알려 주는 대신 시선을 뺏습니다.
 * 4. **카드를 합칩니다.** 같은 성격의 정보를 카드 여러 장으로 쪼개면 훑어보게 되고,
 *    훑어보면 남는 것이 없습니다. 한 장 안에서 구분선으로 나눕니다.
 * 5. **소제목을 명사구로 씁니다.** '두 가지가 겹칠 때'처럼 무엇을 가리키는지 알 수 없는
 *    제목은 읽는 사람을 멈춰 세웁니다. 제목만 읽어도 안에 무엇이 있는지 알려야 합니다.
 * 6. **교실을 먼저 놓습니다.** 교사가 자기 결과에서 가장 먼저 확인하고 싶은 것은
 *    "우리 반에서 나는 어떤 어른인가"입니다. 동료·업무는 그다음입니다.
 */

/** 읽는 폭. 한 줄이 길어지면 다음 줄 첫 글자를 찾는 데 눈이 쓰입니다. */
const PROSE = "max-w-[40rem]";

function Card({
  title,
  lead,
  children,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-h1 text-foreground sm:text-h1-lg">{title}</h2>
        {lead !== undefined && (
          <p className={`mt-2 ${PROSE} text-body text-foreground-muted`}>{lead}</p>
        )}
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
 * 기울기 눈금 — 글자를 최대한 덜어낸 게이지
 *
 * 배지도 숫자도 강도 이름도 없습니다. 양 끝에는 분류 이름 대신 **하는 일**을 적고
 * (`plainLabel`), 고른 쪽만 진하게 둡니다. 보조기기에는 같은 내용을 문장으로 알립니다.
 */
function AxisMeter({
  axis,
  score,
}: {
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
}) {
  const level = axisDisplayLevel(score);
  const steps = Math.abs(level);
  const toPositive = level > 0;
  const chosen = toPositive ? axis.positive : axis.negative;
  const other = toPositive ? axis.negative : axis.positive;
  const chosenLabel = chosen.plainLabel ?? chosen.shortLabel;
  const otherLabel = other.plainLabel ?? other.shortLabel;

  /* 중앙에서 고른 쪽으로 몇 칸인지. 반대쪽 칸은 항상 비어 있습니다. */
  const cells = Array.from({ length: AXIS_DISPLAY_LEVEL_MAX * 2 }, (_, index) => {
    const fromCenter =
      index < AXIS_DISPLAY_LEVEL_MAX
        ? AXIS_DISPLAY_LEVEL_MAX - index
        : index - AXIS_DISPLAY_LEVEL_MAX + 1;
    const onChosenSide = index < AXIS_DISPLAY_LEVEL_MAX ? !toPositive : toPositive;
    return { key: index, filled: onChosenSide && fromCenter <= steps };
  });

  return (
    <div className={`${PROSE} mt-5`}>
      <div
        className="flex h-2 items-stretch gap-0.5"
        role="img"
        aria-label={`${axis.name}은 ${otherLabel}보다 ${chosenLabel} 쪽이고, ${AXIS_DISPLAY_LEVEL_MAX}칸 가운데 ${steps}칸만큼 기울어 있습니다.`}
      >
        {cells.map((cell) => (
          <span
            key={cell.key}
            aria-hidden="true"
            className={`flex-1 rounded-xs ${cell.filled ? "bg-chart-positive" : "bg-border"}`}
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex items-baseline justify-between gap-4">
        <span
          className={`text-caption ${
            toPositive ? "text-foreground-subtle" : "font-semibold text-foreground"
          }`}
        >
          {axis.negative.plainLabel ?? axis.negative.shortLabel}
        </span>
        <span
          className={`text-right text-caption ${
            toPositive ? "font-semibold text-foreground" : "text-foreground-subtle"
          }`}
        >
          {axis.positive.plainLabel ?? axis.positive.shortLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * 장면 묶음 — 카드 세 장이 아니라 한 구역 안의 문단 세 개
 *
 * 상황 제목을 문단 앞에 붙여 이어 읽게 합니다. 제목만 훑어도 무슨 이야기인지 알 수 있고,
 * 그대로 이어 읽으면 줄글이 됩니다.
 */
function SceneProse({ items }: { readonly items: readonly SceneNote[] }) {
  return (
    <div className={`${PROSE} flex flex-col gap-4`}>
      {items.map((item) => (
        <p key={`${item.scene}-${item.situation}`} className="text-body-lg text-foreground-body">
          <strong className="font-semibold text-foreground">{item.situation}</strong>
          {" — "}
          {item.text}
        </p>
      ))}
    </div>
  );
}

/**
 * 자리에 따라 달라지는 것 (DEC-071)
 *
 * 이 대비는 **문항을 하나하나 봐서는 알 수 없습니다.** 한 축의 열두 문항을 장면별로
 * 갈라 평균을 내야 나오므로, 답한 사람에게는 "체크한 적 없는데 맞네"가 됩니다.
 * 격차가 기준에 못 미치면 엔진이 아예 넘기므로, 여기 나온 대비는 실제로 갈린 것입니다.
 */
function ContextContrast({
  axis,
  split,
  note,
  labels,
}: {
  readonly axis: AssessmentAxis;
  readonly split: AxisContextSplit;
  readonly note?: string;
  readonly labels?: Readonly<Record<string, string>>;
}) {
  const name = (context: string) => labels?.[context] ?? context;
  const plain = (pole: AssessmentAxis["positive"]) => pole.plainLabel ?? pole.shortLabel;

  /* 장면 평균은 이미 positive 방향으로 정렬되어 옵니다. */
  const highPole = split.high.mean >= 0 ? axis.positive : axis.negative;
  const lowPole = split.low.mean >= 0 ? axis.positive : axis.negative;
  const sameSide = split.high.mean >= 0 === split.low.mean >= 0;

  return (
    <div className={PROSE}>
      <p className="text-h3 text-foreground sm:text-h3-lg">{axis.name}</p>
      <p className="mt-2 text-body-lg font-semibold text-foreground-body">
        {sameSide
          ? `${name(split.high.context)}에서도 ${name(split.low.context)}에서도 ${plain(highPole)} 쪽이지만, ${name(split.high.context)}에서 훨씬 뚜렷합니다.`
          : `${name(split.high.context)}에서는 ${plain(highPole)}, ${name(split.low.context)}에서는 ${plain(lowPole)} 쪽으로 갈렸습니다.`}
      </p>
      {note !== undefined && (
        <p className="mt-2 text-body-lg text-foreground-body">{note}</p>
      )}
    </div>
  );
}

export function ResultStoryView({
  definition,
  snapshot,
  profile,
  narrative,
  signals,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly narrative: readonly ResolvedAxisNarrative[];
  /** 응답이 지워졌으면 없을 수 있습니다. 없으면 장면 대비 구역만 빠집니다. */
  readonly signals?: AssessmentSignals;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const narrativeById = new Map(narrative.map((item) => [String(item.axisId), item]));
  const portrait = profile.portrait;

  /*
    성격 묘사가 없는 검사 패키지도 이 보기를 쓸 수 있어야 합니다.
    그때는 기존 필드로 대신 채우고, 없는 구역은 그리지 않습니다.
  */
  const opening = portrait?.opening ?? [profile.oneLiner, profile.rhythm];

  const contextLabels = definition.resultNarrative?.contextLabels;
  const noteByAxis = new Map(
    (definition.resultNarrative?.axes ?? []).map((axis) => [
      String(axis.axisId),
      axis.contextSplitNote,
    ]),
  );
  const contrasts = (signals?.contextSplits ?? []).flatMap((split) => {
    const axis = axisById.get(String(split.axisId));
    return axis === undefined ? [] : [{ split, axis }];
  });

  return (
    <div data-result-view="story" className="flex flex-col gap-6">
      <Card title="선생님은 이런 교사입니다">
        <Block first>
          <Prose paragraphs={opening} />
        </Block>

        {portrait !== undefined && (
          <>
            {/*
              문항이 묻지 않은 자리입니다. 게시판·서랍·알림장처럼 체크한 적 없는 곳에서
              네 방향의 조합이 실제로 만들어 내는 것을 보여 줍니다.
            */}
            <Block title="교실에 들어가면 보이는 것">
              <Prose paragraphs={portrait.classroomSigns} />
            </Block>
            <Block title="아이들이 느끼는 선생님">
              <Prose paragraphs={portrait.fromKids} />
            </Block>
            <Block title="무엇을 중요하게 여기는가">
              <Prose paragraphs={portrait.drive} />
            </Block>
            <Block title="자주 듣는 오해">
              <Prose paragraphs={portrait.misread} />
            </Block>
          </>
        )}

        {/*
          갈린 장면이 없으면 이 구역은 아예 나오지 않습니다.
          "차이가 없었습니다" 같은 빈 말을 채워 넣지 않습니다 (DEC-038).
        */}
        {contrasts.length > 0 && (
          <Block title="자리에 따라 달라지는 것">
            <div className="flex flex-col gap-6">
              {contrasts.map(({ split, axis }) => (
                <ContextContrast
                  key={String(split.axisId)}
                  axis={axis}
                  split={split}
                  note={noteByAxis.get(String(split.axisId))}
                  labels={contextLabels}
                />
              ))}
            </div>
          </Block>
        )}
      </Card>

      <Card title="교실에서 드러나는 모습">
        <Block first title="강점이 되는 순간">
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

      <Card
        title="네 가지 방식을 하나씩"
        lead="이 네 가지를 따로 재고, 그 결과를 합쳐 위의 이야기를 썼습니다."
      >
        {snapshot.score.axisScores.map((score, index) => {
          const axis = axisById.get(String(score.axisId));
          const item = narrativeById.get(String(score.axisId));
          if (axis === undefined) return null;

          const story = item?.reading.story;
          const lead = story?.lead ?? item?.reading.headline;
          const body =
            story?.body ?? (item === undefined ? [] : [item.reading.summary, item.reading.scene]);

          return (
            <div
              key={String(score.axisId)}
              className={`px-5 py-6 sm:px-7 sm:py-7 ${index === 0 ? "" : "border-t border-border"}`}
            >
              {/* 축 이름이 이 구역의 제목입니다. 여기가 무엇에 관한 이야기인지가 먼저 보여야 합니다. */}
              <h3 className="text-h2 text-foreground sm:text-h2-lg">{axis.name}</h3>
              {lead !== undefined && (
                <p className={`mt-2 ${PROSE} text-body-lg font-semibold text-foreground-body`}>
                  {lead}
                </p>
              )}
              <div className="mt-4">
                <Prose paragraphs={body} />
              </div>
              <AxisMeter axis={axis} score={score} />
            </div>
          );
        })}
      </Card>

      <Card
        title="동료와 함께 일할 때"
        lead="누가 더 잘 맞는지 가리는 내용이 아닙니다. 방식이 다를 때 무엇이 편하고 무엇을 먼저 말해 두면 좋은지를 적었습니다."
      >
        <Block first title="동료 앞에서의 모습">
          <SceneProse items={profile.withColleagues} />
        </Block>
        <Block title="따로 맞추지 않아도 되는 부분">
          <Prose paragraphs={profile.collaboration.naturalFit} />
        </Block>
        <Block title="미리 말해 두면 좋은 부분">
          <Prose paragraphs={profile.collaboration.needsTuning} />
        </Block>
      </Card>

      <Card title="내일 해 볼 것과 나눌 질문">
        <Block first title="내일 해 볼 것">
          <Prose paragraphs={profile.nextSteps} />
        </Block>
        <Block title="동료와 나눌 질문">
          <Prose paragraphs={profile.talkingPoints} />
        </Block>
      </Card>
    </div>
  );
}
