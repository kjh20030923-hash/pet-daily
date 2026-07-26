const zhDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const zhDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatZhDate = (iso: string) => zhDateFormatter.format(new Date(iso));

export const formatZhDateTime = (iso: string) =>
  zhDateTimeFormatter.format(new Date(iso));

