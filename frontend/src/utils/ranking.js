export const rankStudents = (students, getFinalGrade) => {
  const ranked = [...students]
    .map((student) => ({
      ...student,
      finalGrade: getFinalGrade(student),
    }))
    .sort((a, b) => {
      if (a.finalGrade === null) return 1;
      if (b.finalGrade === null) return -1;

      if (b.finalGrade !== a.finalGrade) {
        return b.finalGrade - a.finalGrade;
      }

      return a.id - b.id;
    });

  let currentRank = 1;
  const positionMap = {};

  for (let i = 0; i < ranked.length; i++) {
    const current = ranked[i];
    const previous = ranked[i - 1];

    if (i > 0 && current.finalGrade !== previous.finalGrade) {
      currentRank = i + 1;
    }

    positionMap[current.id] =
      current.finalGrade === null ? "-" : currentRank;
  }

  return { ranked, positionMap };
};