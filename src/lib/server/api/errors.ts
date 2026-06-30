import { error } from '@sveltejs/kit';

export function notFound(entity = 'Resource') {
	throw error(404, { message: `${entity} not found` });
}

export function badRequest(message: string) {
	throw error(400, { message });
}

export function forbidden(message = 'Forbidden') {
	throw error(403, { message });
}
