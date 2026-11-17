import { json } from '@sveltejs/kit';

export async function GET() {
	return json({
		name: 'Achei Meu Pet API',
		version: 'v1',
		baseUrl: '/api/v1',
		documentation: '/api/v1/docs',
		endpoints: {
			auth: '/api/v1/api-keys',
			companions: '/api/v1/companions',
			'companions/:id/health-events': '/api/v1/companions/:id/health-events',
			'companions/:id/weight-entries': '/api/v1/companions/:id/weight-entries',
			'companions/:id/daily-events': '/api/v1/companions/:id/daily-events',
			'companions/:id/reminders': '/api/v1/companions/:id/reminders',
			'companions/:id/journal-entries': '/api/v1/companions/:id/journal-entries',
			'companions/:id/documents': '/api/v1/companions/:id/documents'
		}
	});
}
