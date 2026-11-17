const spec = {
	openapi: '3.1.0',
	info: {
		title: 'Achei Meu Pet API',
		version: '1.0.0',
		description:
			'REST API para gerenciar todo o hist\u00f3rico do seu pet. Baseada no Achei Meu Pet.'
	},
	servers: [{ url: '/api/v1', description: 'API v1' }],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: 'http',
				scheme: 'bearer',
				description: 'API key gerada em /api/v1/api-keys. Formato: gp_<hex>'
			}
		},
		schemas: {
			Companion: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					species: { type: 'string', enum: ['dog'] },
					breed: { type: 'string', nullable: true },
					dob: { type: 'string', nullable: true },
					sex: { type: 'string', enum: ['male', 'female', 'unknown'], nullable: true },
					weightUnit: { type: 'string', enum: ['kg', 'lbs'] },
					microchip: { type: 'string', nullable: true },
					bio: { type: 'string', nullable: true },
					vetName: { type: 'string', nullable: true },
					vetClinic: { type: 'string', nullable: true },
					vetPhone: { type: 'string', nullable: true },
					isActive: { type: 'boolean' },
					createdAt: { type: 'string', format: 'date-time' }
				}
			},
			HealthEvent: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					type: {
						type: 'string',
						enum: ['vet_visit', 'vaccination', 'medication', 'procedure', 'other']
					},
					title: { type: 'string' },
					notes: { type: 'string', nullable: true },
					occurredAt: { type: 'string', format: 'date-time' },
					vetName: { type: 'string', nullable: true },
					vetClinic: { type: 'string', nullable: true }
				}
			},
			WeightEntry: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					weight: { type: 'number' },
					unit: { type: 'string', enum: ['kg', 'lbs'] },
					recordedAt: { type: 'string', format: 'date-time' },
					notes: { type: 'string', nullable: true }
				}
			},
			DailyEvent: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					type: {
						type: 'string',
						enum: ['walk', 'meal', 'bathroom', 'treat', 'play', 'grooming', 'other']
					},
					notes: { type: 'string', nullable: true },
					durationMinutes: { type: 'integer', nullable: true },
					loggedAt: { type: 'string', format: 'date-time' }
				}
			},
			Reminder: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					title: { type: 'string' },
					description: { type: 'string', nullable: true },
					type: { type: 'string', enum: ['vet', 'medication', 'vaccination', 'grooming', 'other'] },
					dueAt: { type: 'string', format: 'date-time' },
					isRecurring: { type: 'boolean' },
					completedAt: { type: 'string', format: 'date-time', nullable: true }
				}
			},
			JournalEntry: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					date: { type: 'string', format: 'date' },
					body: { type: 'string' },
					mood: { type: 'string', enum: ['great', 'good', 'meh', 'off', 'sick'], nullable: true },
					createdAt: { type: 'string', format: 'date-time' }
				}
			},
			Document: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					companionId: { type: 'string' },
					title: { type: 'string' },
					category: {
						type: 'string',
						enum: ['receipt', 'invoice', 'medical', 'insurance', 'ownership', 'other']
					},
					mimeType: { type: 'string' },
					sizeBytes: { type: 'integer', nullable: true },
					createdAt: { type: 'string', format: 'date-time' }
				}
			},
			ApiKey: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					keyPrefix: { type: 'string' },
					lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
					createdAt: { type: 'string', format: 'date-time' }
				}
			},
			Error: {
				type: 'object',
				properties: {
					error: { type: 'string' }
				}
			}
		}
	},
	security: [{ bearerAuth: [] }],
	paths: {
		'/api-keys': {
			get: {
				summary: 'Listar chaves de API',
				security: [{ bearerAuth: [] }],
				responses: {
					'200': {
						description: 'Lista de chaves',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } }
									}
								}
							}
						}
					}
				}
			},
			post: {
				summary: 'Criar chave de API',
				security: [{ bearerAuth: [] }],
				requestBody: {
					content: {
						'application/json': {
							schema: { type: 'object', properties: { name: { type: 'string' } } }
						}
					}
				},
				responses: {
					'201': { description: 'Chave criada (rawKey retornado apenas uma vez)' }
				}
			}
		},
		'/api-keys/{id}': {
			delete: {
				summary: 'Remover chave de API',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Chave removida' } }
			}
		},
		'/companions': {
			get: {
				summary: 'Listar pets',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
					{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
				],
				responses: {
					'200': {
						description: 'Lista de pets',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { type: 'array', items: { $ref: '#/components/schemas/Companion' } }
									}
								}
							}
						}
					}
				}
			},
			post: {
				summary: 'Criar pet',
				security: [{ bearerAuth: [] }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									name: { type: 'string' },
									species: { type: 'string' },
									breed: { type: 'string' },
									dob: { type: 'string' },
									sex: { type: 'string' },
									weightUnit: { type: 'string' }
								},
								required: ['name']
							}
						}
					}
				},
				responses: { '201': { description: 'Pet criado' } }
			}
		},
		'/companions/{id}': {
			get: {
				summary: 'Obter pet',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: {
					'200': { description: 'Dados do pet' },
					'404': { description: 'Pet n\u00e3o encontrado' }
				}
			},
			put: {
				summary: 'Atualizar pet',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									name: { type: 'string' },
									breed: { type: 'string' },
									dob: { type: 'string' },
									sex: { type: 'string' },
									bio: { type: 'string' },
									vetName: { type: 'string' },
									vetClinic: { type: 'string' },
									vetPhone: { type: 'string' }
								}
							}
						}
					}
				},
				responses: { '200': { description: 'Pet atualizado' } }
			},
			delete: {
				summary: 'Arquivar pet (soft delete)',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Pet arquivado' } }
			}
		},
		'/companions/{id}/health-events': {
			get: {
				summary: 'Listar eventos de sa\u00fade',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: {
					'200': {
						description: 'Eventos de sa\u00fade',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										data: { type: 'array', items: { $ref: '#/components/schemas/HealthEvent' } }
									}
								}
							}
						}
					}
				}
			},
			post: {
				summary: 'Criar evento de sa\u00fade',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									type: { type: 'string' },
									title: { type: 'string' },
									notes: { type: 'string' },
									occurredAt: { type: 'string' },
									vetName: { type: 'string' }
								},
								required: ['type', 'title']
							}
						}
					}
				},
				responses: { '201': { description: 'Evento criado' } }
			}
		},
		'/companions/{id}/health-events/{eid}': {
			get: {
				summary: 'Obter evento de sa\u00fade',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'eid', in: 'path', required: true, schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Evento' } }
			},
			put: {
				summary: 'Atualizar evento de sa\u00fade',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'eid', in: 'path', required: true, schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Evento atualizado' } }
			},
			delete: {
				summary: 'Remover evento de sa\u00fade',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'eid', in: 'path', required: true, schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Evento removido' } }
			}
		},
		'/companions/{id}/weight-entries': {
			get: {
				summary: 'Listar pesos',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Lista de pesos' } }
			},
			post: {
				summary: 'Registrar peso',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									weight: { type: 'number' },
									unit: { type: 'string' },
									recordedAt: { type: 'string' },
									notes: { type: 'string' }
								},
								required: ['weight']
							}
						}
					}
				},
				responses: { '201': { description: 'Peso registrado' } }
			}
		},
		'/companions/{id}/weight-entries/{wid}': {
			delete: {
				summary: 'Remover registro de peso',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'wid', in: 'path', required: true, schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Registro removido' } }
			}
		},
		'/companions/{id}/daily-events': {
			get: {
				summary: 'Listar atividades di\u00e1rias',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'type', in: 'query', schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Lista de atividades' } }
			},
			post: {
				summary: 'Registrar atividade',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									type: { type: 'string' },
									notes: { type: 'string' },
									durationMinutes: { type: 'integer' }
								},
								required: ['type']
							}
						}
					}
				},
				responses: { '201': { description: 'Atividade registrada' } }
			}
		},
		'/companions/{id}/reminders': {
			get: {
				summary: 'Listar lembretes',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Lista de lembretes' } }
			},
			post: {
				summary: 'Criar lembrete',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									title: { type: 'string' },
									type: { type: 'string' },
									description: { type: 'string' },
									dueAt: { type: 'string' },
									isRecurring: { type: 'boolean' }
								},
								required: ['title', 'type', 'dueAt']
							}
						}
					}
				},
				responses: { '201': { description: 'Lembrete criado' } }
			}
		},
		'/companions/{id}/reminders/{rid}': {
			patch: {
				summary: 'Completar/atualizar lembrete',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'rid', in: 'path', required: true, schema: { type: 'string' } }
				],
				requestBody: {
					content: {
						'application/json': {
							schema: { type: 'object', properties: { completed: { type: 'boolean' } } }
						}
					}
				},
				responses: { '200': { description: 'Lembrete atualizado' } }
			},
			delete: {
				summary: 'Remover lembrete',
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'rid', in: 'path', required: true, schema: { type: 'string' } }
				],
				responses: { '200': { description: 'Lembrete removido' } }
			}
		},
		'/companions/{id}/journal-entries': {
			get: {
				summary: 'Listar entradas do di\u00e1rio',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Entradas do di\u00e1rio' } }
			},
			post: {
				summary: 'Criar entrada no di\u00e1rio',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									date: { type: 'string', format: 'date' },
									body: { type: 'string' },
									mood: { type: 'string' }
								}
							}
						}
					}
				},
				responses: { '201': { description: 'Entrada criada' } }
			}
		},
		'/companions/{id}/documents': {
			get: {
				summary: 'Listar documentos',
				security: [{ bearerAuth: [] }],
				parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
				responses: { '200': { description: 'Lista de documentos' } }
			}
		}
	}
};

import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	if (url.searchParams.has('spec')) {
		return json(spec);
	}

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Achei Meu Pet API - Swagger</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
<style>
body { margin: 0; }
.swagger-ui .topbar { display: none; }
</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({
  url: '/api/v1/docs?spec=1',
  dom_id: '#swagger-ui',
  presets: [SwaggerUIBundle.presets.apis],
  layout: 'BaseLayout'
});
</script>
</body>
</html>`;

	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8' }
	});
}
