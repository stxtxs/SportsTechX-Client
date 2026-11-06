/**
 * Force-drop the Supabase session cookies (`sb-*`). signOut() can silently
 * no-op or be slow when the SDK can't reach Supabase Auth, and a leftover live
 * cookie makes the edge middleware bounce /login straight back into the app.
 * Several path/domain combos, so the cookie drops however it was set.
 */
export function clearAuthCookies(): void {
	if (typeof document === 'undefined') return;
	const hostname = window.location.hostname;
	for (const raw of document.cookie.split(';')) {
		const name = raw.split('=')[0]?.trim();
		if (!name?.startsWith('sb-')) continue;
		document.cookie = `${name}=; Max-Age=0; path=/;`;
		document.cookie = `${name}=; Max-Age=0; path=/; domain=${hostname};`;
		document.cookie = `${name}=; Max-Age=0; path=/; domain=.${hostname};`;
	}
}
