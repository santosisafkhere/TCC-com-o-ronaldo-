import { describe, it, expect, beforeAll } from 'vitest';
import { db, schema } from '$lib/server/db';
import {
	assertCanEditCompanion,
	assertCanViewCompanion,
	assertCanManageCompanion
} from './permissions';

type Locals = Parameters<typeof assertCanEditCompanion>[0];

function locals(user: { id: string; role: 'admin' | 'member' | 'caretaker' } | null): Locals {
	return { user, session: null, locale: 'en' } as unknown as Locals;
}

async function statusOf(p: Promise<unknown>): Promise<number | 'ok'> {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return (e as { status: number }).status;
	}
}

describe('companion permissions (ownership model)', () => {
	beforeAll(async () => {
		await db.insert(schema.users).values([
			{ id: 'adm', username: 'adm', displayName: 'A', role: 'admin' },
			{ id: 'owner', username: 'owner', displayName: 'O', role: 'member' },
			{ id: 'other', username: 'other', displayName: 'X', role: 'member' },
			{ id: 'ct-in', username: 'ctin', displayName: 'C1', role: 'caretaker' },
			{ id: 'ct-out', username: 'ctout', displayName: 'C2', role: 'caretaker' },
			{ id: 'clinic-w', username: 'clinicw', displayName: 'Clinic W', role: 'member' },
			{ id: 'clinic-r', username: 'clinicr', displayName: 'Clinic R', role: 'member' },
			{ id: 'clinic-x', username: 'clinicx', displayName: 'Clinic X', role: 'member' }
		] as (typeof schema.users.$inferInsert)[]);
		await db.insert(schema.companions).values({
			id: 'comp1',
			name: 'Comp',
			ownerId: 'owner'
		} as typeof schema.companions.$inferInsert);
		await db.insert(schema.companionCaretakers).values({
			companionId: 'comp1',
			userId: 'ct-in'
		} as typeof schema.companionCaretakers.$inferInsert);
		await db.insert(schema.companionShares).values([
			{ id: 'sh-w', companionId: 'comp1', granteeUserId: 'clinic-w', scope: 'write' },
			{ id: 'sh-r', companionId: 'comp1', granteeUserId: 'clinic-r', scope: 'read' },
			{
				id: 'sh-x',
				companionId: 'comp1',
				granteeUserId: 'clinic-x',
				scope: 'write',
				expiresAt: new Date(Date.now() - 1000)
			}
		] as (typeof schema.companionShares.$inferInsert)[]);
	});

	describe('assertCanEditCompanion', () => {
		it('401 for anonymous', async () => {
			expect(await statusOf(assertCanEditCompanion(locals(null), 'comp1'))).toBe(401);
		});

		it('allows the owner and admins', async () => {
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'adm', role: 'admin' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'owner', role: 'member' }), 'comp1'))
			).toBe('ok');
		});

		it('403 for a member who is not the owner', async () => {
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'other', role: 'member' }), 'comp1'))
			).toBe(403);
		});

		it('allows assigned caretakers, 403 for unassigned', async () => {
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'ct-in', role: 'caretaker' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'ct-out', role: 'caretaker' }), 'comp1'))
			).toBe(403);
		});
	});

	describe('assertCanViewCompanion', () => {
		it('401 for anonymous, 404 for missing', async () => {
			expect(await statusOf(assertCanViewCompanion(locals(null), 'comp1'))).toBe(401);
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'adm', role: 'admin' }), 'nope'))
			).toBe(404);
		});

		it('owner, admin and assigned caretaker may view', async () => {
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'owner', role: 'member' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'adm', role: 'admin' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'ct-in', role: 'caretaker' }), 'comp1'))
			).toBe('ok');
		});

		it('404 (not 403) for a non-owner member — existence is not leaked', async () => {
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'other', role: 'member' }), 'comp1'))
			).toBe(404);
		});

		it('a shared user (read or write) may view', async () => {
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'clinic-r', role: 'member' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'clinic-w', role: 'member' }), 'comp1'))
			).toBe('ok');
		});

		it('an expired share grants nothing', async () => {
			expect(
				await statusOf(assertCanViewCompanion(locals({ id: 'clinic-x', role: 'member' }), 'comp1'))
			).toBe(404);
		});
	});

	describe('share scopes', () => {
		it("a 'write' share may edit; a 'read' share may not", async () => {
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'clinic-w', role: 'member' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'clinic-r', role: 'member' }), 'comp1'))
			).toBe(403);
		});

		it('an expired write share may not edit', async () => {
			expect(
				await statusOf(assertCanEditCompanion(locals({ id: 'clinic-x', role: 'member' }), 'comp1'))
			).toBe(403);
		});

		it('only the owner/admin may manage (not a write share)', async () => {
			expect(
				await statusOf(assertCanManageCompanion(locals({ id: 'owner', role: 'member' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanManageCompanion(locals({ id: 'adm', role: 'admin' }), 'comp1'))
			).toBe('ok');
			expect(
				await statusOf(assertCanManageCompanion(locals({ id: 'clinic-w', role: 'member' }), 'comp1'))
			).toBe(403);
		});
	});
});
