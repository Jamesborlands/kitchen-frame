// Fetch one of our /api routes. A failed route answers with an error body
// ({ error: "tides unavailable" }, status 502); throwing turns that into an SWR
// error instead of handing the error object to a component expecting a list,
// so the widget keeps its last good data (or its loading state) and never crashes.
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}
