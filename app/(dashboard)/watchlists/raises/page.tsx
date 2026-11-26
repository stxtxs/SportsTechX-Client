import { redirect } from 'next/navigation';

/** Saved raises used to be a list of their own; raises now live in the watchlists themselves (6.8). */
export default function SavedRaisesPage() {
	redirect('/watchlists');
}
