export function generateQuestion(level) {
  const ops = level === 3 ? ['+', '-', '*', '/'] : ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a, b, answer;

  if (level === 1) {
    a = rand(10, 99);
    b = rand(10, 99);
  } else if (level === 2) {
    a = rand(100, 999);
    b = rand(100, 999);
  } else {
    a = rand(100, 999);
    b = rand(100, 999);
  }

  switch (op) {
    case '+':
      answer = a + b;
      break;
    case '-':
      if (a < b) [a, b] = [b, a];
      answer = a - b;
      break;
    case '*':
      a = rand(10, 99);
      b = rand(2, 9);
      answer = a * b;
      break;
    case '/':
      b = rand(2, 9);
      answer = rand(10, 99);
      a = answer * b;
      break;
    default:
      answer = a + b;
  }

  return { question: `${a} ${op} ${b}`, answer, op };
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calcDamage(combo) {
  if (combo >= 5) return 30;
  if (combo >= 3) return 20;
  return 10;
}
