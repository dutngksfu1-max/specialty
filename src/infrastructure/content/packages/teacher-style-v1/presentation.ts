function characterArtwork(code: string) {
  return {
    male: {
      src: `/assessments/teacher-style/types/${code}-male.jpg`,
      width: 480,
      height: 640,
      alt: "",
    },
    female: {
      src: `/assessments/teacher-style/types/${code}-female.jpg`,
      width: 480,
      height: 640,
      alt: "",
    },
  } as const;
}

export const teacherStylePresentation = {
  version: 1,
  palette: {
    canvas: "sand-50",
    surface: "sand-100",
    primary: "sage-600",
    accent: "clay-600",
    ink: "sage-900",
  },
  heroArtwork: {
    src: "/assessments/teacher-style/hero-teaching-journey.webp",
    width: 1448,
    height: 1086,
    alt: "",
  },
  descriptionEmphasisTerms: [
    "학교 현장에서 자주 마주하는 장면",
    "평소 나에게 가까운 선택",
    "네 가지 관점",
  ],
  sectionArtwork: [
    {
      sectionId: "part-1",
      artwork: { src: "/assessments/teacher-style/section-01.svg", width: 160, height: 112, alt: "" },
    },
    {
      sectionId: "part-2",
      artwork: { src: "/assessments/teacher-style/section-02.svg", width: 160, height: 112, alt: "" },
    },
    {
      sectionId: "part-3",
      artwork: { src: "/assessments/teacher-style/section-03.svg", width: 160, height: 112, alt: "" },
    },
    {
      sectionId: "part-4",
      artwork: { src: "/assessments/teacher-style/section-04.svg", width: 160, height: 112, alt: "" },
    },
  ],
  typeArtwork: [
    { resultKey: "pppp", artwork: characterArtwork("garm") },
    { resultKey: "pppn", artwork: characterArtwork("garl") },
    { resultKey: "ppnp", artwork: characterArtwork("gacm") },
    { resultKey: "ppnn", artwork: characterArtwork("gacl") },
    { resultKey: "pnpp", artwork: characterArtwork("gorm") },
    { resultKey: "pnpn", artwork: characterArtwork("gorl") },
    { resultKey: "pnnp", artwork: characterArtwork("gocm") },
    { resultKey: "pnnn", artwork: characterArtwork("gocl") },
    { resultKey: "nppp", artwork: characterArtwork("darm") },
    { resultKey: "nppn", artwork: characterArtwork("darl") },
    { resultKey: "npnp", artwork: characterArtwork("dacm") },
    { resultKey: "npnn", artwork: characterArtwork("dacl") },
    { resultKey: "nnpp", artwork: characterArtwork("dorm") },
    { resultKey: "nnpn", artwork: characterArtwork("dorl") },
    { resultKey: "nnnp", artwork: characterArtwork("docm") },
    { resultKey: "nnnn", artwork: characterArtwork("docl") },
  ],
  responseScaleGuide: [
    {
      value: 1,
      criterion: "떠오르는 장면이 없을 때",
    },
    {
      value: 2,
      criterion: "가끔 있지만 평소의 나는 아닐 때",
    },
    {
      value: 3,
      criterion: "어느 쪽이라 하기 어려울 때",
    },
    {
      value: 4,
      criterion: "비슷한 장면이 떠오를 때",
    },
    {
      value: 5,
      criterion: "여러 장면에서 분명히 나타날 때",
    },
  ],
} as const;
