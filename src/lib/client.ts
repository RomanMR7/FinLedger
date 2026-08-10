/** Безопасная загрузка для клиентских страниц: при недоступной БД или ошибке API возвращает fallback вместо падения в белый экран. */
export async function fetchJson<T>(url: string, fallback: T): Promise<{data: T; error: string}> {
 try {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) return {data: fallback, error: (data && data.error) || "Сервер вернул ошибку"};
  return {data: data as T, error: ""};
 } catch {
  return {data: fallback, error: "Нет связи с сервером или базой данных"};
 }
}
