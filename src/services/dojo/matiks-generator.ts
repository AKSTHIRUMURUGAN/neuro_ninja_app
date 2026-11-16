export interface MatiksProblem {
  id: string;
  display: string;
  type: 'standard' | 'missing_number' | 'missing_operator' | 'double_step';
  answer: string | number;
  options: (string | number)[];
}

export function generateMatiksProblem(level: number = 1): MatiksProblem {
  const problemTypeRoll = Math.random();

  // 1. Missing Operator Problem (e.g. 18 [?] 3 = 6)
  if (problemTypeRoll < 0.25) {
    const operators = ['+', '-', '×', '÷'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a = 0;
    let b = 0;
    let res = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * 30) + 10;
      b = Math.floor(Math.random() * 30) + 10;
      res = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 40) + 20;
      b = Math.floor(Math.random() * 20) + 5;
      res = a - b;
    } else if (op === '×') {
      a = Math.floor(Math.random() * 9) + 3;
      b = Math.floor(Math.random() * 8) + 3;
      res = a * b;
    } else {
      b = Math.floor(Math.random() * 8) + 2;
      res = Math.floor(Math.random() * 9) + 2;
      a = b * res;
    }

    return {
      id: Math.random().toString(36).substring(7),
      display: `${a}  [ ? ]  ${b} = ${res}`,
      type: 'missing_operator',
      answer: op,
      options: ['+', '-', '×', '÷'],
    };
  }

  // 2. Missing Number Problem (e.g. [ ? ] + 19 = 52)
  if (problemTypeRoll < 0.5) {
    const isMult = Math.random() < 0.4 && level > 2;
    if (isMult) {
      const a = Math.floor(Math.random() * 8) + 3;
      const b = Math.floor(Math.random() * 8) + 3;
      const res = a * b;
      const options = generateDistractors(a);
      return {
        id: Math.random().toString(36).substring(7),
        display: `[ ? ] × ${b} = ${res}`,
        type: 'missing_number',
        answer: a,
        options,
      };
    } else {
      const a = Math.floor(Math.random() * 40) + 15;
      const b = Math.floor(Math.random() * 40) + 15;
      const res = a + b;
      const options = generateDistractors(a);
      return {
        id: Math.random().toString(36).substring(7),
        display: `[ ? ] + ${b} = ${res}`,
        type: 'missing_number',
        answer: a,
        options,
      };
    }
  }

  // 3. Double Step Problem (e.g. (6 × 7) - 12 = ?)
  if (problemTypeRoll < 0.75 && level > 1) {
    const a = Math.floor(Math.random() * 8) + 3;
    const b = Math.floor(Math.random() * 7) + 3;
    const c = Math.floor(Math.random() * 20) + 5;
    const isSub = Math.random() > 0.5;
    const answer = isSub ? a * b - c : a * b + c;
    const options = generateDistractors(answer);

    return {
      id: Math.random().toString(36).substring(7),
      display: `(${a} × ${b}) ${isSub ? '-' : '+'} ${c} = ?`,
      type: 'double_step',
      answer,
      options,
    };
  }

  // 4. Fast Mental Arithmetic (Multiplication or Addition)
  const isMult = Math.random() > 0.4;
  let a = 0;
  let b = 0;
  let answer = 0;
  let display = '';

  if (isMult) {
    a = Math.floor(Math.random() * 12) + 4;
    b = Math.floor(Math.random() * 9) + 3;
    answer = a * b;
    display = `${a} × ${b} = ?`;
  } else {
    a = Math.floor(Math.random() * 55) + 20;
    b = Math.floor(Math.random() * 55) + 20;
    answer = a + b;
    display = `${a} + ${b} = ?`;
  }

  const options = generateDistractors(answer);
  return {
    id: Math.random().toString(36).substring(7),
    display,
    type: 'standard',
    answer,
    options,
  };
}

function generateDistractors(correct: number): number[] {
  const distractors = new Set<number>([correct]);
  const offsets = [-10, 10, -2, 2, -1, 1, -5, 5, -20, 20];

  for (const off of offsets) {
    if (distractors.size >= 4) break;
    const val = correct + off;
    if (val > 0) distractors.add(val);
  }

  while (distractors.size < 4) {
    distractors.add(Math.max(1, correct + Math.floor(Math.random() * 20) - 10));
  }

  return Array.from(distractors).sort(() => Math.random() - 0.5);
}
