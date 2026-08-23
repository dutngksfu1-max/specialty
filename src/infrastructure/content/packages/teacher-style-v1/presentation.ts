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
    { resultKey: "pppp", artwork: { src: "/assessments/teacher-style/types/garm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "pppn", artwork: { src: "/assessments/teacher-style/types/garl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "ppnp", artwork: { src: "/assessments/teacher-style/types/gacm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "ppnn", artwork: { src: "/assessments/teacher-style/types/gacl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "pnpp", artwork: { src: "/assessments/teacher-style/types/gorm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "pnpn", artwork: { src: "/assessments/teacher-style/types/gorl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "pnnp", artwork: { src: "/assessments/teacher-style/types/gocm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "pnnn", artwork: { src: "/assessments/teacher-style/types/gocl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nppp", artwork: { src: "/assessments/teacher-style/types/darm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nppn", artwork: { src: "/assessments/teacher-style/types/darl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "npnp", artwork: { src: "/assessments/teacher-style/types/dacm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "npnn", artwork: { src: "/assessments/teacher-style/types/dacl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nnpp", artwork: { src: "/assessments/teacher-style/types/dorm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nnpn", artwork: { src: "/assessments/teacher-style/types/dorl.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nnnp", artwork: { src: "/assessments/teacher-style/types/docm.svg", width: 240, height: 200, alt: "" } },
    { resultKey: "nnnn", artwork: { src: "/assessments/teacher-style/types/docl.svg", width: 240, height: 200, alt: "" } },
  ],
  balancedArtwork: {
    src: "/assessments/teacher-style/types/balanced.svg",
    width: 240,
    height: 200,
    alt: "",
  },
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
