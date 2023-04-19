import type { PageLoad } from './$types';

export const load = (async ({ fetch, params }) => {
    const response = await fetch("http://localhost:8000/api/sleep/last?apiKey=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return response.json();
}) satisfies PageLoad;
