/** 1 проект / 2 проекта / 5 проектов */
export function ruProjectsCount(count: number): string {
  const abs100 = count % 100;
  const abs10 = count % 10;
  if (abs100 >= 11 && abs100 <= 14) return `${count} проектов`;
  if (abs10 === 1) return `${count} проект`;
  if (abs10 >= 2 && abs10 <= 4) return `${count} проекта`;
  return `${count} проектов`;
}
