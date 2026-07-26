const DAY_MS = 24 * 60 * 60 * 1000;

export const calculatePetAge = (birthday: string | Date): string => {
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '生日未知';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  if (birthDay > today) return '0天';

  let totalMonths = (today.getFullYear() - birthDay.getFullYear()) * 12
    + today.getMonth()
    - birthDay.getMonth();
  if (today.getDate() < birthDay.getDate()) totalMonths -= 1;

  if (totalMonths >= 12) {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return months === 0 ? `${years}岁` : `${years}岁${months}个月`;
  }
  if (totalMonths >= 1) return `${totalMonths}个月`;

  const days = Math.max(0, Math.floor((today.getTime() - birthDay.getTime()) / DAY_MS));
  return `${days}天`;
};
